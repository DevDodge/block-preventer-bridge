import express from "express";
import { createServer, request as httpRequest } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Proxy /api and /health requests to the FastAPI backend
  app.use(["/api", "/health"], (req, res) => {
    const url = new URL(req.originalUrl, BACKEND_URL);
    const proxyReq = httpRequest(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: req.method,
        headers: { ...req.headers, host: url.host },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on("error", (err) => {
      console.error("Proxy error:", err.message);
      res.status(502).json({ detail: "Backend unavailable" });
    });
    req.pipe(proxyReq);
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
