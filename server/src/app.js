import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import fileRoutes from "./routes/file.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import payoutRoutes from "./routes/payout.routes.js";

const app = express();

app.use(cors());

// Retain raw request buffer for HMAC SHA-256 webhook signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payouts", payoutRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Trust Payment API is running"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

export default app;
