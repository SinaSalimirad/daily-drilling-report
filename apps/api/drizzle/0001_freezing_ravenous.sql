ALTER TABLE "products" DROP CONSTRAINT "products_price_positive";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "origin" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "price";