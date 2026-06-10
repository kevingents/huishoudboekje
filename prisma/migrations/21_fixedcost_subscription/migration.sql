-- Een vaste last kan ook een abonnement zijn: interval (maand/jaar) + opzegregeling.
ALTER TABLE "FixedCost" ADD COLUMN "isSubscription" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FixedCost" ADD COLUMN "subscriptionInterval" TEXT;
ALTER TABLE "FixedCost" ADD COLUMN "subscriptionCancelable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "FixedCost" ADD COLUMN "subscriptionEndDate" TEXT;

-- Bestaande 'Abonnement'-posten meenemen zodat het abonnementen-overzicht niet leeg raakt.
UPDATE "FixedCost" SET "isSubscription" = true, "subscriptionInterval" = '1 month'
  WHERE LOWER("category") = 'abonnement';
