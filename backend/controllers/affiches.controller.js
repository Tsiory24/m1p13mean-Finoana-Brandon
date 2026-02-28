const DemandeAfficheProduit = require('../models/DemandeAfficheProduit');
const Config = require('../models/Config');
const Notification = require('../models/Notification');

// ── Produits à l'affiche (public) ─────────────────────────────────────────────
exports.getProduitAffiches = async (req, res) => {
  try {
    const demandes = await DemandeAfficheProduit.find({ statut: 'accepte' })
      .populate('produitId', 'nom prix_actuel images')
      .populate('boutiqueId', 'nom image')
      .sort({ ordre: 1 });
    res.status(200).json({ success: true, data: demandes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Demandes (admin) ──────────────────────────────────────────────────────────
exports.getDemandesAdmin = async (req, res) => {
  try {
    const { statut, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (statut) filter.statut = statut;

    const total = await DemandeAfficheProduit.countDocuments(filter);
    const demandes = await DemandeAfficheProduit.find(filter)
      .populate('produitId', 'nom prix_actuel images')
      .populate('boutiqueId', 'nom image')
      .populate('traitePar', 'nom email')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({ success: true, data: demandes, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Faire une demande (responsable_boutique) ──────────────────────────────────
exports.demanderAffiche = async (req, res) => {
  try {
    const { produitId } = req.params;

    // Vérifier si une demande en_attente ou accepte existe déjà
    const existing = await DemandeAfficheProduit.findOne({
      produitId,
      statut: { $in: ['en_attente', 'accepte'] }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.statut === 'accepte'
          ? 'Ce produit est déjà à l\'affiche'
          : 'Une demande est déjà en attente pour ce produit'
      });
    }

    // Vérifier le délai après un refus
    const dernierRefus = await DemandeAfficheProduit.findOne({
      produitId,
      statut: 'refuse'
    }).sort({ dateRefus: -1 });

    if (dernierRefus && dernierRefus.dateRefus) {
      const config = await Config.findOne({});
      const delai = config ? config.delaiResoumissionAffiche : 7;
      const dateDisponible = new Date(dernierRefus.dateRefus);
      dateDisponible.setDate(dateDisponible.getDate() + delai);
      if (new Date() < dateDisponible) {
        const joursRestants = Math.ceil((dateDisponible - new Date()) / (1000 * 60 * 60 * 24));
        return res.status(400).json({
          success: false,
          message: `Re-soumission possible dans ${joursRestants} jour(s)`,
          joursRestants
        });
      }
    }

    // Trouver la boutique du responsable
    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    const demande = await DemandeAfficheProduit.create({
      produitId,
      boutiqueId: boutique._id
    });

    // Notifier l'admin
    const Produit = require('../models/Produit');
    const produit = await Produit.findById(produitId).select('nom');
    await Notification.create({
      type: 'affiche_demande',
      targetRole: 'admin',
      message: `Nouvelle demande d'affiche pour "${produit?.nom ?? 'un produit'}" (boutique : ${boutique.nom})`,
      refId: demande._id,
      refModel: 'DemandeAfficheProduit',
      data: { demandeId: demande._id, produitId, boutiqueId: boutique._id }
    }).catch(() => {});

    res.status(201).json({ success: true, data: demande });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Accepter une demande (admin) ──────────────────────────────────────────────
exports.accepterDemande = async (req, res) => {
  try {
    const demande = await DemandeAfficheProduit.findById(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    }

    // Vérifier la limite max de produits à l'affiche
    const config = await Config.findOne({});
    const maxProduits = config?.maxProduitsAffiche ?? 10;
    const countAccepte = await DemandeAfficheProduit.countDocuments({ statut: 'accepte' });
    if (countAccepte >= maxProduits) {
      return res.status(400).json({
        success: false,
        message: `Limite de ${maxProduits} produit(s) à l'affiche atteinte.`
      });
    }

    // Calcul de l'ordre max + 1 si non fourni
    let ordre = req.body.ordre;
    if (ordre === undefined || ordre === null) {
      const derniere = await DemandeAfficheProduit.findOne({ statut: 'accepte' }).sort({ ordre: -1 });
      ordre = derniere ? derniere.ordre + 1 : 1;
    }

    demande.statut = 'accepte';
    demande.ordre = ordre;
    demande.traitePar = req.user._id;
    await demande.save();

    // Notifier le responsable de la boutique
    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findById(demande.boutiqueId).select('proprietaire nom');
    if (boutique?.proprietaire) {
      const populated = await DemandeAfficheProduit.findById(demande._id).populate('produitId', 'nom');
      await Notification.create({
        type: 'affiche_acceptee',
        targetUser: boutique.proprietaire,
        message: `Votre produit "${populated?.produitId?.nom ?? '—'}" a été accepté à l'affiche`,
        refId: demande._id,
        refModel: 'DemandeAfficheProduit',
        data: { demandeId: demande._id, produitId: demande.produitId, boutiqueId: demande.boutiqueId }
      }).catch(() => {});
    }

    res.status(200).json({ success: true, data: demande });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Refuser une demande (admin) ───────────────────────────────────────────────
exports.refuserDemande = async (req, res) => {
  try {
    const demande = await DemandeAfficheProduit.findById(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    }

    demande.statut = 'refuse';
    demande.motifRefus = req.body.motif || null;
    demande.dateRefus = new Date();
    demande.traitePar = req.user._id;
    await demande.save();

    // Notifier le responsable de la boutique
    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findById(demande.boutiqueId).select('proprietaire nom');
    if (boutique?.proprietaire) {
      const populated = await DemandeAfficheProduit.findById(demande._id).populate('produitId', 'nom');
      const motifMsg = demande.motifRefus ? ` (motif : ${demande.motifRefus})` : '';
      await Notification.create({
        type: 'affiche_refusee',
        targetUser: boutique.proprietaire,
        message: `Votre demande d'affiche pour "${populated?.produitId?.nom ?? '—'}" a été refusée${motifMsg}`,
        refId: demande._id,
        refModel: 'DemandeAfficheProduit',
        data: { demandeId: demande._id, produitId: demande.produitId, boutiqueId: demande.boutiqueId }
      }).catch(() => {});
    }

    res.status(200).json({ success: true, data: demande });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Retirer un produit de l'affiche (admin) ───────────────────────────────────
exports.retirerAffiche = async (req, res) => {
  try {
    const demande = await DemandeAfficheProduit.findById(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    }

    demande.statut = 'refuse';
    demande.dateRefus = new Date();
    demande.motifRefus = req.body.motif || null;
    demande.traitePar = req.user._id;
    await demande.save();

    res.status(200).json({ success: true, message: 'Produit retiré de l\'affiche' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Réordonner les produits à l'affiche (admin) ───────────────────────────────
exports.reorderAffiches = async (req, res) => {
  try {
    const liste = req.body;
    if (!Array.isArray(liste)) {
      return res.status(400).json({ success: false, message: 'Format invalide, tableau attendu' });
    }
    for (const item of liste) {
      await DemandeAfficheProduit.findByIdAndUpdate(item.demandeId, { $set: { ordre: item.ordre } });
    }
    res.status(200).json({ success: true, message: 'Ordre mis à jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Config (public GET, admin PUT) ────────────────────────────────────────────
exports.getConfig = async (req, res) => {
  try {
    let config = await Config.findOne({});
    if (!config) {
      config = await Config.create({});
    }
    res.status(200).json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { delaiResoumissionAffiche, maxProduitsAffiche } = req.body;
    const $set = { updatedAt: new Date(), updatedBy: req.user._id };
    if (delaiResoumissionAffiche !== undefined) $set.delaiResoumissionAffiche = delaiResoumissionAffiche;
    if (maxProduitsAffiche !== undefined) $set.maxProduitsAffiche = maxProduitsAffiche;
    const config = await Config.findOneAndUpdate(
      {},
      { $set },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Demandes par boutique (responsable) ───────────────────────────────────────
exports.getDemandesByBoutique = async (req, res) => {
  try {
    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null });
    if (!boutique) {
      return res.status(200).json({ success: true, data: [] });
    }
    const demandes = await DemandeAfficheProduit.find({ boutiqueId: boutique._id })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: demandes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Retirer de l'affiche (responsable) ───────────────────────────────────────
exports.retirerAfficheResponsable = async (req, res) => {
  try {
    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique introuvable' });
    }
    const demande = await DemandeAfficheProduit.findOne({
      _id: req.params.id,
      boutiqueId: boutique._id,
      statut: 'accepte'
    });
    if (!demande) {
      return res.status(404).json({ success: false, message: 'Demande introuvable ou non acceptée' });
    }
    await demande.deleteOne();
    res.status(200).json({ success: true, message: 'Produit retiré de l\'affiche' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};
