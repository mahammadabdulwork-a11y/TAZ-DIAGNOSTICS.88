import app from "../server/src/server.js";

export default function handler(req, res) {
  // If Vercel rewrote URL to /api/index, restore original requested path
  const orig = req.headers["x-matched-path"] || req.headers["x-forwarded-uri"] || req.url;
  if (orig && !orig.endsWith("/api/index.js") && !orig.endsWith("/api/index")) {
    req.url = orig;
  }
  return app(req, res);
}
