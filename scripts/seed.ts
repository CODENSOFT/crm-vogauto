/**
 * Creează primul cont de administrator.
 * Rulează cu:
 *   npm run seed
 * (sau)
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' -r dotenv/config scripts/seed.ts dotenv_config_path=.env.local
 *
 * Admin: login "admin" / parolă "Admin1234!"
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Car from "../models/Car";

const PERMS = {
  canViewPrices: true,
  canEditCars: true,
  canAddCars: true,
  canDownload: true,
  canViewStatistics: true,
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI lipsește din .env.local");

  await mongoose.connect(uri);
  console.log("Conectat la MongoDB.");

  // Caută adminul existent (după username sau emailul vechi).
  let admin = await User.findOne({
    $or: [{ username: "admin" }, { email: "admin@parcare.com" }],
  });

  const password = await bcrypt.hash("Admin1234!", 10);

  if (admin) {
    // Upgrade: asigură username, comision și permisiuni.
    admin.username = "admin";
    if (!admin.password) admin.password = password;
    admin.role = "admin";
    admin.permissions = PERMS;
    admin.isActive = true;
    await admin.save();
    console.log("✓ Admin actualizat — login: admin / parolă existentă (sau Admin1234! dacă era gol)");
  } else {
    await User.create({
      username: "admin",
      email: "admin@parcare.com",
      password,
      fullName: "Administrator",
      role: "admin",
      permissions: PERMS,
      fixedFee: 50,
      bonus: 0,
      isActive: true,
    });
    console.log("✓ Admin creat — login: admin / parolă: Admin1234!");
  }

  // Backfill: vânzările vechi fără status devin „sold”.
  const r = await Car.updateMany({ status: { $exists: false } }, { $set: { status: "sold" } });
  if (r.modifiedCount) console.log(`✓ ${r.modifiedCount} vânzări vechi marcate ca „vândute”.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
