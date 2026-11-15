CREATE TABLE "inventory_moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"project_product_id" uuid NOT NULL,
	"received" numeric(14, 3) DEFAULT '0' NOT NULL,
	"used" numeric(14, 3) DEFAULT '0' NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "inventory_moves_report_id_project_product_id_unique" UNIQUE("report_id","project_product_id")
);
--> statement-breakpoint
ALTER TABLE "inventory_moves" ADD CONSTRAINT "inventory_moves_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_moves" ADD CONSTRAINT "inventory_moves_project_product_id_project_products_id_fk" FOREIGN KEY ("project_product_id") REFERENCES "project_products"("id") ON DELETE restrict ON UPDATE no action;