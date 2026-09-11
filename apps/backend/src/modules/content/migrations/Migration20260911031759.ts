import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260911031759 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "ohana_demand" drop constraint if exists "ohana_demand_product_id_email_unique";`);
    this.addSql(`create table if not exists "ohana_demand" ("id" text not null, "product_id" text not null, "email" text not null, "customer_id" text null, "ip" text null, "notified_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ohana_demand_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ohana_demand_deleted_at" ON "ohana_demand" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ohana_demand_product_id" ON "ohana_demand" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ohana_demand_product_id_email_unique" ON "ohana_demand" ("product_id", "email") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ohana_demand" cascade;`);
  }

}
