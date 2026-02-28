const Produit = require('../models/Produit');
const PrixProduit = require('../models/PrixProduit');
const SousCategorie = require('../models/SousCategorie');
const Unite = require('../models/Unite');
const Boutique = require('../models/Boutique');
const { createLog } = require('../utils/logger');

// Helper: valider que les sous-catégories appartiennent à la catégorie de la boutique
async function validateSousCategories(sousCategorieIds, categorieId) {
  if (!sousCategorieIds || sousCategorieIds.length === 0) return true;
  for (const scId of sousCategorieIds) {
    const sc = await SousCategorie.findOne({ _id: scId, categorieId, deletedAt: null });
    if (!sc) return false;
  }
  return true;
}

exports.getAllProduits = async (req, res) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.boutiqueId) filter.boutiqueId = req.query.boutiqueId;
    if (req.query.sousCategorieId) filter.sousCategorieIds = req.query.sousCategorieId;
    if (req.query.uniteId) filter.uniteId = req.query.uniteId;

    const produits = await Produit.find(filter)
      .populate('sousCategorieIds', 'nom')
      .populate('uniteId', 'nom')
      .populate({
        path: 'boutiqueId',
        select: 'nom slug categorieId',
        populate: { path: 'categorieId', select: 'nom' }
      })
      .sort({ nom: 1 });

    res.json({ success: true, data: produits });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.getProduitById = async (req, res) => {
  try {
    const produit = await Produit.findOne({ _id: req.params.id, deletedAt: null })
      .populate('sousCategorieIds', 'nom')
      .populate('uniteId', 'nom')
      .populate({
        path: 'boutiqueId',
        select: 'nom slug categorieId',
        populate: { path: 'categorieId', select: 'nom' }
      });

    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }
    res.json({ success: true, data: produit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.getProduitBySlug = async (req, res) => {
  try {
    const param = req.params.slug;
    const mongoose = require('mongoose');
    const isId = mongoose.Types.ObjectId.isValid(param);

    let produit = await Produit.findOne({ slug: param, deletedAt: null })
      .populate('sousCategorieIds', 'nom')
      .populate('uniteId', 'nom')
      .populate({
        path: 'boutiqueId',
        select: 'nom slug categorieId',
        populate: { path: 'categorieId', select: 'nom' }
      });

    // Fallback to _id lookup for documents that don't have a slug yet
    if (!produit && isId) {
      produit = await Produit.findOne({ _id: param, deletedAt: null })
        .populate('sousCategorieIds', 'nom')
        .populate('uniteId', 'nom')
        .populate({
          path: 'boutiqueId',
          select: 'nom slug categorieId',
          populate: { path: 'categorieId', select: 'nom' }
        });
    }

    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }
    res.json({ success: true, data: produit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.createProduit = async (req, res) => {
  try {
    const { nom, sousCategorieIds, description, prix_actuel, uniteId, boutiqueId, attributs, images } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est obligatoire' });
    }
    if (prix_actuel === undefined || prix_actuel === null) {
      return res.status(400).json({ success: false, message: 'Le prix actuel est obligatoire' });
    }
    if (!uniteId) {
      return res.status(400).json({ success: false, message: "L'unité est obligatoire" });
    }
    if (!boutiqueId) {
      return res.status(400).json({ success: false, message: 'La boutique est obligatoire' });
    }

    const [unite, boutique] = await Promise.all([
      Unite.findOne({ _id: uniteId, deletedAt: null }),
      Boutique.findOne({ _id: boutiqueId, deletedAt: null })
    ]);

    if (!unite) return res.status(404).json({ success: false, message: 'Unité non trouvée' });
    if (!boutique) return res.status(404).json({ success: false, message: 'Boutique non trouvée' });

    // Valider les sous-catégories si fournies
    if (sousCategorieIds && sousCategorieIds.length > 0) {
      if (!boutique.categorieId) {
        return res.status(400).json({ success: false, message: 'La boutique n\'a pas de catégorie définie' });
      }
      const valid = await validateSousCategories(sousCategorieIds, boutique.categorieId);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Une ou plusieurs sous-catégories ne correspondent pas à la catégorie de la boutique' });
      }
    }

    const produit = await Produit.create({
      nom: nom.trim(),
      sousCategorieIds: sousCategorieIds || [],
      description: description || null,
      prix_actuel,
      uniteId,
      boutiqueId,
      attributs: attributs || [],
      images: images || []
    });

    await PrixProduit.create({
      produitId: produit._id,
      prix_par_unite: prix_actuel
    });

    await createLog({
      action: 'create_produit',
      type: 'create',
      utilisateur: req.user._id,
      details: { produitId: produit._id, nom: produit.nom, boutiqueId, prix_actuel },
      statut: 'succès',
      message: `Produit "${produit.nom}" créé dans la boutique`
    }, req);

    res.status(201).json({ success: true, data: produit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.updateProduit = async (req, res) => {
  try {
    const { nom, sousCategorieIds, description, prix_actuel, uniteId, attributs, images } = req.body;

    const produit = await Produit.findOne({ _id: req.params.id, deletedAt: null });
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    if (sousCategorieIds !== undefined) {
      const boutique = await Boutique.findOne({ _id: produit.boutiqueId, deletedAt: null });
      if (sousCategorieIds.length > 0) {
        if (!boutique || !boutique.categorieId) {
          return res.status(400).json({ success: false, message: 'La boutique n\'a pas de catégorie définie' });
        }
        const valid = await validateSousCategories(sousCategorieIds, boutique.categorieId);
        if (!valid) {
          return res.status(400).json({ success: false, message: 'Une ou plusieurs sous-catégories ne correspondent pas à la catégorie de la boutique' });
        }
      }
      produit.sousCategorieIds = sousCategorieIds;
    }

    if (uniteId) {
      const unite = await Unite.findOne({ _id: uniteId, deletedAt: null });
      if (!unite) return res.status(404).json({ success: false, message: 'Unité non trouvée' });
      produit.uniteId = uniteId;
    }

    if (nom && nom.trim()) produit.nom = nom.trim();
    if (description !== undefined) produit.description = description;
    if (attributs !== undefined) produit.attributs = attributs;
    if (images !== undefined) produit.images = images;

    const ancienPrix = produit.prix_actuel;
    if (prix_actuel !== undefined && prix_actuel !== null && prix_actuel !== ancienPrix) {
      produit.prix_actuel = prix_actuel;
      await PrixProduit.create({
        produitId: produit._id,
        prix_par_unite: prix_actuel
      });
    }

    await produit.save();

    await createLog({
      action: 'update_produit',
      type: 'update',
      utilisateur: req.user._id,
      details: { produitId: produit._id, nom: produit.nom, ancienPrix, nouveauPrix: produit.prix_actuel },
      statut: 'succès',
      message: `Produit "${produit.nom}" mis à jour`
    }, req);

    res.json({ success: true, data: produit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.deleteProduit = async (req, res) => {
  try {
    const produit = await Produit.findOne({ _id: req.params.id, deletedAt: null });
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    produit.deletedAt = new Date();
    await produit.save();

    await createLog({
      action: 'delete_produit',
      type: 'delete',
      utilisateur: req.user._id,
      details: { produitId: produit._id, nom: produit.nom },
      statut: 'succès',
      message: `Produit "${produit.nom}" supprimé`
    }, req);

    res.json({ success: true, message: 'Produit supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
