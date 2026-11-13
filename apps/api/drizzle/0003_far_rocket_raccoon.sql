ALTER TABLE "inventories" DROP CONSTRAINT "inventories_report_id_reports_id_fk";
--> statement-breakpoint
ALTER TABLE "inventories" DROP CONSTRAINT "inventories_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_well_id_wells_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_section_same_well_fk";
--> statement-breakpoint
ALTER TABLE "section" DROP CONSTRAINT "section_well_id_wells_id_fk";
--> statement-breakpoint
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_section_same_well_fk" FOREIGN KEY ("section_id","well_id") REFERENCES "public"."section"("id","well_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE restrict ON UPDATE no action;