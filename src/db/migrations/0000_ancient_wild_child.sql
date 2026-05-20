CREATE TABLE "clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"country" varchar(2),
	"referrer" text,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clicks_link_id_idx" ON "clicks" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "clicks_clicked_at_idx" ON "clicks" USING btree ("clicked_at");--> statement-breakpoint
CREATE INDEX "clicks_country_idx" ON "clicks" USING btree ("country");--> statement-breakpoint
CREATE INDEX "clicks_link_id_clicked_at_idx" ON "clicks" USING btree ("link_id","clicked_at");--> statement-breakpoint
CREATE INDEX "clicks_referrer_idx" ON "clicks" USING btree ("referrer");--> statement-breakpoint
CREATE UNIQUE INDEX "links_slug_unique" ON "links" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "links_is_active_idx" ON "links" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "links_created_at_idx" ON "links" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "links_slug_active_expires_idx" ON "links" USING btree ("slug","is_active","expires_at");--> statement-breakpoint
CREATE INDEX "links_expires_at_idx" ON "links" USING btree ("expires_at");