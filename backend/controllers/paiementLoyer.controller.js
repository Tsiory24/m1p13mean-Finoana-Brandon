const PaiementLoyer = require('../models/PaiementLoyer');
const Reservation = require('../models/Reservation');
const Boutique = require('../models/Boutique');
const Locale = require('../models/Locale');
const User = require('../models/User');
const Notification = require('../models/Notification');

// ── Helpers ────────────────────────────────────────────────────────────────

/** Normalise une date au 1er du mois, minuit UTC */
function normaliserMois(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Génère la liste des premiers-du-mois entre dateDebut et dateFin inclus */
function genererMois(dateDebut, dateFin) {
  const mois = [];
  const d = normaliserMois(dateDebut);
  const fin = normaliserMois(dateFin);
  while (d <= fin) {
    mois.push(new Date(d));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return mois;
}

// ── GET /api/paiements-loyer/reservation/:reservationId ───────────────────
// Retourne toutes les paiements pour une réservation + le détail mensuel du calendrier
exports.getCalendrierReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.reservationId)
      .populate('localeId')
      .populate({ path: 'boutiqueId', populate: { path: 'proprietaire', select: 'nom email' } });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation introuvable.' });
    }

    // Autorisation
    if (req.user.role !== 'admin') {
      const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null });
      if (!boutique || boutique._id.toString() !== reservation.boutiqueId._id.toString()) {
        return res.status(403).json({ success: false, message: 'Non autorisé.' });
      }
    }

    const paiements = await PaiementLoyer.find({ reservationId: req.params.reservationId })
      .sort({ createdAt: -1 });

    // Construire le calendrier mois par mois
    let calendrier = [];
    if (reservation.dateDebut && reservation.dateFin) {
      const mois = genererMois(reservation.dateDebut, reservation.dateFin);
      calendrier = mois.map(moisDate => {
        // Chercher si ce mois est couvert par un paiement
        const paiement = paiements.find(p =>
          p.moisConcernes.some(m => normaliserMois(m).getTime() === moisDate.getTime())
        );
        let statutMois = 'non_paye';
        let paiementId = null;
        let statutPaiement = null;
        if (paiement) {
          paiementId = paiement._id;
          statutPaiement = paiement.statut;
          if (paiement.statut === 'validé') statutMois = 'paye';
          else if (paiement.statut === 'en_attente') statutMois = 'en_attente';
          else statutMois = 'non_paye'; // refusé → non payé, peut re-soumettre
        }
        return {
          mois: moisDate,
          montant: reservation.prixMensuel || 0,
          statut: statutMois,
          paiementId,
          statutPaiement
        };
      });
    }

    const totalMois = calendrier.length;
    const totalPaye = calendrier.filter(m => m.statut === 'paye').length;
    const montantPaye = totalPaye * (reservation.prixMensuel || 0);
    const montantTotal = totalMois * (reservation.prixMensuel || 0);
    const resteAPayer = montantTotal - montantPaye;

    res.status(200).json({
      success: true,
      data: {
        reservation,
        paiements,
        calendrier,
        resume: { totalMois, totalPaye, montantPaye, montantTotal, resteAPayer }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.', error: err.message });
  }
};

// ── GET /api/paiements-loyer ───────────────────────────────────────────────
// Admin : toutes les demandes (paginées, filtrables, recherche, tri)
exports.getAll = async (req, res) => {
  try {
    const { statut, search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = req.query;
    const filter = {};
    if (statut) filter.statut = statut;

    const total = await PaiementLoyer.countDocuments(filter);
    let query = PaiementLoyer.find(filter)
      .populate({ path: 'reservationId', populate: 'localeId' })
      .populate({ path: 'boutiqueId', populate: { path: 'proprietaire', select: 'nom email' } });

    // Tri
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sortField = sortBy === 'montantTotal' ? 'montantTotal' : 'createdAt';
    query = query.sort({ [sortField]: sortDir });

    const allDocs = await query;

    // Filtre texte côté serveur (boutique nom ou local code) après populate
    const filtered = search
      ? allDocs.filter(p => {
          const boutiqueNom = p.boutiqueId?.nom?.toLowerCase() ?? '';
          const localCode = p.reservationId?.localeId?.code?.toLowerCase() ?? '';
          const q = search.toLowerCase();
          return boutiqueNom.includes(q) || localCode.includes(q);
        })
      : allDocs;

    const totalFiltered = filtered.length;
    const skip = (page - 1) * parseInt(limit);
    const paiements = filtered.slice(skip, skip + parseInt(limit));

    res.status(200).json({ success: true, data: { paiements, total: totalFiltered, page: +page, limit: +limit } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.', error: err.message });
  }
};

// ── GET /api/paiements-loyer/boutique ─────────────────────────────────────
// Responsable : ses propres demandes de paiement
exports.getMesBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null });
    if (!boutique) return res.status(200).json({ success: true, data: { paiements: [] } });

    const paiements = await PaiementLoyer.find({ boutiqueId: boutique._id })
      .populate({ path: 'reservationId', populate: 'localeId' })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { paiements } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.', error: err.message });
  }
};

// ── POST /api/paiements-loyer ──────────────────────────────────────────────
// Responsable : soumettre une demande de paiement pour un ou plusieurs mois
exports.creerPaiement = async (req, res) => {
  try {
    const { reservationId, moisConcernes, note } = req.body;

    if (!reservationId || !moisConcernes || moisConcernes.length === 0) {
      return res.status(400).json({ success: false, message: 'reservationId et moisConcernes sont requis.' });
    }

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Réservation introuvable.' });
    }
    if (reservation.statut !== 'validée') {
      return res.status(400).json({ success: false, message: 'Impossible de payer : la réservation n\'est pas validée.' });
    }

    // Vérifier que c'est la boutique du responsable connecté
    const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null });
    if (!boutique || boutique._id.toString() !== reservation.boutiqueId.toString()) {
      return res.status(403).json({ success: false, message: 'Non autorisé.' });
    }

    // Normaliser les mois
    const moisNormalises = moisConcernes.map(normaliserMois);

    // Vérifier qu'aucun de ces mois n'a déjà un paiement en_attente ou validé
    const existants = await PaiementLoyer.find({
      reservationId,
      statut: { $in: ['en_attente', 'validé'] }
    });

    const moisDejaCouverts = existants.flatMap(p =>
      p.moisConcernes.map(m => normaliserMois(m).getTime())
    );

    const conflit = moisNormalises.find(m => moisDejaCouverts.includes(m.getTime()));
    if (conflit) {
      return res.status(400).json({
        success: false,
        message: `Le mois ${conflit.toISOString().slice(0, 7)} a déjà un paiement en cours ou validé.`
      });
    }

    const montantTotal = moisNormalises.length * (reservation.prixMensuel || 0);

    const paiement = await PaiementLoyer.create({
      reservationId,
      boutiqueId: boutique._id,
      moisConcernes: moisNormalises,
      montantTotal,
      note: note || null
    });

    // Notifier les admins (une seule notification ciblant le rôle)
    try {
      const locale = await Locale.findById(reservation.localeId);
      await Notification.create({
        type: 'paiement_loyer_soumis',
        message: `La boutique "${boutique.nom}" a soumis une demande de paiement de loyer (${moisNormalises.length} mois) pour le local ${locale?.code || ''}.`,
        targetRole: 'admin',
        refId: paiement._id,
        refModel: 'PaiementLoyer',
        data: { paiementId: paiement._id, boutiqueId: boutique._id, reservationId: reservation._id }
      });
    } catch (_) {}

    res.status(201).json({ success: true, message: 'Demande de paiement soumise avec succès.', data: { paiement } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.', error: err.message });
  }
};

// ── PUT /api/paiements-loyer/:id/valider ──────────────────────────────────
exports.validerPaiement = async (req, res) => {
  try {
    const paiement = await PaiementLoyer.findById(req.params.id)
      .populate({ path: 'boutiqueId', populate: { path: 'proprietaire', select: 'nom _id' } })
      .populate({ path: 'reservationId', populate: 'localeId' });

    if (!paiement) return res.status(404).json({ success: false, message: 'Paiement introuvable.' });
    if (paiement.statut !== 'en_attente') {
      return res.status(400).json({ success: false, message: 'Ce paiement n\'est plus en attente.' });
    }

    paiement.statut = 'validé';
    paiement.traitePar = req.user._id;
    await paiement.save();

    // Notifier le responsable de la boutique
    try {
      if (paiement.boutiqueId?.proprietaire?._id) {
        await Notification.create({
          type: 'paiement_loyer_valide',
          message: `Votre paiement de loyer (${paiement.moisConcernes.length} mois) pour le local ${paiement.reservationId?.localeId?.code || ''} a été validé ✅.`,
          targetUser: paiement.boutiqueId.proprietaire._id,
          refId: paiement._id,
          refModel: 'PaiementLoyer',
          data: { paiementId: paiement._id, reservationId: paiement.reservationId?._id }
        });
      }
    } catch (_) {}

    res.status(200).json({ success: true, message: 'Paiement validé avec succès.', data: { paiement } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.', error: err.message });
  }
};

// ── PUT /api/paiements-loyer/:id/refuser ──────────────────────────────────
exports.refuserPaiement = async (req, res) => {
  try {
    const { motifRefus } = req.body;

    const paiement = await PaiementLoyer.findById(req.params.id)
      .populate({ path: 'boutiqueId', populate: { path: 'proprietaire', select: 'nom _id' } })
      .populate({ path: 'reservationId', populate: 'localeId' });

    if (!paiement) return res.status(404).json({ success: false, message: 'Paiement introuvable.' });
    if (paiement.statut !== 'en_attente') {
      return res.status(400).json({ success: false, message: 'Ce paiement n\'est plus en attente.' });
    }

    paiement.statut = 'refusé';
    paiement.motifRefus = motifRefus || null;
    paiement.traitePar = req.user._id;
    await paiement.save();

    // Notifier le responsable
    try {
      if (paiement.boutiqueId?.proprietaire?._id) {
        await Notification.create({
          type: 'paiement_loyer_refuse',
          message: `Votre paiement de loyer pour le local ${paiement.reservationId?.localeId?.code || ''} a été refusé ❌${motifRefus ? ' : ' + motifRefus : ''}.`,
          targetUser: paiement.boutiqueId.proprietaire._id,
          refId: paiement._id,
          refModel: 'PaiementLoyer',
          data: { paiementId: paiement._id, reservationId: paiement.reservationId?._id }
        });
      }
    } catch (_) {}

    res.status(200).json({ success: true, message: 'Paiement refusé.', data: { paiement } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.', error: err.message });
  }
};

// ── PUT /api/paiements-loyer/:id/annuler ─────────────────────────────────
// Seul le responsable_boutique propriétaire peut annuler, et seulement si en_attente
exports.annulerPaiement = async (req, res) => {
  try {
    const paiement = await PaiementLoyer.findById(req.params.id)
      .populate({ path: 'boutiqueId', populate: { path: 'proprietaire', select: '_id' } })
      .populate({ path: 'reservationId', populate: 'localeId' });

    if (!paiement) {
      return res.status(404).json({ success: false, message: 'Paiement introuvable.' });
    }

    // Vérifier que c'est bien la boutique du responsable connecté
    const boutiqueProprietaire = paiement.boutiqueId?.proprietaire?._id?.toString();
    if (!boutiqueProprietaire || boutiqueProprietaire !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Non autorisé.' });
    }

    if (paiement.statut !== 'en_attente') {
      return res.status(400).json({
        success: false,
        message: paiement.statut === 'validé'
          ? 'Ce paiement a déjà été validé et ne peut plus être annulé.'
          : 'Ce paiement ne peut plus être annulé.'
      });
    }

    // Marquer le paiement comme annulé
    paiement.statut = 'annulé';
    await paiement.save();

    // Soft-delete la notification admin correspondante (créée avec targetRole:'admin')
    await Notification.updateMany(
      { refId: paiement._id, refModel: 'PaiementLoyer', type: 'paiement_loyer_soumis', deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: 'Demande de paiement annulée. Les notifications envoyées aux admins ont été supprimées.',
      data: { paiement }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.', error: err.message });
  }
};
