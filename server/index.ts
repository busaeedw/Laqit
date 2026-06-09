import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { registerRoutes } from "./routes";
import { seedIfEmpty, dedupeCities } from "./seed";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "50mb" }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function getSeoLandingHtml(req: Request): string {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;

  const templatePath = path.resolve(process.cwd(), "server", "templates", "seo-landing.html");
  const template = fs.readFileSync(templatePath, "utf-8");
  return template.replace(/BASE_URL_PLACEHOLDER/g, baseUrl);
}

function configureExpoAndLanding(app: express.Application) {
  const isDev = process.env.NODE_ENV === "development";

  log("Serving static Expo files with dynamic manifest routing");

  // robots.txt — must appear before static file serving so it is never
  // shadowed by a missing file falling through to the SPA catch-all.
  app.get("/robots.txt", (req: Request, res: Response) => {
    const forwardedProto = req.header("x-forwarded-proto");
    const protocol = forwardedProto || req.protocol || "https";
    const forwardedHost = req.header("x-forwarded-host");
    const host = forwardedHost || req.get("host");
    const baseUrl = `${protocol}://${host}`;

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(
      `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
  });

  // sitemap.xml — canonical public URLs for the browser-facing site
  app.get("/sitemap.xml", (req: Request, res: Response) => {
    const forwardedProto = req.header("x-forwarded-proto");
    const protocol = forwardedProto || req.protocol || "https";
    const forwardedHost = req.header("x-forwarded-host");
    const host = forwardedHost || req.get("host");
    const baseUrl = `${protocol}://${host}`;
    const now = new Date().toISOString().split("T")[0];

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
      `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
      `  <url>\n` +
      `    <loc>${baseUrl}/</loc>\n` +
      `    <lastmod>${now}</lastmod>\n` +
      `    <changefreq>weekly</changefreq>\n` +
      `    <priority>1.0</priority>\n` +
      `    <xhtml:link rel="alternate" hreflang="ar" href="${baseUrl}/"/>\n` +
      `  </url>\n` +
      `  <url>\n` +
      `    <loc>${baseUrl}/web-app</loc>\n` +
      `    <lastmod>${now}</lastmod>\n` +
      `    <changefreq>monthly</changefreq>\n` +
      `    <priority>0.8</priority>\n` +
      `  </url>\n` +
      `</urlset>\n`
    );
  });

  // Handle native Expo manifest requests (iOS/Android via Expo Go)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));

  if (isDev) {
    // In development: proxy all non-API browser requests to the Expo web dev server
    const expoProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: false,
      ws: true,
      on: {
        error: (_err, _req, res) => {
          (res as Response).status(502).send("Expo web server not ready yet. Please wait a moment and refresh.");
        },
      },
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) return next();
      expoProxy(req, res, next);
    });
  } else {
    // In production: serve the SEO landing page at the root, the Expo SPA
    // under /web-app, and static assets from static-build/web.
    const webDir = path.resolve(process.cwd(), "static-build", "web");

    // Root "/" → pre-rendered Arabic landing page (visible to bots without JS)
    app.get("/", (req: Request, res: Response) => {
      try {
        const html = getSeoLandingHtml(req);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.status(200).send(html);
      } catch {
        // Fallback to Expo SPA if template is missing
        const indexPath = path.join(webDir, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Not found");
        }
      }
    });

    // Serve static assets (JS bundles, images, etc.) from the web build
    app.use(express.static(webDir));

    // "/web-app" and any sub-routes → Expo SPA shell
    app.get("/web-app", (req: Request, res: Response, next: NextFunction) => {
      const indexPath = path.join(webDir, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });

    // All other non-API routes → Expo SPA shell (client-side routing)
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) return next();
      const indexPath = path.join(webDir, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  }

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    res.status(status).json({ message });

    throw err;
  });
}

(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
      // Self-heal reference data on a fresh (e.g. production) database, then
      // repair any duplicate cities left by a prior incident. Non-blocking so
      // it never delays startup or healthchecks.
      seedIfEmpty()
        .then(() => dedupeCities())
        .catch((e) => log("startup data reconcile error", e));
    },
  );
})();
