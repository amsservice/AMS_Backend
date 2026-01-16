import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ENV } from "./config/env";


//  import auth routes
import authRoutes from "./routes/auth.routes";
import schoolRoutes from "./routes/school.routes";
import sessionRoutes from "./routes/session.routes";
import classRoutes from "./routes/class.routes";
import teacherRoutes from "./routes/teacher.routes";
import studentRoutes from "./routes/student.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import paymentRoutes from "./routes/payment.routes"; 
import holidayRoutes from './routes/holiday.routes';
import contactRoutes from './routes/contact.routes';
import adminDbRoutes from './routes/adminDb.routes';
dotenv.config();

const app = express();

// CORS configuration based on environment
const corsOptions = {
  origin: ENV.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001']
    : ENV.FRONTEND_URL 
      ? [ENV.FRONTEND_URL] 
      : [],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Middlewares
app.use(express.json());

//  Mount routes
app.get("/", (req, res) => {
  res.json({status:"success",message:"This is where the magic happens ✨"});
})
app.use("/api/auth", authRoutes);
app.use("/api/school",schoolRoutes);
app.use("/api/session",sessionRoutes);
app.use("/api/class",classRoutes);
app.use("/api/teacher",teacherRoutes);
app.use("/api/student",studentRoutes);
app.use("/api/subscription",subscriptionRoutes);
app.use("/api/payment",paymentRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin/db', adminDbRoutes);



export default app;
