ALTER TABLE "oauth2_providers" RENAME COLUMN "type" TO "kind";--> statement-breakpoint
ALTER TABLE "billing_accounts" RENAME COLUMN "type" TO "origin";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "type" TO "origin";--> statement-breakpoint
DROP INDEX "billing_accounts_type_name_papercutAccountId_tenant_id_index";--> statement-breakpoint
DROP INDEX "users_type_username_tenant_id_index";--> statement-breakpoint
ALTER TABLE "tenant_metadata" ADD COLUMN "last_papercut_sync_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_accounts_origin_name_papercutAccountId_tenant_id_index" ON "billing_accounts" USING btree ("origin","name","papercutAccountId","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_origin_username_tenant_id_index" ON "users" USING btree ("origin","username","tenant_id");