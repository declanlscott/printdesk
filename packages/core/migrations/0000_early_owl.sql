CREATE TABLE "announcements" (
	"id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"content" text NOT NULL,
	"room_id" char(20) NOT NULL,
	CONSTRAINT "announcements_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "identity_provider_user_groups" (
	"group_id" text NOT NULL,
	"identity_provider_id" text NOT NULL,
	"tenant_id" char(20) NOT NULL,
	CONSTRAINT "identity_provider_user_groups_group_id_identity_provider_id_tenant_id_pk" PRIMARY KEY("group_id","identity_provider_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "identity_providers" (
	"id" text NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"kind" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "identity_providers_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "billing_account_customer_authorizations" (
	"id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"customer_id" char(20) NOT NULL,
	"billing_account_id" char(20) NOT NULL,
	CONSTRAINT "billing_account_customer_authorizations_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "billing_account_manager_authorizations" (
	"id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"manager_id" char(20) NOT NULL,
	"billing_account_id" char(20) NOT NULL,
	CONSTRAINT "billing_account_manager_authorizations_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "billing_accounts" (
	"id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"origin" varchar(50) DEFAULT 'internal' NOT NULL,
	"name" text NOT NULL,
	"review_threshold" numeric,
	"papercutAccountId" bigint DEFAULT -1 NOT NULL,
	CONSTRAINT "billing_accounts_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"order_id" char(20) NOT NULL,
	"author_id" char(20) NOT NULL,
	"content" text NOT NULL,
	"visible_to" text NOT NULL,
	CONSTRAINT "comments_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"line_items" "bytea" NOT NULL,
	"status" varchar(50) DEFAULT 'processing' NOT NULL,
	"charged_at" timestamp,
	"order_id" char(20) NOT NULL,
	CONSTRAINT "invoices_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"customer_id" char(20) NOT NULL,
	"manager_id" char(20),
	"operator_id" char(20),
	"product_id" char(20) NOT NULL,
	"billing_account_id" char(20) NOT NULL,
	"attributes" "bytea" NOT NULL,
	"workflow_status" varchar(40) NOT NULL,
	"deliver_to" varchar(40) NOT NULL,
	"approved_at" timestamp,
	CONSTRAINT "orders_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(40) NOT NULL,
	"status" varchar(50) NOT NULL,
	"room_id" char(20) NOT NULL,
	"config" "bytea" NOT NULL,
	CONSTRAINT "products_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "replicache_client_groups" (
	"id" uuid NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"user_id" char(20) NOT NULL,
	"cvr_version" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "replicache_client_groups_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "replicache_client_views" (
	"tenant_id" char(20) NOT NULL,
	"client_group_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"record" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "replicache_client_views_client_group_id_version_tenant_id_pk" PRIMARY KEY("client_group_id","version","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "replicache_clients" (
	"id" uuid NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"client_group_id" uuid NOT NULL,
	"last_mutation_id" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "replicache_clients_id_tenant_id_pk" PRIMARY KEY("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "replicache_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_options" (
	"name" varchar(40) NOT NULL,
	"description" varchar(40) NOT NULL,
	"details_label" varchar(40),
	"cost" numeric,
	"index" smallint NOT NULL,
	"room_id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "delivery_options_name_room_id_tenant_id_pk" PRIMARY KEY("name","room_id","tenant_id"),
	CONSTRAINT "delivery_options_index_room_id_unique" UNIQUE("index","room_id")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(40) NOT NULL,
	"status" varchar(50) NOT NULL,
	"details" text,
	CONSTRAINT "rooms_id_tenant_id_pk" PRIMARY KEY("id","tenant_id"),
	CONSTRAINT "rooms_name_tenant_id_unique" UNIQUE("name","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_statuses" (
	"name" varchar(40) NOT NULL,
	"type" varchar(50) NOT NULL,
	"charging" boolean NOT NULL,
	"color" varchar(9),
	"index" smallint NOT NULL,
	"room_id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "workflow_statuses_name_room_id_tenant_id_pk" PRIMARY KEY("name","room_id","tenant_id"),
	CONSTRAINT "workflow_statuses_index_room_id_unique" UNIQUE("index","room_id")
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"key" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" char(20),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	CONSTRAINT "licenses_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_metadata" (
	"tenant_id" char(20) PRIMARY KEY NOT NULL,
	"infra_program_input" "bytea" NOT NULL,
	"api_key" varchar,
	"last_papercut_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" char(20) PRIMARY KEY NOT NULL,
	"subdomain" varchar(40) NOT NULL,
	"name" varchar(40) NOT NULL,
	"status" varchar(50) DEFAULT 'setup' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" char(20) NOT NULL,
	"tenant_id" char(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"origin" varchar(50) DEFAULT 'internal' NOT NULL,
	"username" text NOT NULL,
	"subject_id" text NOT NULL,
	"identity_provider_id" text NOT NULL,
	"role" varchar(50) DEFAULT 'customer' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "users_id_tenant_id_pk" PRIMARY KEY("id","tenant_id"),
	CONSTRAINT "users_subject_id_tenant_id_unique" UNIQUE("subject_id","tenant_id"),
	CONSTRAINT "users_email_tenant_id_unique" UNIQUE("email","tenant_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC "identity_providers_id_index" ON "identity_providers" ("id");--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC "billing_account_customer_authorizations_customer_id_billing_account_id_tenant_id_index" ON "billing_account_customer_authorizations" ("customer_id","billing_account_id","tenant_id");--> statement-breakpoint
CREATE INDEX ASYNC "billing_account_customer_authorizations_customer_id_index" ON "billing_account_customer_authorizations" ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC "billing_account_manager_authorizations_billing_account_id_manager_id_tenant_id_index" ON "billing_account_manager_authorizations" ("billing_account_id","manager_id","tenant_id");--> statement-breakpoint
CREATE INDEX ASYNC "billing_account_manager_authorizations_manager_id_index" ON "billing_account_manager_authorizations" ("manager_id");--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC "billing_accounts_origin_name_papercutAccountId_tenant_id_index" ON "billing_accounts" ("origin","name","papercutAccountId","tenant_id");--> statement-breakpoint
CREATE INDEX ASYNC "comments_order_id_index" ON "comments" ("order_id");--> statement-breakpoint
CREATE INDEX ASYNC "comments_visible_to_index" ON "comments" ("visible_to");--> statement-breakpoint
CREATE INDEX ASYNC "invoices_order_id_index" ON "invoices" ("order_id");--> statement-breakpoint
CREATE INDEX ASYNC "orders_customer_id_index" ON "orders" ("customer_id");--> statement-breakpoint
CREATE INDEX ASYNC "orders_billing_account_id_index" ON "orders" ("billing_account_id");--> statement-breakpoint
CREATE INDEX ASYNC "products_status_index" ON "products" ("status");--> statement-breakpoint
CREATE INDEX ASYNC "products_room_id_index" ON "products" ("room_id");--> statement-breakpoint
CREATE INDEX ASYNC "replicache_client_groups_updated_at_index" ON "replicache_client_groups" ("updated_at");--> statement-breakpoint
CREATE INDEX ASYNC "replicache_client_views_updated_at_index" ON "replicache_client_views" ("updated_at");--> statement-breakpoint
CREATE INDEX ASYNC "replicache_clients_client_group_id_index" ON "replicache_clients" ("client_group_id");--> statement-breakpoint
CREATE INDEX ASYNC "replicache_clients_updated_at_index" ON "replicache_clients" ("updated_at");--> statement-breakpoint
CREATE INDEX ASYNC "rooms_status_index" ON "rooms" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC "tenants_subdomain_index" ON "tenants" ("subdomain");--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC "users_origin_username_tenant_id_index" ON "users" ("origin","username","tenant_id");--> statement-breakpoint
CREATE INDEX ASYNC "users_subject_id_index" ON "users" ("subject_id");--> statement-breakpoint
CREATE INDEX ASYNC "users_identity_provider_id_index" ON "users" ("identity_provider_id");--> statement-breakpoint
CREATE INDEX ASYNC "users_role_index" ON "users" ("role");