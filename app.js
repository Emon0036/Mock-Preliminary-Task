require("dotenv").config({ quiet: true });

const express = require("express");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 8080;
const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  (process.env.NODE_ENV === "production" ? "" : "mongodb://127.0.0.1:27017/test");

if (!mongoUri) {
  throw new Error("MONGODB_URI is required when NODE_ENV=production");
}

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello");
});

app.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const database = states[mongoose.connection.readyState] || "unknown";
  const healthy = mongoose.connection.readyState === 1;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    database,
  });
});

let server;
let shuttingDown = false;

async function startServer() {
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");

  server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received. Closing server and MongoDB connection.`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Graceful shutdown failed", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
