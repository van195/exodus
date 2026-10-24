
import express from "express";
import cors from "cors";
import { db } from "./db/index.js";
import { profiles } from "./db/schema.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Trust Payment API is running"
  });
});

const testSupabase = async (req, res) => {
  try {
    await db.select({ id: profiles.id }).from(profiles).limit(1);

    res.json({
      success: true,
      message: "Database connection is working"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
};

app.get(["/api/test-supabase", "/api/test-supabas"], testSupabase);

export default app;
