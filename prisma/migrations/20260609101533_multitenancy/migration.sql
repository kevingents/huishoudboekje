/*
  Warnings:

  - The primary key for the `Integration` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Setting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `householdId` to the `AgendaEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `BudgetCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `FamilyMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `FixedCost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `Integration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `Integration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `SavingsGoal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `Setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `Setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `ShoppingItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Household" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'basis',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgendaEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "dateKey" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "weekday" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "accent" TEXT NOT NULL DEFAULT 'sky',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AgendaEvent" ("accent", "createdAt", "dateKey", "day", "externalId", "id", "month", "source", "time", "title", "weekday", "who") SELECT "accent", "createdAt", "dateKey", "day", "externalId", "id", "month", "source", "time", "title", "weekday", "who" FROM "AgendaEvent";
DROP TABLE "AgendaEvent";
ALTER TABLE "new_AgendaEvent" RENAME TO "AgendaEvent";
CREATE INDEX "AgendaEvent_householdId_idx" ON "AgendaEvent"("householdId");
CREATE UNIQUE INDEX "AgendaEvent_householdId_externalId_key" ON "AgendaEvent"("householdId", "externalId");
CREATE TABLE "new_BudgetCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'ShoppingCart',
    "spent" REAL NOT NULL DEFAULT 0,
    "limit" REAL NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT 'emerald'
);
INSERT INTO "new_BudgetCategory" ("color", "icon", "id", "limit", "name", "spent") SELECT "color", "icon", "id", "limit", "name", "spent" FROM "BudgetCategory";
DROP TABLE "BudgetCategory";
ALTER TABLE "new_BudgetCategory" RENAME TO "BudgetCategory";
CREATE INDEX "BudgetCategory_householdId_idx" ON "BudgetCategory"("householdId");
CREATE TABLE "new_ChatMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ChatMessage" ("createdAt", "id", "role", "text") SELECT "createdAt", "id", "role", "text" FROM "ChatMessage";
DROP TABLE "ChatMessage";
ALTER TABLE "new_ChatMessage" RENAME TO "ChatMessage";
CREATE INDEX "ChatMessage_householdId_idx" ON "ChatMessage"("householdId");
CREATE TABLE "new_FamilyMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "role" TEXT,
    "birthday" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_FamilyMember" ("birthday", "color", "createdAt", "id", "initials", "name", "role") SELECT "birthday", "color", "createdAt", "id", "initials", "name", "role" FROM "FamilyMember";
DROP TABLE "FamilyMember";
ALTER TABLE "new_FamilyMember" RENAME TO "FamilyMember";
CREATE INDEX "FamilyMember_householdId_idx" ON "FamilyMember"("householdId");
CREATE TABLE "new_FixedCost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "dueDay" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_FixedCost" ("amount", "createdAt", "dueDay", "id", "name") SELECT "amount", "createdAt", "dueDay", "id", "name" FROM "FixedCost";
DROP TABLE "FixedCost";
ALTER TABLE "new_FixedCost" RENAME TO "FixedCost";
CREATE INDEX "FixedCost_householdId_idx" ON "FixedCost"("householdId");
CREATE TABLE "new_Integration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "config" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Integration" ("config", "key", "name", "status", "updatedAt") SELECT "config", "key", "name", "status", "updatedAt" FROM "Integration";
DROP TABLE "Integration";
ALTER TABLE "new_Integration" RENAME TO "Integration";
CREATE UNIQUE INDEX "Integration_householdId_key_key" ON "Integration"("householdId", "key");
CREATE TABLE "new_Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'system',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Notification" ("body", "createdAt", "id", "read", "title", "type") SELECT "body", "createdAt", "id", "read", "title", "type" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_householdId_idx" ON "Notification"("householdId");
CREATE TABLE "new_Recipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "servings" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "vote" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Recipe" ("createdAt", "description", "favorite", "id", "image", "servings", "tags", "time", "title", "vote") SELECT "createdAt", "description", "favorite", "id", "image", "servings", "tags", "time", "title", "vote" FROM "Recipe";
DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";
CREATE INDEX "Recipe_householdId_idx" ON "Recipe"("householdId");
CREATE TABLE "new_SavingsGoal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "target" REAL NOT NULL,
    "saved" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SavingsGoal" ("createdAt", "id", "name", "saved", "target") SELECT "createdAt", "id", "name", "saved", "target" FROM "SavingsGoal";
DROP TABLE "SavingsGoal";
ALTER TABLE "new_SavingsGoal" RENAME TO "SavingsGoal";
CREATE INDEX "SavingsGoal_householdId_idx" ON "SavingsGoal"("householdId");
CREATE TABLE "new_Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);
INSERT INTO "new_Setting" ("key", "value") SELECT "key", "value" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
CREATE UNIQUE INDEX "Setting_householdId_key_key" ON "Setting"("householdId", "key");
CREATE TABLE "new_ShoppingItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL DEFAULT 'Overig',
    "qty" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ShoppingItem" ("category", "checked", "createdAt", "id", "label", "qty") SELECT "category", "checked", "createdAt", "id", "label", "qty" FROM "ShoppingItem";
DROP TABLE "ShoppingItem";
ALTER TABLE "new_ShoppingItem" RENAME TO "ShoppingItem";
CREATE INDEX "ShoppingItem_householdId_idx" ON "ShoppingItem"("householdId");
CREATE TABLE "new_Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "interval" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mollieCustomerId" TEXT,
    "mollieSubscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Subscription" ("amount", "createdAt", "id", "interval", "mollieCustomerId", "mollieSubscriptionId", "name", "status") SELECT "amount", "createdAt", "id", "interval", "mollieCustomerId", "mollieSubscriptionId", "name", "status" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE INDEX "Subscription_householdId_idx" ON "Subscription"("householdId");
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "householdId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Transaction" ("amount", "category", "createdAt", "date", "id", "label") SELECT "amount", "category", "createdAt", "date", "id", "label" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_householdId_idx" ON "Transaction"("householdId");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "householdId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "passwordHash") SELECT "createdAt", "email", "id", "name", "passwordHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_householdId_idx" ON "User"("householdId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
