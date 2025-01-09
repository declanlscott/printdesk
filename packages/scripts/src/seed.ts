import { db } from "@printworks/core/drizzle";
import { replicacheMetaTable } from "@printworks/core/replicache/sql";
import { Constants } from "@printworks/core/utils/constants";

async function seed() {
  await db.insert(replicacheMetaTable).values({
    key: "schemaVersion",
    value: Constants.DB_SCHEMA_VERSION,
  });
}

async function main() {
  console.log("🌱 Seeding database ...");

  try {
    await seed();
    console.log("✅ Seeding completed!");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  }
}

void main();
