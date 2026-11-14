-- Sessions from before access/refresh tokens have no refresh token and can't be used any more;
-- remove them instead of leaving rows that look alive. Everyone logs in once after this.
DELETE FROM "sessions";--> statement-breakpoint
CREATE TYPE "public"."session_revoke_reason" AS ENUM('logout', 'replaced-by-login', 'refresh-token-reuse', 'password-change', 'deactivated');--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"rotated_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_token_hash_unique";--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "revoke_reason" "session_revoke_reason";--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "token_hash";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "last_seen_at";