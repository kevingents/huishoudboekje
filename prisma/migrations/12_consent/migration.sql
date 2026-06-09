-- Toestemming bij registratie vastleggen (AVG-grondslag).
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
