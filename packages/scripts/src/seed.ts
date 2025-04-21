import { db } from "@printdesk/core/drizzle";
import { replicacheMetaTable } from "@printdesk/core/replicache/sql";
import { Constants } from "@printdesk/core/utils/constants";

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
