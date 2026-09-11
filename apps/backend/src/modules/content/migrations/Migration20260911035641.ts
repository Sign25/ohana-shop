import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260911035641 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "ohana_wb_review" drop constraint if exists "ohana_wb_review_feedback_id_unique";`);
    this.addSql(`alter table if exists "ohana_wb_rating" drop constraint if exists "ohana_wb_rating_product_code_unique";`);
    this.addSql(`create table if not exists "ohana_wb_rating" ("id" text not null, "product_code" text not null, "nm_id" numeric not null default 0, "rating" real not null default 0, "reviews_count" integer not null default 0, "text_count" integer not null default 0, "synced_at" timestamptz null, "raw_nm_id" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ohana_wb_rating_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ohana_wb_rating_deleted_at" ON "ohana_wb_rating" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ohana_wb_rating_product_code_unique" ON "ohana_wb_rating" ("product_code") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ohana_wb_review" ("id" text not null, "feedback_id" text not null, "product_code" text not null, "nm_id" numeric not null default 0, "valuation" integer not null default 0, "author" text not null default '', "body" text not null default '', "created_date" text not null default '', "raw_nm_id" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ohana_wb_review_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ohana_wb_review_deleted_at" ON "ohana_wb_review" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ohana_wb_review_feedback_id_unique" ON "ohana_wb_review" ("feedback_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ohana_wb_review_product_code_created_date" ON "ohana_wb_review" ("product_code", "created_date") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ohana_wb_rating" cascade;`);

    this.addSql(`drop table if exists "ohana_wb_review" cascade;`);
  }

}
