require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Missing MONGODB_URI. Add it to .env or your shell environment.");
  process.exit(1);
}

async function verifyMongoDb() {
  try {
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.admin().ping();
    console.log("MongoDB connection verified.");
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

verifyMongoDb();
