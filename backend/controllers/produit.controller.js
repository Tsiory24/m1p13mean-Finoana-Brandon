const Produit = require('../models/Produit');
const PrixProduit = require('../models/PrixProduit');
const Categorie = require('../models/Categorie');
const SousCategorie = require('../models/SousCategorie');
const Unite = require('../models/Unite');
const Boutique = require('../models/Boutique');
const { createLog } = require('../utils/logger');

exports.getAllProduits = async (req, res) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.boutiqueId) filter.boutiqueId = req.query.boutiqueId;
    if (req.query.categorieId) filter.categorieId = req.query.categorieId;
    if (req.query.sousCategorieId) filter.sousCategorieId = req.query.sousCategorieId;
    if (req.query.uniteId) filter.uniteId = req.query.uniteId;

    const produits = await Produit.find(filter)
      .populate('categorieId', 'nom')
      .populate('sousCategorieId', 'nom')
      .populate('uniteId', 'nom')
      .populate('boutiqueId', 'nom')
      .sort({ nom: 1 });

    res.json({ success: true, data: produits });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.getProduitById = async (req, res) => {
  try {
    const produit = await Produit.findOne({ _id: req.params.id, deletedAt: null })
      .populate('categorieId', 'nom')
      .populate('sousCategorieId', 'nom')
      .populate('uniteId', 'nom')
      .populate('boutiqueId', 'nom');

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
    const { nom, categorieId, sousCategorieId, description, prix_actuel, uniteId, boutiqueId } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est obligatoire' });
    }
    if (!categorieId) {
      return res.status(400).json({ success: false, message: 'La catégorie est obligatoire' });
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

    const [categorie, unite, boutique] = await Promise.all([
      Categorie.findOne({ _id: categorieId, deletedAt: null }),
      Unite.findOne({ _id: uniteId, deletedAt: null }),
      Boutique.findOne({ _id: boutiqueId, deletedAt: null })
    ]);

    if (!categorie) return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    if (!unite) return res.status(404).json({ success: false, message: 'Unité non trouvée' });
    if (!boutique) return res.status(404).json({ success: false, message: 'Boutique non trouvée' });

    if (sousCategorieId) {
      const sousCategorie = await SousCategorie.findOne({ _id: sousCategorieId, categorieId, deletedAt: null });
      if (!sousCategorie) {
        return res.status(404).json({ success: false, message: 'Sous-catégorie non trouvée ou non liée à cette catégorie' });
      }
    }

    const produit = await Produit.create({
      nom: nom.trim(),
      categorieId,
      sousCategorieId: sousCategorieId || null,
      description: description || null,
      prix_actuel,
      uniteId,
      boutiqueId
    });

    // Enregistrer le prix initial dans l'historique
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
    const { nom, categorieId, sousCategorieId, description, prix_actuel, uniteId } = req.body;

    const produit = await Produit.findOne({ _id: req.params.id, deletedAt: null });
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    if (categorieId) {
      const categorie = await Categorie.findOne({ _id: categorieId, deletedAt: null });
      if (!categorie) return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
      produit.categorieId = categorieId;
    }

    if (sousCategorieId !== undefined) {
      if (sousCategorieId) {
        const catId = categorieId || produit.categorieId;
        const sousCategorie = await SousCategorie.findOne({ _id: sousCategorieId, categorieId: catId, deletedAt: null });
        if (!sousCategorie) {
          return res.status(404).json({ success: false, message: 'Sous-catégorie non trouvée ou non liée à cette catégorie' });
        }
        produit.sousCategorieId = sousCategorieId;
      } else {
        produit.sousCategorieId = null;
      }
    }

    if (uniteId) {
      const unite = await Unite.findOne({ _id: uniteId, deletedAt: null });
      if (!unite) return res.status(404).json({ success: false, message: 'Unité non trouvée' });
      produit.uniteId = uniteId;
    }

    if (nom && nom.trim()) produit.nom = nom.trim();
    if (description !== undefined) produit.description = description;

    // Enregistrer l'historique si le prix change
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
      details: {
        produitId: produit._id,
        nom: produit.nom,
        ancienPrix,
        nouveauPrix: produit.prix_actuel
      },
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
