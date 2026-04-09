import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Carga .env local (packages/database/.env)
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
