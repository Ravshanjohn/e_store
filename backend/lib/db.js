import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const db_server = await mongoose.connect(process.env.MONGO_DB_URI);
    console.log(`Mongo DB connected: ${db_server.connection.host}`);
  } catch(err){
    console.error("Erron with connection db(db.js):", err.message);
    process.exit(1);
  }
};