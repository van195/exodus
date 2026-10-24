import "dotenv/config";
import postgres from "postgres";
import { db } from "./src/db/index.js";
import { profiles } from "./src/db/schema.js";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 8 });
try {
  const rows = await sql.unsafe("select to_regclass('public.users') as users_table, to_regclass('public.profiles') as profiles_table");
  console.log(JSON.stringify({ connected: true, usersTable: Boolean(rows[0].users_table), profilesTable: Boolean(rows[0].profiles_table) }));
  try {
    await db.select({ id: profiles.id }).from(profiles).limit(1);
    console.log(JSON.stringify({ profilesReadable: true }));
  } catch (error) {
    console.log(JSON.stringify({ profilesReadable: false, code: error.code || null }));
  }
} catch (error) {
  console.log(JSON.stringify({ connected: false, code: error.code || null }));
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 2 });
}
