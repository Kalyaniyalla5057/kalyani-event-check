import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const resolveSrv = (hostname) =>
  new Promise((resolve, reject) => {
    dns.resolveSrv(`_mongodb._tcp.${hostname}`, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses);
    });
  });

export const dbConnection = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not configured");
  }

  try {
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: "majority",
    });

    return onConnected(connection);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

function onConnected(connection) {
  const db = connection.connection.db.databaseName;
  const host = connection.connection.host;
  console.log(`✅ MongoDB connected — ${db} @ ${host}`);

  mongoose.connection.on("error", (err) => console.error("❌ DB error:", err.message));
  mongoose.connection.on("disconnected", () => console.warn("⚠️  DB disconnected"));
  mongoose.connection.on("reconnected", () => console.log("🔄 DB reconnected"));

  // Auto-migrate: fix legacy rating fields stored as numbers
  import("../models/eventSchema.js").then(({ Event }) => {
    Event.updateMany(
      { $or: [{ rating: { $type: "number" } }, { rating: null }, { rating: { $exists: false } }] },
      { $set: { rating: { average: 0, totalRatings: 0 } } }
    ).then(result => {
      if (result.modifiedCount > 0) {
        console.log(`🔧 Migrated ${result.modifiedCount} event(s): rating field fixed`);
      }
    }).catch(err => console.error("⚠️  Rating migration error:", err.message));
  });

  return connection;
}
