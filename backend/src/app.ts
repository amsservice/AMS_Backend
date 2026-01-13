import express from "express";
import cors from "cors";
import dotenv from "dotenv";


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
dotenv.config();

const app = express();




app.use(
  cors({
    origin: "*", // ✅ OK now
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
// Middlewares
// app.use(cors());
app.use(express.json());

//  Mount routes
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



export default app;
