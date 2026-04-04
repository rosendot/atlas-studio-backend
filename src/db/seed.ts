import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedFile = path.join(__dirname, "seeds", "dev.sql");

async function seed() {
  const sql = fs.readFileSync(seedFile, "utf-8");
  await pool.query(sql);
  console.log("Seed data inserted.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
