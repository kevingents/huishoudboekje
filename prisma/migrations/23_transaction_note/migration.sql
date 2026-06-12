-- Transactie: eigen notitie + betaalmethode
ALTER TABLE "Transaction" ADD COLUMN "note" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "paymentMethod" TEXT;
