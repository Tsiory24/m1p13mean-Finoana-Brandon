/**
 * Script de migration : génère les slugs pour les boutiques et produits existants
 * Usage: node scripts/migrate-slugs.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Boutique = require('../models/Boutique');
const Produit = require('../models/Produit');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/m1p13mean';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Migrate boutiques without slugs
  const boutiques = await Boutique.find({ $or: [{ slug: null }, { slug: { $exists: false } }] });
  console.log(`Boutiques sans slug : ${boutiques.length}`);
  for (const b of boutiques) {
    await b.save(); // triggers pre('save') which generates the slug
    console.log(`  Boutique "${b.nom}" → slug: ${b.slug}`);
  }

  // Migrate produits without slugs
  const produits = await Produit.find({ $or: [{ slug: null }, { slug: { $exists: false } }] });
  console.log(`Produits sans slug : ${produits.length}`);
  for (const p of produits) {
    await p.save(); // triggers pre('save') which generates the slug
    console.log(`  Produit "${p.nom}" → slug: ${p.slug}`);
  }

  await mongoose.disconnect();
  console.log('✅ Migration terminée');
}

run().catch(err => { console.error(err); process.exit(1); });
