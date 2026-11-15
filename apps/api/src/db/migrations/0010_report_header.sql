ALTER TABLE "daily_reports" ADD COLUMN "bit_depth" double precision;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "td" double precision;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "tvd" double precision;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "representatives" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "engineers" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "drilling_remarks" text;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "fluid_remarks" text;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "formation" text;