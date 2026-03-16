/**
 * One-time bootstrap script to create an admin user.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword node server/utils/createAdminUser.js
 *
 * Or set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file and run:
 *   node server/utils/createAdminUser.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env from the server/ directory, regardless of where the script is run from
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import mongoose from 'mongoose';
import User from '../models/User.js';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment or .env file');
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/driftland');

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    await mongoose.disconnect();
    return;
  }

  await User.create({ email, password, role: 'admin' });
  console.log(`Admin user created: ${email}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed to create admin user:', err);
  process.exit(1);
});
