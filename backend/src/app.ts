import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from 'mongoose';


dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;

  res.status(200).json({
    status: 'OK',
    server: 'running',
    db:
      dbState === 1
        ? 'connected'
        : dbState === 2
        ? 'connecting'
        : 'disconnected'
  });
});

export default app;
