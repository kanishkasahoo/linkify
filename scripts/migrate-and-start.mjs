import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getDatabaseUrl = () => {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    "postgres://linkify:linkify@localhost:5432/linkify"
  );
};

const waitForDatabase = async (sql) => {
  const maxAttempts = Number(process.env.DB_MIGRATION_ATTEMPTS ?? 30);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sql`select 1`;
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      console.log(`Waiting for database (${attempt}/${maxAttempts})...`);
      await sleep(1000);
    }
  }
};

const splitStatements = (contents) =>
  contents
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

const runMigrations = async () => {
  const sql = postgres(getDatabaseUrl(), {
    max: 1,
    onnotice: () => {},
    prepare: false,
  });

  try {
    await waitForDatabase(sql);
    await sql`create schema if not exists drizzle`;
    await sql`
      create table if not exists drizzle.__linkify_migrations (
        id text primary key,
        applied_at timestamp with time zone not null default now()
      )
    `;

    const migrationsDir = path.join(process.cwd(), "src/db/migrations");
    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const existing = await sql`
        select id from drizzle.__linkify_migrations where id = ${file}
      `;
      if (existing.length > 0) {
        continue;
      }

      console.log(`Applying migration ${file}`);
      const contents = await readFile(path.join(migrationsDir, file), "utf8");
      await sql.begin(async (tx) => {
        for (const statement of splitStatements(contents)) {
          await tx.unsafe(statement);
        }
        await tx`
          insert into drizzle.__linkify_migrations (id) values (${file})
        `;
      });
    }
  } finally {
    await sql.end();
  }
};

await runMigrations();

const server = spawn(
  "pnpm",
  ["exec", "react-router-serve", "./build/server/index.js"],
  {
    stdio: "inherit",
  },
);

const stopServer = (signal) => {
  server.kill(signal);
};

process.once("SIGINT", stopServer);
process.once("SIGTERM", stopServer);

const exitCode = await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.once("exit", (code, signal) => {
    if (signal) {
      resolve(128);
      return;
    }
    resolve(code ?? 0);
  });
});

process.exitCode = exitCode;
