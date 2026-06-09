-- Extra profielvelden: roepnaam + noodcontact.
ALTER TABLE "User" ADD COLUMN "nickname" TEXT;
ALTER TABLE "User" ADD COLUMN "emergencyContact" TEXT;
