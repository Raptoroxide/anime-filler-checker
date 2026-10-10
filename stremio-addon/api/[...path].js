/**
 * Vercel Serverless Function — Stremio Addon catch-all handler.
 */

const { getRouter } = require("stremio-addon-sdk");
const builder = require("../lib/addon");

const addonInterface = builder.getInterface();
const router = getRouter(addonInterface);

module.exports = (req, res) => {
  // CORS headers (required by Stremio addon protocol)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Recover the original Stremio path.
  // vercel.json forwards everything to /api/path and passes the
  // original path in the "path" query param — the SDK router only
  // understands clean paths like /manifest.json or /stream/...
  let stremioPath = req.url || "";
  const qIndex = stremioPath.indexOf("?");
  if (qIndex !== -1) {
    const m = stremioPath.slice(qIndex + 1).match(/(?:^|&)path=([^&]*)/);
    if (m) {
      try { stremioPath = decodeURIComponent(m[1]); }
      catch (e) { stremioPath = m[1]; }
    }
  }
  if (stremioPath.startsWith("/api/")) {
    stremioPath = stremioPath.slice(4);
  } else if (stremioPath === "/api") {
    stremioPath = "/";
  }
  req.url = stremioPath;

  // CDN caching
  if (stremioPath.includes("/manifest.json")) {
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  } else if (/\/(stream|subtitles)\//.test(stremioPath)) {
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
  }

  router(req, res, () => {
    res.statusCode = 404;
    res.end(JSON.stringify({ err: "not found" }));
  });
};
