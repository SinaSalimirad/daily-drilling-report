CREATE TYPE "public"."product_origin" AS ENUM('foreign', 'local');--> statement-breakpoint
CREATE TYPE "public"."product_unit" AS ENUM('BB', 'bbl', 'DR', 'gal', 'kg', 'l', 'lb', 'm³', 'm x m', 'ton');--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"size" numeric(12, 3) NOT NULL,
	"unit" "product_unit" NOT NULL,
	"width" numeric(12, 3),
	"height" numeric(12, 3),
	"specific_gravity" numeric(12, 3),
	"origin" "product_origin",
	"price" numeric(12, 3),
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_name_size_unit_unique" UNIQUE("name","size","unit"),
	CONSTRAINT "products_width_height_pair" CHECK (("products"."width" IS NULL) = ("products"."height" IS NULL)),
	CONSTRAINT "products_size_positive" CHECK ("products"."size" > 0),
	CONSTRAINT "products_width_positive" CHECK ("products"."width" > 0),
	CONSTRAINT "products_height_positive" CHECK ("products"."height" > 0),
	CONSTRAINT "products_price_positive" CHECK ("products"."price" > 0)
);
