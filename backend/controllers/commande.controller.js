const Commande = require('../models/Commande');
const StockMouvement = require('../models/StockMouvement');
const Produit = require('../models/Produit');
const Boutique = require('../models/Boutique');
const { createLog } = require('../utils/logger');

// @desc    Créer une commande
// @route   POST /api/commandes
// @access  Private (acheteur)
exports.createCommande = async (req, res) => {
  try {
    const { lignes, boutiqueId } = req.body;

    if (!boutiqueId) {
      return res.status(400).json({ success: false, message: 'La boutique est obligatoire' });
    }
    if (!lignes || !Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ success: false, message: 'La commande doit contenir au moins une ligne' });
    }

    const boutique = await Boutique.findOne({ _id: boutiqueId, deletedAt: null });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    // Valider chaque ligne et calculer les sous-totaux
    const lignesCalculees = [];
    for (const ligne of lignes) {
      if (!ligne.produitId || !ligne.quantite || ligne.quantite < 1) {
        return res.status(400).json({
          success: false,
          message: 'Chaque ligne doit avoir un produitId et une quantite >= 1'
        });
      }

      const produit = await Produit.findOne({ _id: ligne.produitId, boutiqueId, deletedAt: null });
      if (!produit) {
        return res.status(404).json({
          success: false,
          message: `Produit ${ligne.produitId} non trouvé dans cette boutique`
        });
      }

      const prix_unitaire = produit.prix_actuel;
      const sous_total = prix_unitaire * ligne.quantite;
      lignesCalculees.push({
        produitId: ligne.produitId,
        quantite: ligne.quantite,
        prix_unitaire,
        sous_total
      });
    }

    const montant_total = lignesCalculees.reduce((sum, l) => sum + l.sous_total, 0);

    const commande = await Commande.create({
      lignes: lignesCalculees,
      boutiqueId,
      acheteurId: req.user._id,
      montant_total,
      montant_paye: 0,
      reste_a_payer: montant_total
    });

    await createLog({
      action: 'create_commande',
      type: 'create',
      utilisateur: req.user._id,
      details: { commandeId: commande._id, boutiqueId, montant_total, nb_lignes: lignesCalculees.length },
      statut: 'succès',
      message: `Commande créée pour un montant de ${montant_total}`
    }, req);

    res.status(201).json({ success: true, data: commande });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Lister les commandes
// @route   GET /api/commandes
// @access  Private (admin: toutes, responsable_boutique: sa boutique)
exports.getAllCommandes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.user.role === 'responsable_boutique') {
      const boutiques = await Boutique.find({
        proprietaire: req.user._id,
        deletedAt: null
      }).select('_id');
      filter.boutiqueId = { $in: boutiques.map(b => b._id) };
    }

    if (req.query.statut_commande) filter.statut_commande = req.query.statut_commande;
    if (req.query.boutiqueId) filter.boutiqueId = req.query.boutiqueId;

    const [commandes, total] = await Promise.all([
      Commande.find(filter)
        .populate('boutiqueId', 'nom')
        .populate('acheteurId', 'nom email contact')
        .populate('lignes.produitId', 'nom')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip),
      Commande.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        commandes,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Détail d'une commande
// @route   GET /api/commandes/:id
// @access  Private (admin, responsable_boutique de la boutique, acheteur propriétaire)
exports.getCommandeById = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id)
      .populate('boutiqueId', 'nom proprietaire')
      .populate('acheteurId', 'nom email contact')
      .populate('lignes.produitId', 'nom prix_actuel');

    if (!commande) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    const isAdmin = req.user.role === 'admin';
    const isAcheteur = commande.acheteurId._id.toString() === req.user._id.toString();
    const isResponsable = req.user.role === 'responsable_boutique' &&
      commande.boutiqueId.proprietaire?.toString() === req.user._id.toString();

    if (!isAdmin && !isAcheteur && !isResponsable) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    res.json({ success: true, data: commande });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Mettre à jour le statut d'une commande
// @route   PUT /api/commandes/:id/statut
// @access  Private (admin, responsable_boutique)
exports.updateStatut = async (req, res) => {
  try {
    const { statut_commande } = req.body;

    const statutsValides = ['en_attente', 'confirmee', 'livree', 'annulee'];
    if (!statut_commande || !statutsValides.includes(statut_commande)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Valeurs acceptées : ${statutsValides.join(', ')}`
      });
    }

    const commande = await Commande.findById(req.params.id)
      .populate('boutiqueId', 'proprietaire nom');
    if (!commande) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    // Un responsable_boutique ne peut gérer que les commandes de sa boutique
    if (req.user.role === 'responsable_boutique' &&
        commande.boutiqueId.proprietaire?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez gérer que les commandes de votre boutique'
      });
    }

    // Transitions interdites
    if (commande.statut_commande === 'livree' || commande.statut_commande === 'annulee') {
      return res.status(400).json({
        success: false,
        message: `Impossible de modifier une commande déjà "${commande.statut_commande}"`
      });
    }

    const ancienStatut = commande.statut_commande;
    commande.statut_commande = statut_commande;
    await commande.save();

    // --- Mouvements de stock automatiques ---

    // Confirmation : sortie de stock pour chaque ligne
    if (statut_commande === 'confirmee' && ancienStatut === 'en_attente') {
      const mouvements = commande.lignes.map(ligne => ({
        produitId: ligne.produitId,
        boutiqueId: commande.boutiqueId._id,
        type: 'sortie',
        quantite: ligne.quantite,
        motif: 'commande_confirmee',
        commandeId: commande._id
      }));
      await StockMouvement.insertMany(mouvements);
    }

    // Annulation depuis confirmée : on remet le stock (entrée)
    if (statut_commande === 'annulee' && ancienStatut === 'confirmee') {
      const mouvements = commande.lignes.map(ligne => ({
        produitId: ligne.produitId,
        boutiqueId: commande.boutiqueId._id,
        type: 'entree',
        quantite: ligne.quantite,
        motif: 'annulation_commande',
        commandeId: commande._id
      }));
      await StockMouvement.insertMany(mouvements);
    }

    await createLog({
      action: 'update_statut_commande',
      type: 'update',
      utilisateur: req.user._id,
      details: { commandeId: commande._id, ancienStatut, nouveauStatut: statut_commande },
      statut: 'succès',
      message: `Commande ${commande._id} : statut "${ancienStatut}" → "${statut_commande}"`
    }, req);

    res.json({ success: true, data: commande });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Mettre à jour le paiement d'une commande
// @route   PUT /api/commandes/:id/paiement
// @access  Private (admin, responsable_boutique)
exports.updatePaiement = async (req, res) => {
  try {
    const { montant_paye } = req.body;

    if (montant_paye === undefined || montant_paye === null || montant_paye < 0) {
      return res.status(400).json({ success: false, message: 'montant_paye doit être >= 0' });
    }

    const commande = await Commande.findById(req.params.id)
      .populate('boutiqueId', 'proprietaire nom');
    if (!commande) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    if (req.user.role === 'responsable_boutique' &&
        commande.boutiqueId.proprietaire?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez gérer que les commandes de votre boutique'
      });
    }

    if (montant_paye > commande.montant_total) {
      return res.status(400).json({
        success: false,
        message: `Le montant payé (${montant_paye}) ne peut pas dépasser le montant total (${commande.montant_total})`
      });
    }

    const ancienMontantPaye = commande.montant_paye;
    commande.montant_paye = montant_paye;
    commande.reste_a_payer = commande.montant_total - montant_paye;
    await commande.save();

    await createLog({
      action: 'update_paiement_commande',
      type: 'update',
      utilisateur: req.user._id,
      details: {
        commandeId: commande._id,
        ancienMontantPaye,
        nouveauMontantPaye: montant_paye,
        reste_a_payer: commande.reste_a_payer
      },
      statut: 'succès',
      message: `Paiement commande ${commande._id} : ${montant_paye} / ${commande.montant_total} (reste: ${commande.reste_a_payer})`
    }, req);

    res.json({ success: true, data: commande });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
