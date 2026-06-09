-- Medische gegevens per gezinslid (bijzondere persoonsgegevens).
ALTER TABLE "FamilyMember" ADD COLUMN "bloodType" TEXT;
ALTER TABLE "FamilyMember" ADD COLUMN "allergies" TEXT;
ALTER TABLE "FamilyMember" ADD COLUMN "medication" TEXT;
ALTER TABLE "FamilyMember" ADD COLUMN "medicalNotes" TEXT;
