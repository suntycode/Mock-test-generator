import mongoose from 'mongoose';
import { connectDB } from './db/connect.js';
import { seedInitialData } from './services/seed.service.js';

try {
  await connectDB();
  const { profile } = await seedInitialData();
  console.log(`Seeded exam profile: ${profile.key}`);
} finally {
  await mongoose.disconnect();
}
