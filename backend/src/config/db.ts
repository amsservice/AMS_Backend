import mongoose from 'mongoose';
import { ENV } from './env';

import { Counter } from '../models/Counter';

async function initCounters() {
  await Counter.updateOne(
    { name: 'schoolCode' },
    { $setOnInsert: { seq: 1000 } }, // 👈 START BEFORE 1001
    { upsert: true }
  );
}

export const connectDB = async () => {
  try {
    await mongoose.connect(ENV.MONGO_URI);

    console.log(' MongoDB is connected');
    // ✅ INITIALIZE COUNTERS AFTER DB CONNECTION
    await initCounters();
  } catch (error) {
    console.error(' MongoDB connection failed');
    process.exit(1);
  }
};
export default connectDB ;