CREATE INDEX "memberships_user_circle" ON "circle_memberships" USING btree ("user_id","circle_id");--> statement-breakpoint
CREATE INDEX "posts_circle_created_id" ON "posts" USING btree ("circle_id","created_at","id");--> statement-breakpoint
CREATE INDEX "posts_created_id" ON "posts" USING btree ("created_at","id");