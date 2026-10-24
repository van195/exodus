import "dotenv/config";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 bytes of random data");
}

const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "15m";
if (!/^\d+[smhd]$/.test(jwtExpiresIn)) {
  throw new Error("JWT_EXPIRES_IN must use a duration such as 15m or 1h");
}

const bcryptRounds = Number(process.env.BCRYPT_ROUNDS || 12);
if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
  throw new Error("BCRYPT_ROUNDS must be an integer between 10 and 15");
}

export const authConfig = Object.freeze({ jwtSecret, jwtExpiresIn, bcryptRounds });
