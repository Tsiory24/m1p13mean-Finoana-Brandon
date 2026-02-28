const mongoose = require('mongoose');

function slugify(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const ProduitSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  // La catégorie est héritée de la boutique via boutiqueId.categorieId
  sousCategorieIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SousCategorie'
  }],
  description: {
    type: String,
    default: null
  },
  prix_actuel: {
    type: Number,
    required: true,
    min: 0
  },
  uniteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unite',
    required: true
  },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  // Images du produit (URLs)
  images: [{
    type: String
  }],
  // Attributs dynamiques : métadonnées descriptives du produit
  attributs: [{
    cle: { type: String, required: true, trim: true },
    valeur: { type: String, required: true, trim: true }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

ProduitSchema.pre('save', async function () {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  if (this.isModified('nom') || !this.slug) {
    const base = slugify(this.nom);
    let slug = base;
    let count = 1;
    while (await mongoose.model('Produit').exists({ slug, _id: { $ne: this._id } })) {
      slug = `${base}-${count++}`;
    }
    this.slug = slug;
  }
});

module.exports = mongoose.model('Produit', ProduitSchema);
