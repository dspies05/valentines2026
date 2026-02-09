const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 3001;

app.disable("x-powered-by");

const allowedOrigins = ["http://monne-sond-und-terne.de", "https://monne-sond-und-terne.de"];
const corsOptions = {
  origin(origin, cb) {
    if (!origin) {
      return cb(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error("CORS blocked."));
  },
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  return next();
});

const writeApiKey = process.env.WRITE_API_KEY || null;
const requireWriteKey = (req, res, next) => {
  if (!writeApiKey) {
    return next();
  }
  const provided = req.get("x-api-key");
  if (provided && provided === writeApiKey) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized." });
};

const dbPath = process.env.DB_PATH || path.resolve(__dirname, "../www/data/book.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath);

const uploadsDir = path.resolve(__dirname, "../www/uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
    const safeExt = allowedExt.includes(ext) ? ext : "";
    cb(null, `${Date.now()}-${crypto.randomUUID()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("Only image uploads are allowed."));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.post("/api/images", requireWriteKey, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  const urlPath = `/uploads/${req.file.filename}`;
  const location = `${req.protocol}://${req.get("host")}${urlPath}`;
  return res.status(200).json({ location });
});

app.use((err, req, res, next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Image exceeds size limit." });
  }
  if (err?.message === "Only image uploads are allowed.") {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(500).json({ error: "Upload failed." });
  }
  return next();
});

db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS pages (page_index INTEGER PRIMARY KEY, html TEXT NOT NULL, updated_at INTEGER NOT NULL)"
  );
});

app.get("/api/pages", (req, res) => {
  db.all(
    "SELECT page_index as pageIndex, html, updated_at as updatedAt FROM pages ORDER BY page_index",
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch pages." });
      }
      return res.json({ pages: rows });
    }
  );
});

app.get("/api/pages/:index", (req, res) => {
  const pageIndex = Number(req.params.index);
  if (Number.isNaN(pageIndex)) {
    return res.status(400).json({ error: "Invalid page index." });
  }

  db.get(
    "SELECT page_index as pageIndex, html, updated_at as updatedAt FROM pages WHERE page_index = ?",
    [pageIndex],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch page." });
      }
      if (!row) {
        return res.status(404).json({ error: "Page not found." });
      }
      return res.json(row);
    }
  );
});

app.post("/api/pages", requireWriteKey, (req, res) => {
  const pageIndex = Number(req.body?.pageIndex);
  const html = req.body?.html;

  if (Number.isNaN(pageIndex) || typeof html !== "string") {
    return res.status(400).json({ error: "pageIndex and html are required." });
  }

  const updatedAt = Date.now();
  db.run(
    "INSERT INTO pages (page_index, html, updated_at) VALUES (?, ?, ?) ON CONFLICT(page_index) DO UPDATE SET html = excluded.html, updated_at = excluded.updated_at",
    [pageIndex, html, updatedAt],
    (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to save page." });
      }
      return res.status(200).json({ pageIndex, html, updatedAt });
    }
  );
});

app.put("/api/pages", requireWriteKey, (req, res) => {
  const pages = Array.isArray(req.body?.pages) ? req.body.pages : null;
  if (!pages) {
    return res.status(400).json({ error: "pages must be an array." });
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    db.run("DELETE FROM pages");

    const stmt = db.prepare(
      "INSERT INTO pages (page_index, html, updated_at) VALUES (?, ?, ?) ON CONFLICT(page_index) DO UPDATE SET html = excluded.html, updated_at = excluded.updated_at"
    );

    const updatedAt = Date.now();
    for (const page of pages) {
      const pageIndex = Number(page?.pageIndex);
      const html = page?.html;
      if (Number.isNaN(pageIndex) || typeof html !== "string") {
        db.run("ROLLBACK");
        stmt.finalize();
        return res.status(400).json({ error: "Each page must have pageIndex and html." });
      }
      stmt.run(pageIndex, html, updatedAt);
    }

    stmt.finalize((finalizeErr) => {
      if (finalizeErr) {
        db.run("ROLLBACK");
        return res.status(500).json({ error: "Failed to save pages." });
      }
      db.run("COMMIT");
      return res.status(200).json({ pagesSaved: pages.length });
    });
  });
});

app.listen(port, () => {
  console.log(`SQLite API running on http://localhost:${port}`);
});
