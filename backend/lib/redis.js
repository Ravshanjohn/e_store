import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

export const redis = new Redis(process.env.UPSTASH_REDIS_URL, {
  tls: {},               
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    return Math.min(times * 100, 2000); 
  },
  reconnectOnError(err) {
    return err.message.includes("ECONNRESET");
  },
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});


