ALTER TABLE "oauth2_provider_user_groups" RENAME TO "identity_provider_user_groups";--> statement-breakpoint
ALTER TABLE "oauth2_providers" RENAME TO "identity_providers";--> statement-breakpoint
ALTER TABLE "identity_provider_user_groups" RENAME COLUMN "oauth2_provider_id" TO "identity_provider_id";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "oauth2_user_id" TO "subject_id";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "oauth2_provider_id" TO "identity_provider_id";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_oauth2_user_id_tenant_id_unique";--> statement-breakpoint
DROP INDEX "oauth2_providers_id_index";--> statement-breakpoint
DROP INDEX "users_oauth2_user_id_index";--> statement-breakpoint
DROP INDEX "users_oauth2_provider_id_index";--> statement-breakpoint
ALTER TABLE "identity_provider_user_groups" DROP CONSTRAINT "oauth2_provider_user_groups_group_id_oauth2_provider_id_tenant_id_pk";--> statement-breakpoint
ALTER TABLE "identity_providers" DROP CONSTRAINT "oauth2_providers_id_tenant_id_pk";--> statement-breakpoint
ALTER TABLE "identity_provider_user_groups" ADD CONSTRAINT "identity_provider_user_groups_group_id_identity_provider_id_tenant_id_pk" PRIMARY KEY("group_id","identity_provider_id","tenant_id");--> statement-breakpoint
ALTER TABLE "identity_providers" ADD CONSTRAINT "identity_providers_id_tenant_id_pk" PRIMARY KEY("id","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC "identity_providers_id_index" ON "identity_providers" ("id");--> statement-breakpoint
CREATE INDEX ASYNC "users_subject_id_index" ON "users" ("subject_id");--> statement-breakpoint
CREATE INDEX ASYNC "users_identity_provider_id_index" ON "users" ("identity_provider_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_subject_id_tenant_id_unique" UNIQUE("subject_id","tenant_id");