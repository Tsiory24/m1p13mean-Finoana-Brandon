require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ nom: 'Admin' });
  if (existing) {
    console.log('Admin user already exists (nom: Admin)');
    await mongoose.disconnect();
    return;
  }

  await User.create({
    nom: 'Admin',
    motDePasse: 'admin123',
    contact: '0321598763',
    role: 'admin',
    email: 'harisbrandon444@gmail.com'
  });

  console.log('Admin user created: nom=Admin, motDePasse=admin123, role=admin');
  await mongoose.disconnect();
}

seedAdmin().catch(err => { console.error(err); process.exit(1); });
