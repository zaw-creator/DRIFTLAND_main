import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import connectDB from "./config/database.js";
import createAdminUser from "./utils/createAdminUser.js";
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import adminEventRoutes from "./routes/admin/events.js";
import galleryRoutes from "./routes/gallery.js";
import adminGalleryRoutes from "./routes/admin/gallery.js";
import contactRoutes from "./routes/contact.js";
import {
  checkAndEndEvents,
  cleanupExpiredData,
} from "./utils/eventLifecycle.js";

const app = express();

connectDB().then(() => createAdminUser());

app.use(
  cors({
origin: (origin, callback) => {
  const allowedOrigins = [
    'http://localhost:3000',
    process.env.CLIENT_URL,
  ].filter(Boolean);

  if (!origin || allowedOrigins.includes(origin) ||
      origin.match(/https:\/\/.*\.vercel\.app$/)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
},
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/events", eventRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin/events", adminEventRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/admin/gallery", adminGalleryRoutes);
app.use("/api/contact", contactRoutes);

app.get("/health", (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] Server pinged!`);
  res.json({ status: "OK", message: "Server is running" });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ── Cron jobs ─────────────────────────────────────────────────────────────────
// Auto-end events every 15 minutes
cron.schedule("*/15 * * * *", async () => {
  try {
    await checkAndEndEvents();
  } catch (err) {
    console.error("Cron checkAndEndEvents error:", err.message);
  }
});

// Clean up bulk data daily at 2am
cron.schedule("0 2 * * *", async () => {
  try {
    await cleanupExpiredData();
  } catch (err) {
    console.error("Cron cleanupExpiredData error:", err.message);
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
