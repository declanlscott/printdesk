ALTER TABLE "tenants" RENAME COLUMN "slug" TO "subdomain";--> statement-breakpoint
DROP INDEX "tenants_slug_index";--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC "tenants_subdomain_index" ON "tenants" ("subdomain");