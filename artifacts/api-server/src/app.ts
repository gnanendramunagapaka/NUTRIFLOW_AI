import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const isDev = process.env["NODE_ENV"] !== "production";

if (isDev) {
  const VITE_PORT = 5173;
  app.use((req: Request, res: Response) => {
    const options = {
      hostname: "localhost",
      port: VITE_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${VITE_PORT}` },
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    proxyReq.on("error", () => {
      if (!res.headersSent) {
        res.status(502).send("Vite dev server not ready — please wait a moment and refresh.");
      }
    });
    req.pipe(proxyReq, { end: true });
  });
} else {
  const distDir = path.resolve(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "artifacts",
    "nutriflow",
    "dist",
    "public",
  );
  app.use(express.static(distDir));
  app.use((_req: Request, res: Response) => {
    const index = path.join(distDir, "index.html");
    if (fs.existsSync(index)) {
      res.sendFile(index);
    } else {
      res.status(404).send("Frontend not built.");
    }
  });
}

export default app;
