import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import remindersRouter from "./routes/reminders.js";
import webhookRouter from "./routes/webhook.js";
import dataSyncRouter from "./routes/dataSync.js";
import { initScheduler } from "./scheduler.js";
import { initDb, isDbConnected } from "./db.js";

dotenv.config();

const app = express();

// Enable CORS for all local network computers and web clients
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);

// High payload limit for lab reports, doctor images, and data backups
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.resolve(__dirname, "../../client/dist");

// API Routes
app.use("/api/data", dataSyncRouter);
app.use("/api/store", dataSyncRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/whatsapp", webhookRouter);

// Serve static frontend build if it exists
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}

app.get("/api", (_req, res) => {
  res.json({
    status: "online",
    application: "TAZ COMPANY — TAZ DIAGNOSTIC LAB SERVER",
    version: "1.0.0",
    multiPcSync: "Active",
    endpoints: {
      health: "/api/health",
      dataBundle: "/api/data/all/bundle",
      reminders: "/api/reminders"
    }
  });
});

if (fs.existsSync(CLIENT_DIST)) {
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.json({
      status: "online",
      application: "TAZ COMPANY — TAZ DIAGNOSTIC LAB SERVER",
      version: "1.0.0",
      multiPcSync: "Active"
    });
  });
}


app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    application: "TAZ COMPANY",
    product: "TAZ DIAGNOSTIC",
    status: "online",
    database: isDbConnected() ? "MySQL Database Connected" : "Local File Central Store",
    multiPcSync: "Active",
    feature: "Live Monthly WhatsApp Retest Reminders & Multi-PC Real-Time Sync",
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Initialize MySQL Database Pool & Tables
  await initDb();

  // Listen on 0.0.0.0 so all PCs on the network can connect!
  app.listen(PORT, "0.0.0.0", async () => {
    console.log("=================================================");
    console.log("   TAZ COMPANY — TAZ DIAGNOSTIC LAB SERVER       ");
    console.log(`   Local Server:       http://localhost:${PORT}  `);
    console.log(`   Network Multi-PC:   http://0.0.0.0:${PORT}    `);
    console.log(`   Database Mode:      ${isDbConnected() ? "MySQL Database" : "Central File Store"}`);
    console.log("   Multi-PC Data Sync: /api/data/* (Active)     ");
    console.log("   WhatsApp Webhook:   /api/whatsapp/webhook     ");
    console.log("=================================================");

    // Start background daily scheduler
    try {
      await initScheduler();
    } catch (err) {
      console.error("Failed to start reminder scheduler:", err);
    }
  });
}

export { app };
export default app;

if (process.env.VERCEL !== "1") {
  startServer();
}
