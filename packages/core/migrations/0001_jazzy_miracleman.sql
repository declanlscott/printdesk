CREATE TABLE "oauth2_provider_user_groups" (
	"group_id" text NOT NULL,
	"oauth2_provider_id" text NOT NULL,
	"tenant_id" char(20) NOT NULL,
	CONSTRAINT "oauth2_provider_user_groups_group_id_oauth2_provider_id_tenant_id_pk" PRIMARY KEY("group_id","oauth2_provider_id","tenant_id")
);
