/**
 * TAZ COMPANY / TAZ DIAGNOSTIC — Multi-PC Central Database Sync Service
 * Handles live synchronization between all clinic/lab computers and the central server.
 */

const STORAGE_KEY_MAP = {
  patients: "taz_company_patients",
  doctors: "taz_company_doctors",
  tests: "taz_company_tests",
  reports: "taz_company_reports",
  bills: "taz_company_bills",
  messages: "taz_company_messages",
  branches: "taz_company_branches",
  users: "taz_company_users",
  settings: "taz_company_settings",
};

const REVERSE_STORAGE_MAP = Object.entries(STORAGE_KEY_MAP).reduce((acc, [col, key]) => {
  acc[key] = col;
  return acc;
}, {});

const DELETED_IDS_STORAGE_KEY = "taz_deleted_ids";

export function getDeletedIdsMap() {
  try {
    const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markItemDeleted(collection, id) {
  if (!collection || !id) return;
  const col = collection.replace("taz_company_", "");
  const map = getDeletedIdsMap();
  if (!map[col]) map[col] = [];
  const strId = String(id);
  if (!map[col].includes(strId)) {
    map[col].push(strId);
  }
  try {
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function getCustomApiBase() {
  try {
    return localStorage.getItem("taz_company_custom_api_base") || "";
  } catch {
    return "";
  }
}

export function setCustomApiBase(url) {
  try {
    if (url && url.trim()) {
      localStorage.setItem("taz_company_custom_api_base", url.trim().replace(/\/$/, ""));
    } else {
      localStorage.removeItem("taz_company_custom_api_base");
    }
  } catch {}
  notifySyncListeners();
}

// Detect API base dynamically: works on Vercel, localhost, or LAN IP
export function getApiBase() {
  const custom = getCustomApiBase();
  if (custom) return custom.replace(/\/$/, "");

  const envApi = import.meta.env?.VITE_API_BASE;
  if (envApi) return envApi.replace(/\/$/, "");

  const hostname = window.location.hostname || "localhost";
  const port = window.location.port;

  // If running with Vite dev server (on any IP/mobile/PC) or port 3000
  if (port === "5173" || port === "3000") {
    return "/api";
  }

  // If served directly from server port 5000
  if (port === "5000") {
    return "/api";
  }

  // If running on local network (e.g. mobile connected to PC IP)
  if (hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.")) {
    return `http://${hostname}:5000/api`;
  }

  // Default to relative /api
  return "/api";
}

let currentDataVersion = 0;
let isConnectedToServer = false;
let syncListeners = [];

export function getSyncStatus() {
  return {
    isConnected: isConnectedToServer,
    version: currentDataVersion,
    apiBase: getApiBase()
  };
}

export function onSyncStatusChange(cb) {
  syncListeners.push(cb);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== cb);
  };
}

function notifySyncListeners() {
  const status = getSyncStatus();
  syncListeners.forEach((cb) => {
    try {
      cb(status);
    } catch (err) {
      console.warn("Sync status listener error:", err);
    }
  });
}

/**
 * Fetch Network IP Addresses and Mobile URLs from backend
 */
export async function fetchNetworkInfo() {
  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/data/network-info`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("fetchNetworkInfo error:", err);
  }
  const host = window.location.hostname || "192.168.31.166";
  return {
    success: true,
    primaryIp: host,
    mobileUrl: `http://${host}:5173/`,
    serverUrl: `http://${host}:5000/api`
  };
}

/**
 * Merge local collection with remote collection without data loss.
 * Respects explicitly deleted items and retains local additions not yet synced to remote.
 * Compares timestamps so newest edit (from Mobile or PC) always wins!
 */
function mergeCollectionWithRemote(colKey, localList, remoteList, deletedIds = []) {
  if (!Array.isArray(remoteList)) return { merged: localList, missingInRemote: [] };
  if (!Array.isArray(localList) || localList.length === 0) {
    // Filter out locally deleted IDs from remote
    const filteredRemote = remoteList.filter((item) => {
      const id = String(item?.id || item?.code || "");
      return !deletedIds.includes(id);
    });
    return { merged: filteredRemote, missingInRemote: [] };
  }

  const remoteMap = new Map();
  const deletedSet = new Set(deletedIds.map(String));

  remoteList.forEach((item) => {
    if (!item) return;
    const id = String(item.id || item.code || "");
    if (id && !deletedSet.has(id)) {
      remoteMap.set(id, item);
    }
  });

  const missingInRemote = [];

  // Look for any item that exists locally and reconcile with remote
  localList.forEach((item) => {
    if (!item) return;
    const id = String(item.id || item.code || "");
    if (!id || deletedSet.has(id)) return;

    if (!remoteMap.has(id)) {
      remoteMap.set(id, item);
      missingInRemote.push(item);
    } else {
      // Reconcile if both exist: newest updatedAt or date wins!
      const remoteItem = remoteMap.get(id);
      const localTime = new Date(item.updatedAt || item.date || item.createdAt || 0).getTime();
      const remoteTime = new Date(remoteItem.updatedAt || remoteItem.date || remoteItem.createdAt || 0).getTime();

      if (localTime > remoteTime) {
        remoteMap.set(id, item);
        missingInRemote.push(item);
      }
    }
  });

  const merged = Array.from(remoteMap.values());
  return { merged, missingInRemote };
}

/**
 * Fetch all collections from central server and update localStorage
 */
export async function pullAllFromBackend(force = false) {
  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/data/all/bundle`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const result = await res.json();

    if (result && result.success && result.data) {
      isConnectedToServer = true;
      currentDataVersion = result.version || Date.now();

      const serverData = result.data;
      const deletedMap = getDeletedIdsMap();
      let hasChanges = false;
      const collectionsToPush = [];

      Object.entries(STORAGE_KEY_MAP).forEach(([colKey, storageKey]) => {
        if (serverData[colKey] !== undefined && serverData[colKey] !== null) {
          const currentLocalRaw = localStorage.getItem(storageKey);
          let currentLocal = null;
          try {
            currentLocal = currentLocalRaw ? JSON.parse(currentLocalRaw) : null;
          } catch {
            currentLocal = null;
          }

          if (Array.isArray(serverData[colKey])) {
            const deletedForCol = deletedMap[colKey] || [];
            const { merged, missingInRemote } = mergeCollectionWithRemote(
              colKey,
              currentLocal,
              serverData[colKey],
              deletedForCol
            );

            const mergedStr = JSON.stringify(merged);
            if (currentLocalRaw !== mergedStr) {
              localStorage.setItem(storageKey, mergedStr);
              hasChanges = true;
            }

            // If local had unsynced records, queue for server upload
            if (missingInRemote.length > 0) {
              collectionsToPush.push({ storageKey, data: merged });
            }
          } else {
            // Object data like settings
            const serverStr = JSON.stringify(serverData[colKey]);
            if (currentLocalRaw !== serverStr) {
              localStorage.setItem(storageKey, serverStr);
              hasChanges = true;
            }
          }
        }
      });

      if (hasChanges || force) {
        window.dispatchEvent(
          new CustomEvent("taz-company-update", { detail: { source: "pullAllFromBackend" } })
        );
      }

      // Sync any missing local items back to server
      if (collectionsToPush.length > 0) {
        for (const item of collectionsToPush) {
          syncCollectionToBackend(item.storageKey, item.data).catch(() => {});
        }
      }

      notifySyncListeners();
    }
  } catch (err) {
    if (isConnectedToServer) {
      isConnectedToServer = false;
      notifySyncListeners();
    }
  }
}

/**
 * Push all local collections to central backend
 */
export async function pushAllToBackend() {
  try {
    const apiBase = getApiBase();
    const bundle = {};

    Object.entries(STORAGE_KEY_MAP).forEach(([colKey, storageKey]) => {
      try {
        const val = localStorage.getItem(storageKey);
        if (val) {
          bundle[colKey] = JSON.parse(val);
        }
      } catch {
        // ignore parse error
      }
    });

    const res = await fetch(`${apiBase}/data/all/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
      keepalive: true
    });

    if (res.ok) {
      const result = await res.json();
      isConnectedToServer = true;
      if (result.version) currentDataVersion = result.version;
      notifySyncListeners();
      return true;
    }
  } catch (err) {
    console.warn("[Sync] pushAllToBackend error:", err.message);
  }
  return false;
}

/**
 * Save single collection asynchronously to central backend
 */
export async function syncCollectionToBackend(storageKey, value) {
  const colName = REVERSE_STORAGE_MAP[storageKey] || storageKey.replace("taz_company_", "");
  if (!colName) return false;

  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/data/${colName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
      keepalive: true
    });

    if (res.ok) {
      const result = await res.json();
      isConnectedToServer = true;
      if (result.version) currentDataVersion = result.version;
      notifySyncListeners();
      return true;
    }
  } catch (err) {
    isConnectedToServer = false;
    notifySyncListeners();
  }
  return false;
}

/**
 * Delete single item from central backend
 */
export async function deleteItemFromBackend(storageKey, id) {
  const colName = REVERSE_STORAGE_MAP[storageKey] || storageKey.replace("taz_company_", "");
  if (!colName || !id) return false;

  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/data/${colName}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      keepalive: true
    });

    if (res.ok) {
      const result = await res.json();
      isConnectedToServer = true;
      if (result.version) currentDataVersion = result.version;
      notifySyncListeners();
      return true;
    }
  } catch (err) {
    console.warn("[Sync] deleteItemFromBackend error:", err.message);
  }
  return false;
}

/**
 * Start live background synchronization polling across all PCs
 */
let syncIntervalTimer = null;

export function startLiveSync(pollIntervalMs = 2500) {
  // Initial immediate fetch
  pullAllFromBackend();

  // Periodic lightweight version check
  if (syncIntervalTimer) clearInterval(syncIntervalTimer);

  syncIntervalTimer = setInterval(async () => {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/data/version`, {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });

      if (res.ok) {
        const data = await res.json();
        isConnectedToServer = true;

        // If another PC modified data, pull the latest bundle!
        if (data.version && data.version !== currentDataVersion) {
          await pullAllFromBackend(true);
        } else {
          notifySyncListeners();
        }
      } else {
        if (isConnectedToServer) {
          isConnectedToServer = false;
          notifySyncListeners();
        }
      }
    } catch {
      if (isConnectedToServer) {
        isConnectedToServer = false;
        notifySyncListeners();
      }
    }
  }, pollIntervalMs);

  // Sync immediately when user switches tabs, focuses window, or un-minimizes
  const onSyncTrigger = () => {
    pullAllFromBackend(true);
  };

  window.addEventListener("focus", onSyncTrigger);
  document.addEventListener("visibilitychange", onSyncTrigger);

  return () => {
    if (syncIntervalTimer) clearInterval(syncIntervalTimer);
    window.removeEventListener("focus", onSyncTrigger);
    document.removeEventListener("visibilitychange", onSyncTrigger);
  };
}

/**
 * 1-Click Export of the complete lifetime database as a file
 */
export async function downloadLifetimeBackup() {
  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/data/backup/export`);
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taz_diagnostics_lifetime_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.warn("Backend backup export failed, falling back to local client backup:", e);
  }

  // Client-side fallback: exports full localStorage store
  const backup = {
    exportedAt: new Date().toISOString(),
    source: "Taz Diagnostic Lifetime Client Backup",
    data: {}
  };
  Object.keys(STORAGE_MAP).forEach((col) => {
    try {
      const key = STORAGE_MAP[col];
      const val = localStorage.getItem(key);
      if (val) backup.data[col] = JSON.parse(val);
    } catch {}
  });
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `taz_diagnostics_lifetime_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * 1-Click Restore of complete lifetime database from a JSON file
 */
export async function restoreLifetimeBackup(file) {
  const text = await file.text();
  const bundle = JSON.parse(text);
  const data = bundle.data || bundle;

  // Restore directly to localStorage so it works even offline
  Object.entries(STORAGE_MAP).forEach(([col, storageKey]) => {
    if (data[col] && Array.isArray(data[col])) {
      localStorage.setItem(storageKey, JSON.stringify(data[col]));
    }
  });

  // Also push to central backend if online
  try {
    const apiBase = getApiBase();
    await fetch(`${apiBase}/data/backup/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle)
    });
  } catch (e) {
    console.warn("Could not push restored backup to server:", e);
  }

  window.dispatchEvent(new Event("storage"));
  return true;
}

