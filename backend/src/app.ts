import express from "express";
import cors from "cors";
import dotenv from "dotenv";


//  import auth routes
import authRoutes from "./routes/auth.routes";
import schoolRoutes from "./routes/school.routes"

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

//  Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/school",schoolRoutes);



export default app;
