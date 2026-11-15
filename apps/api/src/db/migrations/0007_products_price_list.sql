CREATE TYPE "product_origin" AS ENUM('foreign', 'local');--> statement-breakpoint
CREATE TYPE "product_unit" AS ENUM('kg', 'lb', 't', 'gal', 'l', 'm3', 'bbl');--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"package_size" double precision NOT NULL,
	"package_unit" "product_unit" NOT NULL,
	"specific_gravity" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "products_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "project_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"origin" "product_origin" NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "project_products_project_id_product_id_unique" UNIQUE("project_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "project_products" ADD CONSTRAINT "project_products_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_products" ADD CONSTRAINT "project_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE restrict ON UPDATE no action;