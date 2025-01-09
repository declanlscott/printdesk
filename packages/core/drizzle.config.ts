import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

export default defineConfig({
  schema: "./src/**/sql.ts",
  out: "../../migrations/",
  dialect: "postgresql",
  dbCredentials: {
    host: Resource.DsqlCluster.hostname,
    port: Resource.DsqlCluster.port,
    database: Resource.DsqlCluster.database,
    user: Resource.DsqlCluster.user,
    password: process.env.DB_PASSWORD,
    ssl: Resource.DsqlCluster.ssl,
  },
});
