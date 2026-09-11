import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260911013951 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "ohana_page" drop constraint if exists "ohana_page_slug_unique";`);
    this.addSql(`create table if not exists "ohana_banner" ("id" text not null, "place" text not null default 'hero', "title" text not null, "image_url" text not null, "mobile_image_url" text null, "link" text null, "alt" text null, "sort" integer not null default 0, "active" boolean not null default true, "starts_at" timestamptz null, "ends_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ohana_banner_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ohana_banner_deleted_at" ON "ohana_banner" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ohana_page" ("id" text not null, "slug" text not null, "title" text not null, "page_title" text null, "meta" text null, "html" text not null, "has_h1" boolean not null default false, "status" text check ("status" in ('published', 'draft')) not null default 'published', "sort" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ohana_page_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ohana_page_slug_unique" ON "ohana_page" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ohana_page_deleted_at" ON "ohana_page" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ohana_banner" cascade;`);

    this.addSql(`drop table if exists "ohana_page" cascade;`);
  }

}
