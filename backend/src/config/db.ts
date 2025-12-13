import mongoose from 'mongoose';
import { ENV } from './env';

export const connectDB = async () => {
  try {
    await mongoose.connect(ENV.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed');
    process.exit(1);
  }
};
export default connectDB ;