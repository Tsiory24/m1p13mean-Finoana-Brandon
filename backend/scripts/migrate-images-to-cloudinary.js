/**
 * Script de migration : upload des images locales vers Cloudinary
 * et mise à jour des URLs en base de données.
 *
 * Usage : node scripts/migrate-images-to-cloudinary.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { uploadFile } = require('../utils/cloudinary');

const uploadsDir = path.join(__dirname, '../public/uploads');

// ── Connexion MongoDB ────────────────────────────────────────────────────────
async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✔  MongoDB connecté');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function isLocalUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('cloudinary.com')) return false;
  return url.includes('/uploads/');
}

function extractFilename(url) {
  const parts = url.split('/uploads/');
  return parts[parts.length - 1];
}

async function migrateUrl(url) {
  const filename = extractFilename(url);
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠  Fichier introuvable : ${filename} (ignoré)`);
    return null;
  }

  try {
    const result = await uploadFile(filePath, {
      folder: 'mall',
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    });
    console.log(`  ✔  ${filename} → ${result.secure_url}`);
    return result.secure_url;
  } catch (err) {
    console.error(`  ✘  Erreur upload ${filename} : ${err.message}`);
    return null;
  }
}

// ── Migration Boutiques ──────────────────────────────────────────────────────
async function migrateBoutiques() {
  const col = mongoose.connection.collection('boutiques');
  const boutiques = await col.find({ image: { $exists: true, $ne: null } }).toArray();
  let count = 0;

  for (const b of boutiques) {
    if (!isLocalUrl(b.image)) continue;
    console.log(`Boutique "${b.nom || b._id}" : ${b.image}`);
    const newUrl = await migrateUrl(b.image);
    if (newUrl) {
      await col.updateOne({ _id: b._id }, { $set: { image: newUrl } });
      count++;
    }
  }
  console.log(`→ Boutiques : ${count} image(s) migrée(s)\n`);
}

// ── Migration Produits ───────────────────────────────────────────────────────
async function migrateProduits() {
  const col = mongoose.connection.collection('produits');
  const produits = await col.find({ images: { $exists: true, $not: { $size: 0 } } }).toArray();
  let count = 0;

  for (const p of produits) {
    if (!p.images || p.images.length === 0) continue;
    const newImages = [];
    let changed = false;

    for (const url of p.images) {
      if (isLocalUrl(url)) {
        console.log(`Produit "${p.nom || p._id}" : ${url}`);
        const newUrl = await migrateUrl(url);
        newImages.push(newUrl || url);
        if (newUrl) changed = true;
      } else {
        newImages.push(url);
      }
    }

    if (changed) {
      await col.updateOne({ _id: p._id }, { $set: { images: newImages } });
      count++;
    }
  }
  console.log(`→ Produits : ${count} produit(s) avec image(s) migrée(s)\n`);
}

// ── Migration VariantProduit (options[].image) ───────────────────────────────
async function migrateVariants() {
  const col = mongoose.connection.collection('variantproduits');
  const variants = await col
    .find({ 'options.image': { $exists: true, $ne: null } })
    .toArray();
  let count = 0;

  for (const v of variants) {
    if (!v.options || v.options.length === 0) continue;
    let changed = false;

    for (let i = 0; i < v.options.length; i++) {
      const opt = v.options[i];
      if (opt.image && isLocalUrl(opt.image)) {
        console.log(`Variant "${v.nom || v._id}" option "${opt.valeur}" : ${opt.image}`);
        const newUrl = await migrateUrl(opt.image);
        if (newUrl) {
          v.options[i] = { ...v.options[i], image: newUrl };
          changed = true;
        }
      }
    }

    if (changed) {
      await col.updateOne({ _id: v._id }, { $set: { options: v.options } });
      count++;
    }
  }
  console.log(`→ Variants : ${count} variant(s) avec image(s) migrée(s)\n`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await connectDB();

    console.log('\n── Migration Boutiques ──');
    await migrateBoutiques();

    console.log('── Migration Produits ──');
    await migrateProduits();

    console.log('── Migration Variants ──');
    await migrateVariants();

    console.log('✔  Migration terminée avec succès.');
  } catch (err) {
    console.error('Erreur fatale :', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
