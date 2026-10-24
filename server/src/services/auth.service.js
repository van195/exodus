import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

const safeUserFields = {
  id: users.id,
  fullName: users.fullName,
  email: users.email,
  phone: users.phone,
  role: users.role,
  createdAt: users.createdAt,
};
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("timing-only-not-a-real-account", authConfig.bcryptRounds);

export class AuthError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function toSafeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
  };
}

function generateToken(user) {
  return jwt.sign(
    { role: user.role },
    authConfig.jwtSecret,
    { algorithm: "HS256", subject: user.id, expiresIn: authConfig.jwtExpiresIn },
  );
}

export async function registerUser(input) {
  const passwordHash = await bcrypt.hash(input.password, authConfig.bcryptRounds);
  try {
    const [user] = await db.insert(users).values({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      phone: input.phone,
      role: input.role,
    }).onConflictDoNothing({ target: users.email }).returning(safeUserFields);

    if (!user) throw new AuthError("An account with this email already exists.", 409, "EMAIL_ALREADY_REGISTERED");
    return { token: generateToken(user), user: toSafeUser(user) };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if (error?.code === "23505") {
      throw new AuthError("An account with this email already exists.", 409, "EMAIL_ALREADY_REGISTERED");
    }
    console.error("Registration database operation failed", {
      code: typeof error?.code === "string" ? error.code : null,
    });
    throw new AuthError("Registration could not be completed.", 500, "REGISTRATION_FAILED");
  }
}

export async function loginUser(input) {
  let user;
  try {
    [user] = await db.select({
      ...safeUserFields,
      passwordHash: users.passwordHash,
    }).from(users).where(eq(users.email, input.email)).limit(1);
  } catch (error) {
    console.error("Login database operation failed", {
      code: typeof error?.code === "string" ? error.code : null,
    });
    throw new AuthError("Login could not be completed.", 500, "LOGIN_FAILED");
  }

  const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  if (!user || !passwordMatches) {
    throw new AuthError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  return { token: generateToken(user), user: toSafeUser(user) };
}

export async function getCurrentUser(userId) {
  try {
    const [user] = await db.select(safeUserFields).from(users).where(eq(users.id, userId)).limit(1);
    return user ? toSafeUser(user) : null;
  } catch (error) {
    console.error("Current-user database operation failed", {
      code: typeof error?.code === "string" ? error.code : null,
    });
    throw new AuthError("Could not retrieve the current user.", 500, "CURRENT_USER_FAILED");
  }
}

export async function getUserRole(userId) {
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.role || null;
}
