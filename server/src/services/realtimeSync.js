/**
 * TAZ COMPANY — Realtime Multi-PC & Mobile Event Stream (SSE) & Presence Tracker
 * Provides sub-50ms live synchronization and active device tracking.
 */

// Active sessions map: clientId -> session object
const activeSessions = new Map();

// Active SSE client connections: clientId -> res
const sseClients = new Map();

export function registerSseClient(clientId, req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });

  // Keep-alive ping comment every 15 seconds to prevent browser/proxy timeouts
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch {
      clearInterval(keepAliveInterval);
    }
  }, 15000);

  sseClients.set(clientId, res);

  // Send initial connected payload + current presence
  const currentPresence = getActivePresence();
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", clientId, presence: currentPresence })}\n\n`);

  req.on("close", () => {
    clearInterval(keepAliveInterval);
    sseClients.delete(clientId);
    activeSessions.delete(clientId);
    broadcastPresence();
  });
}

export function broadcastDataUpdate(collection, version, data) {
  const payload = JSON.stringify({
    type: "DATA_UPDATED",
    collection,
    version,
    data,
    timestamp: Date.now()
  });

  for (const [id, clientRes] of sseClients.entries()) {
    try {
      clientRes.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(id);
    }
  }
}

export function broadcastPresence() {
  pruneDeadSessions();
  const presence = getActivePresence();
  const payload = JSON.stringify({
    type: "PRESENCE_UPDATED",
    activeCount: presence.activeCount,
    sessions: presence.sessions,
    timestamp: Date.now()
  });

  for (const [id, clientRes] of sseClients.entries()) {
    try {
      clientRes.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(id);
    }
  }
}

export function recordHeartbeat(session, clientIp = "") {
  if (!session || !session.clientId) return;
  const existing = activeSessions.get(session.clientId) || {};
  activeSessions.set(session.clientId, {
    ...existing,
    ...session,
    ip: clientIp || existing.ip || "Local Network",
    lastSeen: Date.now()
  });
  broadcastPresence();
}

export function removeSession(clientId) {
  if (clientId) {
    activeSessions.delete(clientId);
    broadcastPresence();
  }
}

function pruneDeadSessions() {
  const cutoff = Date.now() - 25000; // 25 seconds without heartbeat = disconnected
  for (const [id, session] of activeSessions.entries()) {
    if (session.lastSeen < cutoff) {
      activeSessions.delete(id);
    }
  }
}

export function getActivePresence() {
  pruneDeadSessions();
  const sessions = Array.from(activeSessions.values());
  return {
    activeCount: Math.max(1, sessions.length),
    sessions
  };
}
