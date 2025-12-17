import express from "express";
import cors from "cors";
import dotenv from "dotenv";


//  import auth routes
import authRoutes from "./routes/auth.routes";
import schoolRoutes from "./routes/school.routes";
import sessionRoutes from "./routes/session.routes";
import classRoutes from "./routes/class.routes";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

//  Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/school",schoolRoutes);
app.use("/api/session",sessionRoutes);
app.use("/api/class",classRoutes);



export default app;
