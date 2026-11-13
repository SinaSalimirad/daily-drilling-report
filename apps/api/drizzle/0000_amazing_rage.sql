CREATE TYPE "public"."product_origin" AS ENUM('foreign', 'local');--> statement-breakpoint
CREATE TYPE "public"."product_unit" AS ENUM('BB', 'bbl', 'DR', 'gal', 'kg', 'l', 'lb', 'm³', 'm x m', 'ton');--> statement-breakpoint
CREATE TYPE "public"."currency_code" AS ENUM('USD', 'GBP', 'EUR', 'CNY', 'IRR');--> statement-breakpoint
CREATE TYPE "public"."rig_type" AS ENUM('offshore', 'onshore');--> statement-breakpoint
CREATE TYPE "public"."wells_designationEnum" AS ENUM('exploration', 'cuttings', 're-injection', 'work-over', 'repairing', 're-entry', 'new leg', 'perforation', 'plugging');--> statement-breakpoint
CREATE TYPE "public"."well_type" AS ENUM('Directional', 'Vertical');--> statement-breakpoint
CREATE TABLE "inventories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"report_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"init" integer DEFAULT 0 NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"received" integer DEFAULT 0 NOT NULL,
	"returned" integer DEFAULT 0 NOT NULL,
	"unit_price" numeric(12, 3),
	"note" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_report_id_product_id_unique" UNIQUE("report_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"size" numeric(12, 3) NOT NULL,
	"unit" "product_unit" NOT NULL,
	"width" numeric(12, 3),
	"height" numeric(12, 3),
	"specific_gravity" numeric(12, 3),
	"origin" "product_origin" NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_name_size_unit_unique" UNIQUE("name","size","unit"),
	CONSTRAINT "products_width_height_pair" CHECK (("products"."width" IS NULL) = ("products"."height" IS NULL)),
	CONSTRAINT "products_size_positive" CHECK ("products"."size" > 0),
	CONSTRAINT "products_width_positive" CHECK ("products"."width" > 0),
	CONSTRAINT "products_height_positive" CHECK ("products"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"operators" varchar(255)[] NOT NULL,
	"contractors" varchar(255)[] NOT NULL,
	"field" varchar(255) NOT NULL,
	"rig_name" varchar(255) NOT NULL,
	"rig_type" "rig_type" NOT NULL,
	"currency_code" "currency_code" NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_name_unique" UNIQUE("name"),
	CONSTRAINT "projects_operators_count_check" CHECK (cardinality("projects"."operators") BETWEEN 1 AND 2),
	CONSTRAINT "projects_contractors_count_check" CHECK (cardinality("projects"."contractors") BETWEEN 1 AND 2)
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"well_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"report_number" integer NOT NULL,
	"date" date NOT NULL,
	"operator_reporter" varchar(255) NOT NULL,
	"contractor_reporter" varchar(255) NOT NULL,
	"well_status" varchar(255) NOT NULL,
	"mud_type" varchar(255) NOT NULL,
	"present_activity" varchar(255) NOT NULL,
	"bit_depth" numeric(12, 3) NOT NULL,
	"total_depth" numeric(12, 3) NOT NULL,
	"tvd" numeric(12, 3) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_well_id_date_unique" UNIQUE("well_id","date"),
	CONSTRAINT "reports_well_id_report_number_unique" UNIQUE("well_id","report_number")
);
--> statement-breakpoint
CREATE TABLE "section" (
	"id" uuid PRIMARY KEY NOT NULL,
	"well_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sections_well_id_name_unique" UNIQUE("well_id","name"),
	CONSTRAINT "sections_well_id_sequence_unique" UNIQUE("well_id","sequence"),
	CONSTRAINT "sections_id_well_id_unique" UNIQUE("id","well_id")
);
--> statement-breakpoint
CREATE TABLE "wells" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"designation" "wells_designationEnum" NOT NULL,
	"spud_date" date NOT NULL,
	"well_type" "well_type" NOT NULL,
	"rig_name" varchar(255) NOT NULL,
	"rig_type" "rig_type" NOT NULL,
	"water_depth" numeric(12, 3),
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wells_project_id_name_unique" UNIQUE("project_id","name"),
	CONSTRAINT "wells_id_project_id_unique" UNIQUE("id","project_id"),
	CONSTRAINT "wells_water_depth_check" CHECK ("wells"."water_depth" IS NULL OR "wells"."water_depth" > 0)
);
--> statement-breakpoint
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_section_same_well_fk" FOREIGN KEY ("section_id","well_id") REFERENCES "public"."section"("id","well_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wells" ADD CONSTRAINT "wells_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;