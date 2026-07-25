import "dotenv/config"; // prisma.config.ts disables auto .env loading; load it explicitly
import path from "node:path";
import { defineConfig } from "prisma/config";

// Replaces the deprecated `package.json#prisma` block (removed in Prisma 7).
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
