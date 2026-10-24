import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);
try {
  const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' and table_name in ('users', 'profiles') order by table_name`;
  const results = {};
  for (const { table_name } of tables) {
    const [count] = await sql`select count(*)::int as count from public.${sql(table_name)}`;
    const columns = await sql`select column_name, data_type, is_nullable from information_schema.columns where table_schema = 'public' and table_name = ${table_name} order by ordinal_position`;
    results[table_name] = { count: count.count, columns };
  }
  const enums = await sql`select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as values from pg_type t join pg_enum e on t.oid = e.enumtypid join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' group by t.typname`;
  console.log(JSON.stringify({ tables: results, enums }));
} finally {
  await sql.end();
}
