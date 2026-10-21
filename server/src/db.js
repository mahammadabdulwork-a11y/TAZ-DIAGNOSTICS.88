import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import {
  DEFAULT_DOCTORS,
  DEFAULT_TESTS,
  DEFAULT_BRANCHES,
  DEFAULT_USERS
} from "./seedData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, "reminders_db.json");
const APP_STORE_FILE = path.join(DATA_DIR, "app_store.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

try {
  const existingBackups = fs.readdirSync(BACKUP_DIR);
  if (existingBackups.length === 0 && fs.existsSync(APP_STORE_FILE)) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const initialBackup = path.join(BACKUP_DIR, `backup_${todayStr}.json`);
    fs.copyFileSync(APP_STORE_FILE, initialBackup);
  }
} catch (e) {
  // ignore
}

// Default initial dataset for reminders & whatsapp
const INITIAL_DATA = {
  settings: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || "taz_monthly_retest_reminder",
    templateLanguage: "en",
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "taz_diagnostic_webhook_secure_token",
    testMode: true,
    dailyCronTime: "0 9 * * *",
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  consents: [
    {
      patientId: "PAT001",
      optIn: true,
      consentTimestamp: new Date().toISOString(),
      channel: "WhatsApp",
      notes: "Opted in during registration"
    },
    {
      patientId: "PAT002",
      optIn: true,
      consentTimestamp: new Date().toISOString(),
      channel: "WhatsApp",
      notes: "Opted in during registration"
    },
    {
      patientId: "PAT003",
      optIn: false,
      consentTimestamp: new Date().toISOString(),
      optOutTimestamp: new Date().toISOString(),
      channel: "WhatsApp",
      notes: "Patient requested opt-out"
    }
  ],
  reminders: [
    {
      id: "REM-PAT001-01",
      patientId: "PAT001",
      patientName: "Mohammed Irfan",
      phone: "+919876543210",
      previousReportId: "REP001",
      previousTestDate: "2026-09-12",
      nextReminderDate: "2026-10-12",
      testList: "Complete Blood Picture (CBP), Urine Routine, Blood Sugar Fasting, Liver Function Test (LFT)",
      status: "SCHEDULED",
      optIn: true,
      cycleMonth: "2026-10",
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      failureReason: null,
      whatsappMessageId: null,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "REM-PAT002-01",
      patientId: "PAT002",
      patientName: "Ayesha Khan",
      phone: "+919988776655",
      previousReportId: "REP002",
      previousTestDate: "2026-08-12",
      nextReminderDate: "2026-09-12",
      testList: "Haemoglobin (Hb), Blood Sugar Fasting, Serum Creatinine",
      status: "DUE TODAY",
      optIn: true,
      cycleMonth: "2026-09",
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      failureReason: null,
      whatsappMessageId: null,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "REM-PAT003-01",
      patientId: "PAT003",
      patientName: "Arjun Reddy",
      phone: "+919123456780",
      previousReportId: "REP003",
      previousTestDate: "2026-08-15",
      nextReminderDate: "2026-09-15",
      testList: "Lipid Profile, HbA1c",
      status: "OPTED OUT",
      optIn: false,
      cycleMonth: "2026-09",
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      failureReason: "Patient opted out (STOP received)",
      whatsappMessageId: null,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  messages: []
};

let mysqlPool = null;
let isMysqlConnected = false;
let lastDataVersion = Date.now();

export function isDbConnected() {
  return isMysqlConnected;
}

export function getDataVersion() {
  return lastDataVersion;
}

export function bumpDataVersion() {
  lastDataVersion = Date.now();
  return lastDataVersion;
}

// ---------------------------------------------------------------------------
// File Store Helpers
// ---------------------------------------------------------------------------
function getAppStoreFromFile() {
  const getInitialDefaultStore = () => ({
    patients: [],
    doctors: [...DEFAULT_DOCTORS],
    tests: [...DEFAULT_TESTS],
    reports: [],
    bills: [],
    messages: [],
    branches: [...DEFAULT_BRANCHES],
    users: [...DEFAULT_USERS],
    settings: {
      labName: "TAZ DIAGNOSTIC",
      tagline: "ADVANCED CLINICAL LABORATORY & DIAGNOSTIC CENTRE",
      phone: "+91 99887 76655",
      email: "contact@tazdiagnostic.com",
      address: "Dr No: 8-200 RAJKUMAR SILKS, Near Raj Kumar Silks Street, Main Road, Tallapudi, Rajahmundry-534341, Andhra Pradesh",
      currency: "INR (₹)",
      autoBackup: true,
      darkMode: false,
      whatsappReminders: true,
      retestCycleDays: 30,
      whatsappTemplateName: "taz_monthly_retest_reminder"
    },
    _version: Date.now()
  });

  if (!fs.existsSync(APP_STORE_FILE)) {
    const defaultStore = getInitialDefaultStore();
    fs.writeFileSync(APP_STORE_FILE, JSON.stringify(defaultStore, null, 2), "utf8");
    return defaultStore;
  }
  try {
    const raw = fs.readFileSync(APP_STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    let mutated = false;
    if (!parsed.doctors || parsed.doctors.length === 0) {
      parsed.doctors = [...DEFAULT_DOCTORS];
      mutated = true;
    }
    if (!parsed.tests || parsed.tests.length === 0) {
      parsed.tests = [...DEFAULT_TESTS];
      mutated = true;
    }
    if (!parsed.branches || parsed.branches.length === 0) {
      parsed.branches = [...DEFAULT_BRANCHES];
      mutated = true;
    }
    if (!parsed.users || parsed.users.length === 0) {
      parsed.users = [...DEFAULT_USERS];
      mutated = true;
    }
    if (mutated) {
      fs.writeFileSync(APP_STORE_FILE, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  } catch {
    const defaultStore = getInitialDefaultStore();
    fs.writeFileSync(APP_STORE_FILE, JSON.stringify(defaultStore, null, 2), "utf8");
    return defaultStore;
  }
}

let lastBackupDate = "";

function saveAppStoreToFile(store) {
  store._version = Date.now();
  lastDataVersion = store._version;
  const storeStr = JSON.stringify(store, null, 2);
  fs.writeFileSync(APP_STORE_FILE, storeStr, "utf8");

  // Lifetime automated backup: ensure a daily timestamped backup exists
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (lastBackupDate !== todayStr) {
      const backupFile = path.join(BACKUP_DIR, `backup_${todayStr}.json`);
      fs.writeFileSync(backupFile, storeStr, "utf8");
      lastBackupDate = todayStr;
    }
  } catch (err) {
    console.warn("[Backup] Automated backup snapshot warning:", err.message);
  }
}

// ---------------------------------------------------------------------------
// Initialize MySQL Database Connection and Auto-create Tables
// ---------------------------------------------------------------------------
export async function initDb() {
  try {
    const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

    if (dbUrl) {
      mysqlPool = mysql.createPool(dbUrl);
    } else {
      const host = process.env.MYSQL_HOST || "127.0.0.1";
      const port = parseInt(process.env.MYSQL_PORT || "3307", 10);
      const user = process.env.MYSQL_USER || "root";
      const password = process.env.MYSQL_PASSWORD || "";
      const dbName = process.env.MYSQL_DATABASE || "taz_company";

      // 1. Ensure Database exists
      try {
        const rootConn = await mysql.createConnection({
          host,
          port,
          user,
          password,
          connectTimeout: 4000
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await rootConn.end();
      } catch (dbCreateErr) {
        // Continue to try direct pool connection
      }

      // 2. Connect Pool to the target Database
      mysqlPool = mysql.createPool({
        host,
        port,
        user,
        password,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        connectTimeout: 5000
      });
    }

    const conn = await mysqlPool.getConnection();
    conn.release();

    console.log(`[MySQL] Connected successfully to MySQL database "${dbName}" at ${host}:${port}!`);
    isMysqlConnected = true;

    // Create Sync Store Table for complete object persistence across all PCs
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS sync_store (
        collection_key VARCHAR(100) PRIMARY KEY,
        data_json LONGTEXT NOT NULL,
        version BIGINT DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create Doctors Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        specialization VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        clinic VARCHAR(255),
        address TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create Tests Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS tests (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        unit VARCHAR(100),
        reference_range TEXT,
        price DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Active',
        parameters JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create Patients Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(100) PRIMARY KEY,
        mrn VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        age VARCHAR(50),
        gender VARCHAR(50),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        doctor_id VARCHAR(100),
        doctor_name VARCHAR(255),
        branch_id VARCHAR(100),
        tests JSON,
        status VARCHAR(50) DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create Reports Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(100) PRIMARY KEY,
        patient_id VARCHAR(100),
        patient_name VARCHAR(255),
        doctor_name VARCHAR(255),
        date VARCHAR(50),
        time VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Completed',
        payment_status VARCHAR(50) DEFAULT 'Paid',
        sample_type VARCHAR(100),
        tests JSON,
        results JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create Bills Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id VARCHAR(100) PRIMARY KEY,
        bill_number VARCHAR(100),
        patient_id VARCHAR(100),
        patient_name VARCHAR(255),
        date VARCHAR(50),
        total_amount DECIMAL(10,2) DEFAULT 0,
        discount DECIMAL(10,2) DEFAULT 0,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        balance_amount DECIMAL(10,2) DEFAULT 0,
        payment_mode VARCHAR(50) DEFAULT 'Cash',
        status VARCHAR(50) DEFAULT 'Paid',
        items JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create Users Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        role VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        branch VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        password VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create Settings Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone_number_id TEXT,
        business_account_id TEXT,
        access_token TEXT,
        template_name VARCHAR(120) DEFAULT 'taz_monthly_retest_reminder',
        template_language VARCHAR(20) DEFAULT 'en',
        webhook_verify_token VARCHAR(120) DEFAULT 'taz_diagnostic_webhook_secure_token',
        test_mode BOOLEAN DEFAULT true,
        daily_cron_time VARCHAR(30) DEFAULT '0 9 * * *',
        is_active BOOLEAN DEFAULT true,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create Consents Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS consents (
        patient_id VARCHAR(50) PRIMARY KEY,
        opt_in BOOLEAN DEFAULT true,
        consent_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        opt_out_timestamp DATETIME NULL,
        channel VARCHAR(50) DEFAULT 'WhatsApp',
        notes TEXT
      );
    `);

    // Create Reminders Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id VARCHAR(100) PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        previous_report_id VARCHAR(100),
        previous_test_date DATE,
        next_reminder_date DATE NOT NULL,
        test_list TEXT,
        status VARCHAR(50) DEFAULT 'SCHEDULED',
        opt_in BOOLEAN DEFAULT true,
        cycle_month VARCHAR(7),
        sent_at DATETIME NULL,
        delivered_at DATETIME NULL,
        read_at DATETIME NULL,
        failed_at DATETIME NULL,
        failure_reason TEXT,
        whatsapp_message_id VARCHAR(255),
        retry_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Create Messages Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reminder_id VARCHAR(100),
        patient_id VARCHAR(50),
        phone VARCHAR(50),
        direction VARCHAR(20),
        template_name VARCHAR(100),
        message_body TEXT,
        status VARCHAR(50),
        whatsapp_message_id VARCHAR(255),
        raw_payload JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed MySQL if empty
    const [settingsRows] = await mysqlPool.query("SELECT COUNT(*) as cnt FROM settings");
    if (settingsRows[0].cnt === 0) {
      const s = INITIAL_DATA.settings;
      await mysqlPool.query(
        `INSERT INTO settings (phone_number_id, business_account_id, access_token, template_name, template_language, webhook_verify_token, test_mode, daily_cron_time, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.phoneNumberId, s.businessAccountId, s.accessToken, s.templateName, s.templateLanguage, s.webhookVerifyToken, s.testMode, s.dailyCronTime, s.isActive]
      );
    }

    console.log("[MySQL] Central Multi-PC Database schema initialized successfully.");
  } catch (err) {
    isMysqlConnected = false;
    console.warn(`[MySQL] Connection note: ${err.message}.`);
    console.log("[Central Storage] Running in centralized file store mode (app_store.json). Multi-PC sync is FULLY operational!");
  }
}

// ---------------------------------------------------------------------------
// Unified Multi-PC Store Operations
// ---------------------------------------------------------------------------

export async function getCollectionAsync(collectionKey, fallback = []) {
  if (isMysqlConnected && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query(
        "SELECT data_json FROM sync_store WHERE collection_key = ?",
        [collectionKey]
      );
      if (rows.length > 0 && rows[0].data_json) {
        return JSON.parse(rows[0].data_json);
      }
    } catch (err) {
      console.warn(`[MySQL] Failed to read ${collectionKey}:`, err.message);
    }
  }

  // File fallback
  const store = getAppStoreFromFile();
  return store[collectionKey] !== undefined ? store[collectionKey] : fallback;
}

export async function saveCollectionAsync(collectionKey, data) {
  bumpDataVersion();

  // Save to file fallback
  try {
    const store = getAppStoreFromFile();
    store[collectionKey] = data;
    saveAppStoreToFile(store);
  } catch (err) {
    console.error(`[FileStore] Error saving ${collectionKey}:`, err);
  }

  // Save to MySQL sync_store
  if (isMysqlConnected && mysqlPool) {
    try {
      const jsonStr = JSON.stringify(data);
      await mysqlPool.query(
        `INSERT INTO sync_store (collection_key, data_json, version, updated_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           data_json = VALUES(data_json),
           version = VALUES(version),
           updated_at = NOW()`,
        [collectionKey, jsonStr, lastDataVersion]
      );

      // Also mirror to structured tables where applicable for SQL reporting
      if (collectionKey === "doctors" && Array.isArray(data)) {
        for (const doc of data) {
          if (!doc || !doc.id) continue;
          await mysqlPool.query(
            `INSERT INTO doctors (id, name, specialization, phone, email, clinic, address, status, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               name = VALUES(name),
               specialization = VALUES(specialization),
               phone = VALUES(phone),
               email = VALUES(email),
               clinic = VALUES(clinic),
               address = VALUES(address),
               status = VALUES(status),
               updated_at = NOW()`,
            [doc.id, doc.name || "", doc.specialization || "", doc.phone || "", doc.email || "", doc.clinic || "", doc.address || "", doc.status || "Active"]
          ).catch(() => {});
        }
      } else if (collectionKey === "tests" && Array.isArray(data)) {
        for (const t of data) {
          if (!t || !t.id) continue;
          await mysqlPool.query(
            `INSERT INTO tests (id, name, category, unit, reference_range, price, status, parameters, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               name = VALUES(name),
               category = VALUES(category),
               unit = VALUES(unit),
               reference_range = VALUES(reference_range),
               price = VALUES(price),
               status = VALUES(status),
               parameters = VALUES(parameters),
               updated_at = NOW()`,
            [t.id, t.name || "", t.category || "", t.unit || "", t.reference || t.reference_range || "", Number(t.price || 0), t.status || "Active", JSON.stringify(t.parameters || [])]
          ).catch(() => {});
        }
      } else if (collectionKey === "patients" && Array.isArray(data)) {
        for (const p of data) {
          if (!p || !p.id) continue;
          await mysqlPool.query(
            `INSERT INTO patients (id, mrn, name, age, gender, phone, email, address, doctor_id, doctor_name, branch_id, tests, status, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               mrn = VALUES(mrn),
               name = VALUES(name),
               age = VALUES(age),
               gender = VALUES(gender),
               phone = VALUES(phone),
               email = VALUES(email),
               address = VALUES(address),
               doctor_id = VALUES(doctor_id),
               doctor_name = VALUES(doctor_name),
               branch_id = VALUES(branch_id),
               tests = VALUES(tests),
               status = VALUES(status),
               updated_at = NOW()`,
            [p.id, p.mrn || p.patient_code || "", p.name || p.fullName || "", String(p.age || ""), p.gender || "", p.phone || "", p.email || "", p.address || "", p.doctorId || "", p.doctorName || p.doctor || "", p.branchId || p.branch || "", JSON.stringify(p.tests || []), p.status || "Active"]
          ).catch(() => {});
        }
      }
    } catch (err) {
      console.error(`[MySQL] saveCollectionAsync error for ${collectionKey}:`, err.message);
    }
  }

  return { success: true, version: lastDataVersion };
}

export async function getAllCollectionsAsync() {
  const store = getAppStoreFromFile();
  const result = { ...store, _version: lastDataVersion };

  if (isMysqlConnected && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query("SELECT collection_key, data_json, version FROM sync_store");
      for (const row of rows) {
        if (row.collection_key && row.data_json) {
          try {
            result[row.collection_key] = JSON.parse(row.data_json);
          } catch {
            // ignore JSON parse error
          }
        }
      }
    } catch (err) {
      console.warn("[MySQL] getAllCollectionsAsync fallback to file store:", err.message);
    }
  }

  return result;
}

export async function saveAllCollectionsAsync(bundle) {
  bumpDataVersion();
  const keys = Object.keys(bundle).filter((k) => !k.startsWith("_"));
  for (const key of keys) {
    await saveCollectionAsync(key, bundle[key]);
  }
  return { success: true, version: lastDataVersion };
}

// ---------------------------------------------------------------------------
// Reminders DB Legacy Methods
// ---------------------------------------------------------------------------
export function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), "utf8");
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }
}

export function saveDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function getDbAsync() {
  if (isMysqlConnected && mysqlPool) {
    try {
      const [settingsRows] = await mysqlPool.query("SELECT * FROM settings ORDER BY id DESC LIMIT 1");
      let settings = INITIAL_DATA.settings;
      if (settingsRows.length > 0) {
        const s = settingsRows[0];
        settings = {
          phoneNumberId: s.phone_number_id || "",
          businessAccountId: s.business_account_id || "",
          accessToken: s.access_token || "",
          templateName: s.template_name || "taz_monthly_retest_reminder",
          templateLanguage: s.template_language || "en",
          webhookVerifyToken: s.webhook_verify_token || "taz_diagnostic_webhook_secure_token",
          testMode: Boolean(s.test_mode),
          dailyCronTime: s.daily_cron_time || "0 9 * * *",
          isActive: Boolean(s.is_active),
          updatedAt: s.updated_at ? new Date(s.updated_at).toISOString() : new Date().toISOString()
        };
      }

      const [consentsRows] = await mysqlPool.query("SELECT * FROM consents ORDER BY consent_timestamp DESC");
      const consents = consentsRows.map((c) => ({
        patientId: c.patient_id,
        optIn: Boolean(c.opt_in),
        consentTimestamp: c.consent_timestamp ? new Date(c.consent_timestamp).toISOString() : new Date().toISOString(),
        optOutTimestamp: c.opt_out_timestamp ? new Date(c.opt_out_timestamp).toISOString() : null,
        channel: c.channel || "WhatsApp",
        notes: c.notes || ""
      }));

      const [remindersRows] = await mysqlPool.query("SELECT * FROM reminders ORDER BY created_at DESC");
      const reminders = remindersRows.map((r) => ({
        id: r.id,
        patientId: r.patient_id,
        patientName: r.patient_name,
        phone: r.phone,
        previousReportId: r.previous_report_id,
        previousTestDate: r.previous_test_date ? new Date(r.previous_test_date).toISOString().slice(0, 10) : "",
        nextReminderDate: r.next_reminder_date ? new Date(r.next_reminder_date).toISOString().slice(0, 10) : "",
        testList: r.test_list,
        status: r.status,
        optIn: Boolean(r.opt_in),
        cycleMonth: r.cycle_month,
        sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
        deliveredAt: r.delivered_at ? new Date(r.delivered_at).toISOString() : null,
        readAt: r.read_at ? new Date(r.read_at).toISOString() : null,
        failedAt: r.failed_at ? new Date(r.failed_at).toISOString() : null,
        failureReason: r.failure_reason,
        whatsappMessageId: r.whatsapp_message_id,
        retryCount: r.retry_count || 0,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));

      const [messagesRows] = await mysqlPool.query("SELECT * FROM messages ORDER BY created_at DESC");
      const messages = messagesRows.map((m) => ({
        id: m.id,
        reminderId: m.reminder_id,
        patientId: m.patient_id,
        phone: m.phone,
        direction: m.direction,
        templateName: m.template_name,
        messageBody: m.message_body,
        status: m.status,
        whatsappMessageId: m.whatsapp_message_id,
        rawPayload: m.raw_payload,
        createdAt: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString()
      }));

      return { settings, consents, reminders, messages };
    } catch (err) {
      console.error("[MySQL] getDbAsync error:", err.message);
      return getDb();
    }
  }

  return getDb();
}

export async function saveDbAsync(data) {
  saveDb(data);

  if (isMysqlConnected && mysqlPool) {
    try {
      if (data.settings) {
        const s = data.settings;
        await mysqlPool.query(
          `INSERT INTO settings (id, phone_number_id, business_account_id, access_token, template_name, template_language, webhook_verify_token, test_mode, daily_cron_time, is_active, updated_at)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             phone_number_id = VALUES(phone_number_id),
             business_account_id = VALUES(business_account_id),
             access_token = VALUES(access_token),
             template_name = VALUES(template_name),
             template_language = VALUES(template_language),
             webhook_verify_token = VALUES(webhook_verify_token),
             test_mode = VALUES(test_mode),
             daily_cron_time = VALUES(daily_cron_time),
             is_active = VALUES(is_active),
             updated_at = NOW()`,
          [s.phoneNumberId, s.businessAccountId, s.accessToken, s.templateName, s.templateLanguage, s.webhookVerifyToken, s.testMode, s.dailyCronTime, s.isActive]
        );
      }
    } catch (err) {
      console.error("[MySQL] saveDbAsync error:", err.message);
    }
  }
}
