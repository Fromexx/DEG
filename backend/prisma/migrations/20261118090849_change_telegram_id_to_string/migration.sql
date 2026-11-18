-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegram_id" TEXT NOT NULL,
    "username" TEXT,
    "fio" TEXT NOT NULL,
    "card_number" TEXT,
    "role" TEXT NOT NULL DEFAULT 'participant',
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "is_activated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_users" ("card_number", "created_at", "fio", "id", "is_activated", "is_banned", "role", "telegram_id", "username") SELECT "card_number", "created_at", "fio", "id", "is_activated", "is_banned", "role", "telegram_id", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
