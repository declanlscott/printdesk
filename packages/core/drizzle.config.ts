import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

export default defineConfig({
  schema: "./src/**/sql.ts",
  out: "./migrations/",
  dialect: "postgresql",
  dbCredentials: {
    ...Resource.DsqlCluster,
    password: process.env.DB_PASSWORD,
  },
});
