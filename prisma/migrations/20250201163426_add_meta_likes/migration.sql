-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateTable
CREATE TABLE "public"."users" (
    "created_at" TIMESTAMPTZ(6),
    "id" UUID NOT NULL,
    "email" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'email',
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6),
    "last_sign_in_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookmarks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "post_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sitemapUrl" TEXT NOT NULL,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."meta_likes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "meta_url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_provider_idx" ON "public"."users"("email", "provider");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "public"."users"("created_at");

-- CreateIndex
CREATE INDEX "bookmarks_user_id_idx" ON "public"."bookmarks"("user_id");

-- CreateIndex
CREATE INDEX "bookmarks_post_id_idx" ON "public"."bookmarks"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_user_id_post_id_key" ON "public"."bookmarks"("user_id", "post_id");

-- CreateIndex
CREATE INDEX "meta_likes_user_id_idx" ON "public"."meta_likes"("user_id");

-- CreateIndex
CREATE INDEX "meta_likes_meta_url_idx" ON "public"."meta_likes"("meta_url");

-- CreateIndex
CREATE UNIQUE INDEX "meta_likes_user_id_meta_url_key" ON "public"."meta_likes"("user_id", "meta_url");

-- AddForeignKey
ALTER TABLE "public"."bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meta_likes" ADD CONSTRAINT "meta_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
