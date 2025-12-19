import mongoose from "mongoose";
import { createClient } from '@supabase/supabase-js';

const databaseUrl = process.env.DATABASE_URL;
const databaseKey = process.env.DATABASE_KEY;

export const database = (databaseUrl && databaseKey)
  ? createClient(databaseUrl, databaseKey)
  : {
      from() {
        throw new Error(
          'Database is not configured. Set DATABASE_URL and DATABASE_KEY in your environment.'
        );
      },
    };

export const connectDB = async () => {
  try {
    const db_server = await mongoose.connect(process.env.MONGO_DB_URI);
    console.log(`Mongo DB connected: ${db_server.connection.host}`);
  } catch(err){
    console.error("Error with connection db(db.js):", err.message);
    process.exit(1);
  }
}; 

