import "dotenv/config";

const secretKey = process.env.CHAPA_SECRET_KEY;
if (!secretKey) {
  throw new Error("CHAPA_SECRET_KEY must be configured in environment");
}

const baseUrl = (process.env.CHAPA_BASE_URL || "https://api.chapa.co/v1").replace(/\/+$/, "");
const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET || secretKey;
const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
const serverUrl = (process.env.SERVER_URL || "http://localhost:5000").replace(/\/+$/, "");

export const chapaConfig = Object.freeze({
  secretKey,
  baseUrl,
  webhookSecret,
  clientUrl,
  serverUrl,
});
