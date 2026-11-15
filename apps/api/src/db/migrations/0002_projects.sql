CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"operator" text NOT NULL,
	"contractor" text,
	"rig_name" text,
	"field_country" text,
	"currency" text NOT NULL,
	"unit_system" jsonb DEFAULT '{"depth":"m","diameter":"mm","cakeThickness":"mm","volume":"m3","density":"kg_m3","pressure":"kpa","yieldStress":"pa","flowRate":"l_min","plasticViscosity":"mpa_s","concentration":"kg_m3","chlorides":"mg_l","mass":"kg","rop":"m_h","temperature":"degc"}'::jsonb NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "projects_name_unique" UNIQUE("name")
);
