/**
 * TAZ COMPANY / TAZ DIAGNOSTIC — Multi-PC Central Database Sync Service
 * Handles instant sub-50ms live synchronization between all clinic/lab computers,
 * mobile phones, and the central server via Server-Sent Events (SSE) & active presence tracking.
 */

export const STORAGE_KEY_MAP = {
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

export const REVERSE_STORAGE_MAP = Object.entries(STORAGE_KEY_MAP).reduce((acc, [col, key]) => {
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

// Detect API base dynamically: relative /api works universally via Vite proxy or direct Express server
export function getApiBase() {
  const custom = getCustomApiBase();
  if (custom && !custom.includes("taz-diagnostics.onrender.com")) {
    return custom.replace(/\/$/, "");
  }

  const envApi = import.meta.env?.VITE_API_BASE;
  if (envApi) return envApi.replace(/\/$/, "");

  return "/api";
}

let currentDataVersion = 0;
let isConnectedToServer = true;
let syncListeners = [];

export function getSyncStatus() {
  return {
    isConnected: isConnectedToServer,
    version: currentDataVersion,
    apiBase: getApiBase(),
    presence: currentPresence
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

// =========================================================
// REALTIME PRESENCE & DEVICE TRACKING
// =========================================================

export function getClientId() {
  if (typeof window === "undefined") return "server_agent";
  try {
    let id = sessionStorage.getItem("taz_client_id");
    if (!id) {
      const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent);
      id = (isMobile ? "phone_" : "pc_") + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem("taz_client_id", id);
    }
    return id;
  } catch {
    return "client_" + Math.random().toString(36).substring(2, 9);
  }
}

export function getDeviceInfo() {
  const isMobile = typeof window !== "undefined" && (
    window.innerWidth < 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  let userName = "Admin";
  let role = "admin";
  try {
    const raw = localStorage.getItem("taz_company_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.name) userName = parsed.name;
      if (parsed.role) role = parsed.role;
    }
  } catch {}

  const currentPath = typeof window !== "undefined" ? (window.location.hash || window.location.pathname || "/dashboard") : "/dashboard";

  return {
    clientId: getClientId(),
    deviceType: isMobile ? "Mobile Phone" : "Desktop PC / Laptop",
    userName,
    role,
    currentPath,
    connectedAt: Date.now()
  };
}

let currentPresence = {
  activeCount: 1,
  sessions: []
};
let presenceListeners = [];

export function getPresenceStatus() {
  return currentPresence;
}

export function onPresenceChange(cb) {
  presenceListeners.push(cb);
  try {
    cb(currentPresence);
  } catch {}
  return () => {
    presenceListeners = presenceListeners.filter((l) => l !== cb);
  };
}

function notifyPresenceListeners() {
  presenceListeners.forEach((cb) => {
    try {
      cb(currentPresence);
    } catch (err) {
      console.warn("Presence listener error:", err);
    }
  });
  notifySyncListeners();
}

// Heartbeat function
export async function sendPresenceHeartbeat() {
  try {
    const info = getDeviceInfo();
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/data/presence/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(info),
      keepalive: true
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.presence) {
        currentPresence = data.presence;
        notifyPresenceListeners();
      }
    }
  } catch {}
}

let heartbeatTimer = null;
export function startPresenceTracking() {
  sendPresenceHeartbeat();
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(sendPresenceHeartbeat, 5000);
}

// =========================================================
// REALTIME SERVER-SENT EVENTS (SSE) STREAM (<50ms LIVE SYNC)
// =========================================================

let eventSource = null;
let sseReconnectTimer = null;
let isIncomingSseUpdate = false;

export function startRealtimeSse() {
  if (typeof window === "undefined" || !("EventSource" in window)) return;
  if (eventSource) {
    try {
      eventSource.close();
    } catch {}
  }

  const apiBase = getApiBase();
  const clientId = getClientId();
  const sseUrl = `${apiBase}/data/events?clientId=${encodeURIComponent(clientId)}`;

  try {
    eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      isConnectedToServer = true;
      notifySyncListeners();
    };

    eventSource.onmessage = (e) => {
      try {
        if (!e.data || e.data.startsWith(":")) return; // ignore comments/keepalive
        const payload = JSON.parse(e.data);
        if (!payload) return;

        if (payload.type === "CONNECTED") {
          isConnectedToServer = true;
          if (payload.presence) {
            currentPresence = payload.presence;
            notifyPresenceListeners();
          }
        } else if (payload.type === "DATA_UPDATED") {
          const { collection, version, data } = payload;
          if (version) currentDataVersion = version;
          const storageKey = STORAGE_KEY_MAP[collection] || `taz_company_${collection}`;

          const currentLocalRaw = localStorage.getItem(storageKey);
          const serverStr = JSON.stringify(data);

          if (currentLocalRaw !== serverStr) {
            isIncomingSseUpdate = true;
            try {
              localStorage.setItem(storageKey, serverStr);
            } finally {
              isIncomingSseUpdate = false;
            }

            // Immediately fire custom event to trigger instant React re-render
            window.dispatchEvent(
              new CustomEvent("taz-company-update", {
                detail: { key: storageKey, value: data, source: "sse" }
              })
            );
          }
          notifySyncListeners();
        } else if (payload.type === "PRESENCE_UPDATED") {
          currentPresence = {
            activeCount: payload.activeCount || Math.max(1, payload.sessions?.length || 1),
            sessions: payload.sessions || []
          };
          notifyPresenceListeners();
        }
      } catch (err) {
        console.warn("SSE event parsing error:", err);
      }
    };

    eventSource.onerror = () => {
      try {
        eventSource.close();
      } catch {}
      eventSource = null;

      // Automatically reconnect in 3 seconds
      if (!sseReconnectTimer) {
        sseReconnectTimer = setTimeout(() => {
          sseReconnectTimer = null;
          startRealtimeSse();
        }, 3000);
      }
    };
  } catch (err) {
    console.warn("Could not initialize EventSource:", err);
  }
}

// =========================================================
// BROADCAST CHANNEL & STORAGE INTERCEPTOR
// =========================================================

let syncBroadcastChannel = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    syncBroadcastChannel = new BroadcastChannel("taz_company_realtime_sync");
    syncBroadcastChannel.onmessage = (event) => {
      if (event?.data?.type === "DATA_UPDATED") {
        window.dispatchEvent(
          new CustomEvent("taz-company-update", { detail: { key: event.data.key, value: event.data.value } })
        );
      } else if (event?.data?.type === "REFRESH_ALL") {
        pullAllFromBackend(true);
      }
    };
  }
} catch {}

const storageDebounceTimers = {};

/**
 * Transparently intercepts localStorage.setItem so ANY page or component
 * that saves data automatically pushes to backend and alerts all other devices!
 */
export function installStorageInterceptor() {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (window.__taz_storage_interceptor_installed) return;
  window.__taz_storage_interceptor_installed = true;

  const originalSetItem = window.localStorage.setItem;
  const originalRemoveItem = window.localStorage.removeItem;

  window.localStorage.setItem = function (key, value) {
    originalSetItem.call(window.localStorage, key, value);

    // If incoming from SSE server stream, do not echo back
    if (isIncomingSseUpdate) return;

    if (
      typeof key === "string" &&
      key.startsWith("taz_company_") &&
      key !== "taz_company_session" &&
      key !== "taz_company_custom_api_base"
    ) {
      window.dispatchEvent(
        new CustomEvent("taz-company-update", { detail: { key, value } })
      );

      // Debounced sync to backend
      if (storageDebounceTimers[key]) clearTimeout(storageDebounceTimers[key]);
      storageDebounceTimers[key] = setTimeout(() => {
        try {
          const parsed = JSON.parse(value);
          syncCollectionToBackend(key, parsed);
        } catch {
          syncCollectionToBackend(key, value);
        }
      }, 100);
    }
  };

  window.localStorage.removeItem = function (key) {
    originalRemoveItem.call(window.localStorage, key);
    if (typeof key === "string" && key.startsWith("taz_company_")) {
      window.dispatchEvent(
        new CustomEvent("taz-company-update", { detail: { key, value: null } })
      );
    }
  };
}

// Auto-install interceptor immediately
installStorageInterceptor();

/**
 * Fetch Network IP Addresses and Mobile URLs from backend
 */
export async function fetchNetworkInfo() {
  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/data/network-info`, { cache: "no-store" });
    if (res.ok) {
      const info = await res.json();
      if (info && info.primaryIp) return info;
    }
  } catch (err) {
    console.warn("fetchNetworkInfo error:", err);
  }
  const host = (typeof window !== "undefined" && window.location.hostname) ? window.location.hostname : "192.168.31.166";
  return {
    success: true,
    primaryIp: host,
    mobileUrl: `http://${host}:5173/`,
    serverUrl: `http://${host}:5000/api`
  };
}

/**
 * Fetch all collections from central server and update localStorage.
 * Central server is authoritative so additions, deletions,
 * and updates from both Mobile and PC stay 100% in sync.
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

          // If server is brand new on zero-boot but local has data, push local up
          const isServerZeroBoot = !result.version || result.version === 0;
          if (
            isServerZeroBoot &&
            Array.isArray(serverData[colKey]) &&
            serverData[colKey].length === 0 &&
            Array.isArray(currentLocal) &&
            currentLocal.length > 0
          ) {
            collectionsToPush.push({ storageKey, data: currentLocal });
            return;
          }

          // Adopt server collection directly so additions and deletions sync perfectly
          const serverStr = JSON.stringify(serverData[colKey]);
          if (currentLocalRaw !== serverStr || force) {
            isIncomingSseUpdate = true;
            try {
              localStorage.setItem(storageKey, serverStr);
            } finally {
              isIncomingSseUpdate = false;
            }
            hasChanges = true;
            window.dispatchEvent(
              new CustomEvent("taz-company-update", { detail: { key: storageKey, value: serverData[colKey] } })
            );
          }
        }
      });

      if (hasChanges || force) {
        window.dispatchEvent(
          new CustomEvent("taz-company-update", { detail: { source: "pullAllFromBackend" } })
        );
      }

      if (collectionsToPush.length > 0) {
        for (const item of collectionsToPush) {
          syncCollectionToBackend(item.storageKey, item.data).catch(() => {});
        }
      }

      notifySyncListeners();
      return true;
    }
  } catch (err) {
    if (isConnectedToServer) {
      isConnectedToServer = false;
      notifySyncListeners();
    }
  }
  return false;
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

  // Broadcast immediately to all tabs in the same browser
  try {
    syncBroadcastChannel?.postMessage({ type: "DATA_UPDATED", key: storageKey, value });
  } catch {}

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
 * Save multiple collections atomically to central backend
 */
export async function syncBatchToBackend(bundle) {
  try {
    const apiBase = getApiBase();
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
    console.warn("syncBatchToBackend error:", err);
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
    syncBroadcastChannel?.postMessage({ type: "REFRESH_ALL" });
  } catch {}

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
 * Start live background synchronization polling across all PCs & Mobile
 */
let syncIntervalTimer = null;

export function startLiveSync(pollIntervalMs = 1500) {
  // Clear any stale custom API base
  try {
    const saved = localStorage.getItem("taz_company_custom_api_base");
    if (
      saved &&
      (saved.includes("taz-diagnostics.onrender.com") ||
        saved.includes("localhost:5000") ||
        saved.includes(":5000/api"))
    ) {
      localStorage.removeItem("taz_company_custom_api_base");
    }
  } catch {}

  // 1. Initial immediate fetch
  pullAllFromBackend();

  // 2. Start sub-50ms SSE live stream
  startRealtimeSse();

  // 3. Start active presence / device tracking
  startPresenceTracking();

  // 4. Fallback lightweight periodic version check
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

        if (data.version && data.version !== currentDataVersion) {
          currentDataVersion = data.version;
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
    sendPresenceHeartbeat();
  };

  window.addEventListener("focus", onSyncTrigger);
  document.addEventListener("visibilitychange", onSyncTrigger);

  return () => {
    if (syncIntervalTimer) clearInterval(syncIntervalTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
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
  Object.keys(STORAGE_KEY_MAP).forEach((col) => {
    try {
      const key = STORAGE_KEY_MAP[col];
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
  Object.entries(STORAGE_KEY_MAP).forEach(([col, storageKey]) => {
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
