import { Router } from "express";
import {
  getCollectionAsync,
  saveCollectionAsync,
  getAllCollectionsAsync,
  saveAllCollectionsAsync,
  getDataVersion,
  isDbConnected
} from "../db.js";
import {
  registerSseClient,
  broadcastDataUpdate,
  recordHeartbeat,
  getActivePresence,
  removeSession
} from "../services/realtimeSync.js";

const router = Router();

// 0. Server-Sent Events (SSE) Live Data & Presence Stream
router.get("/events", (req, res) => {
  const clientId = req.query.clientId || "client_" + Math.random().toString(36).substring(2, 9);
  registerSseClient(clientId, req, res);
});

// 0.1 Heartbeat / Active Logins Presence Tracker
router.post("/presence/heartbeat", (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
  recordHeartbeat(req.body, clientIp);
  res.json({
    success: true,
    presence: getActivePresence()
  });
});

router.get("/presence", (_req, res) => {
  res.json({
    success: true,
    presence: getActivePresence()
  });
});

// 1. Get current data version (for ultra-lightweight change detection / polling)
router.get("/version", (req, res) => {
  res.json({
    success: true,
    version: getDataVersion(),
    isDbConnected: isDbConnected(),
    timestamp: new Date().toISOString()
  });
});

// 2. Get full data bundle across all collections
router.get("/all/bundle", async (req, res) => {
  try {
    const bundle = await getAllCollectionsAsync();
    res.json({
      success: true,
      data: bundle,
      version: getDataVersion(),
      isDbConnected: isDbConnected()
    });
  } catch (err) {
    console.error("GET /api/data/all/bundle error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Save / sync full bundle
router.post("/all/sync", async (req, res) => {
  try {
    const bundle = req.body || {};
    const result = await saveAllCollectionsAsync(bundle, { merge: false });

    // Instantly broadcast every updated collection to all connected SSE clients (Phone, PC)
    for (const [col, colData] of Object.entries(bundle)) {
      if (colData !== undefined && colData !== null) {
        broadcastDataUpdate(col, result.version, colData);
      }
    }

    res.json({
      success: true,
      message: "All collections synchronized successfully",
      version: result.version
    });
  } catch (err) {
    console.error("POST /api/data/all/sync error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

import os from "os";

// 3.1 Network IP addresses discovery for Mobile & Multi-PC connection
router.get("/network-info", (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          addresses.push({
            name,
            ip: iface.address,
            netmask: iface.netmask
          });
        }
      }
    }

    const primaryIp = addresses.find((a) => a.ip.startsWith("192.168."))?.ip || addresses[0]?.ip || "localhost";

    res.json({
      success: true,
      hostname: os.hostname(),
      primaryIp,
      addresses,
      mobileUrl: `http://${primaryIp}:5173/`,
      serverUrl: `http://${primaryIp}:5000/api`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.2 Export full lifetime backup as JSON file
router.get("/backup/export", async (req, res) => {
  try {
    const bundle = await getAllCollectionsAsync();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `taz_diagnostic_lifetime_backup_${dateStr}.json`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(bundle, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.3 Import / restore full backup
router.post("/backup/import", async (req, res) => {
  try {
    const bundle = req.body;
    if (!bundle || typeof bundle !== "object") {
      return res.status(400).json({ success: false, error: "Invalid backup bundle format" });
    }
    const result = await saveAllCollectionsAsync(bundle);
    const collections = bundle.data || bundle;
    for (const [col, colData] of Object.entries(collections)) {
      if (colData !== undefined && colData !== null) {
        broadcastDataUpdate(col, result.version, colData);
      }
    }
    res.json({
      success: true,
      message: "Lifetime database restored successfully!",
      version: result.version
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Get specific collection (e.g., doctors, tests, patients, reports, bills, users, settings)
router.get("/:collection", async (req, res) => {
  try {
    const { collection } = req.params;
    const data = await getCollectionAsync(collection, []);
    res.json({
      success: true,
      collection,
      data,
      version: getDataVersion()
    });
  } catch (err) {
    console.error(`GET /api/data/${req.params.collection} error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Update specific collection
router.post("/:collection", async (req, res) => {
  try {
    const { collection } = req.params;
    const data = req.body;
    const result = await saveCollectionAsync(collection, data, { merge: false });

    // Instantly push update to all connected SSE clients (Phone, PC)
    broadcastDataUpdate(collection, result.version, data);

    res.json({
      success: true,
      collection,
      message: `${collection} saved successfully`,
      version: result.version
    });
  } catch (err) {
    console.error(`POST /api/data/${req.params.collection} error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Upsert single item in a collection
router.post("/:collection/item", async (req, res) => {
  try {
    const { collection } = req.params;
    const newItem = req.body;
    if (!newItem || typeof newItem !== "object") {
      return res.status(400).json({ success: false, error: "Invalid item payload" });
    }

    const currentItems = await getCollectionAsync(collection, []);
    let updatedItems;

    if (Array.isArray(currentItems)) {
      const id = newItem.id || newItem.code;
      const index = currentItems.findIndex((x) => x.id === id || (x.code && x.code === id));
      if (index >= 0) {
        updatedItems = [...currentItems];
        updatedItems[index] = { ...updatedItems[index], ...newItem, updatedAt: new Date().toISOString() };
      } else {
        updatedItems = [{ ...newItem, createdAt: new Date().toISOString() }, ...currentItems];
      }
    } else {
      updatedItems = newItem;
    }

    const result = await saveCollectionAsync(collection, updatedItems);

    // Instantly push update to all connected SSE clients (Phone, PC)
    broadcastDataUpdate(collection, result.version, updatedItems);

    res.json({
      success: true,
      collection,
      data: updatedItems,
      version: result.version
    });
  } catch (err) {
    console.error(`POST /api/data/${req.params.collection}/item error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Delete single item from collection
router.delete("/:collection/:id", async (req, res) => {
  try {
    const { collection, id } = req.params;
    const currentItems = await getCollectionAsync(collection, []);

    if (Array.isArray(currentItems)) {
      const updatedItems = currentItems.filter((x) => String(x.id) !== String(id) && String(x.code) !== String(id));
      const result = await saveCollectionAsync(collection, updatedItems, { merge: false });

      // Instantly push update to all connected SSE clients (Phone, PC)
      broadcastDataUpdate(collection, result.version, updatedItems);

      return res.json({
        success: true,
        collection,
        message: `Item ${id} deleted from ${collection}`,
        version: result.version
      });
    }

    res.status(400).json({ success: false, error: "Collection is not an array" });
  } catch (err) {
    console.error(`DELETE /api/data/${req.params.collection}/${req.params.id} error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
