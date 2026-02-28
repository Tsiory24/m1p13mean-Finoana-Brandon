const HorairesCentre = require('../models/HorairesCentre');
const HorairesExceptionnelsCentre = require('../models/HorairesExceptionnelsCentre');
const HorairesBoutique = require('../models/HorairesBoutique');
const HorairesExceptionnelsBoutique = require('../models/HorairesExceptionnelsBoutique');
const Boutique = require('../models/Boutique');
const { createLog } = require('../utils/logger');

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// Vérifie si une boutique est un restaurant (exclusion de la cascade centre)
function isRestaurant(boutique) {
  if (!boutique.categorieId) return false;
  const nom = typeof boutique.categorieId === 'object'
    ? boutique.categorieId.nom || ''
    : '';
  return nom.toLowerCase().includes('restaurant');
}

// Normalise une date à minuit UTC
function toDateOnly(dateStr) {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTRE — HORAIRES HABITUELS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Liste des horaires habituels du centre (7 jours)
// @route   GET /api/horaires/centre
// @access  Public
exports.getHorairesCentre = async (req, res) => {
  try {
    const horaires = await HorairesCentre.find().sort({ jour: 1 });
    // Retourner les 7 jours même si certains ne sont pas encore définis
    const result = JOURS.map(jour => {
      const found = horaires.find(h => h.jour === jour);
      return found || { jour, heure_ouverture: null, heure_fermeture: null, ferme: false };
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Créer ou modifier l'horaire d'un jour du centre
// @route   PUT /api/horaires/centre/:jour
// @access  Private (admin)
exports.upsertHoraireCentre = async (req, res) => {
  try {
    const { jour } = req.params;
    if (!JOURS.includes(jour)) {
      return res.status(400).json({ success: false, message: 'Jour invalide' });
    }

    const { heure_ouverture, heure_fermeture, ferme } = req.body;

    const horaire = await HorairesCentre.findOneAndUpdate(
      { jour },
      {
        heure_ouverture: ferme ? null : (heure_ouverture || null),
        heure_fermeture: ferme ? null : (heure_fermeture || null),
        ferme: !!ferme,
        updatedBy: req.user._id,
        updatedAt: new Date()
      },
      { upsert: true, new: true, runValidators: true }
    );

    await createLog({
      action: 'upsert_horaire_centre',
      type: 'update',
      utilisateur: req.user._id,
      details: { jour, ferme, heure_ouverture, heure_fermeture },
      statut: 'succès',
      message: `Horaire centre mis à jour pour ${jour}`
    }, req);

    res.json({ success: true, data: horaire });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CENTRE — EXCEPTIONS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Liste des exceptions du centre pour un mois donné
// @route   GET /api/horaires/centre/exceptions?annee=&mois=
// @access  Public
exports.getExceptionsCentre = async (req, res) => {
  try {
    const annee = parseInt(req.query.annee) || new Date().getUTCFullYear();
    const mois = parseInt(req.query.mois) || (new Date().getUTCMonth() + 1);

    const debut = new Date(Date.UTC(annee, mois - 1, 1));
    const fin = new Date(Date.UTC(annee, mois, 1));

    const exceptions = await HorairesExceptionnelsCentre.find({
      date: { $gte: debut, $lt: fin }
    }).sort({ date: 1 });

    res.json({ success: true, data: exceptions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Créer une exception pour le centre
// @route   POST /api/horaires/centre/exceptions
// @access  Private (admin)
exports.createExceptionCentre = async (req, res) => {
  try {
    const { date, heure_ouverture, heure_fermeture, ferme, motif } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'La date est obligatoire' });
    }

    const dateOnly = toDateOnly(date);

    const existing = await HorairesExceptionnelsCentre.findOne({ date: dateOnly });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Une exception existe déjà pour cette date' });
    }

    const exception = await HorairesExceptionnelsCentre.create({
      date: dateOnly,
      heure_ouverture: ferme ? null : (heure_ouverture || null),
      heure_fermeture: ferme ? null : (heure_fermeture || null),
      ferme: !!ferme,
      motif: motif || null,
      createdBy: req.user._id
    });

    await createLog({
      action: 'create_exception_centre',
      type: 'create',
      utilisateur: req.user._id,
      details: { date: dateOnly, ferme, heure_ouverture, heure_fermeture, motif },
      statut: 'succès',
      message: `Exception centre créée pour ${dateOnly.toISOString().slice(0, 10)}`
    }, req);

    res.status(201).json({ success: true, data: exception });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Une exception existe déjà pour cette date' });
    }
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Modifier une exception du centre
// @route   PUT /api/horaires/centre/exceptions/:id
// @access  Private (admin)
exports.updateExceptionCentre = async (req, res) => {
  try {
    const { id } = req.params;
    const { heure_ouverture, heure_fermeture, ferme, motif } = req.body;

    const exception = await HorairesExceptionnelsCentre.findById(id);
    if (!exception) {
      return res.status(404).json({ success: false, message: 'Exception non trouvée' });
    }

    exception.heure_ouverture = ferme ? null : (heure_ouverture || null);
    exception.heure_fermeture = ferme ? null : (heure_fermeture || null);
    exception.ferme = !!ferme;
    exception.motif = motif || null;
    await exception.save();

    res.json({ success: true, data: exception });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Supprimer une exception du centre
// @route   DELETE /api/horaires/centre/exceptions/:id
// @access  Private (admin)
exports.deleteExceptionCentre = async (req, res) => {
  try {
    const { id } = req.params;
    const exception = await HorairesExceptionnelsCentre.findByIdAndDelete(id);
    if (!exception) {
      return res.status(404).json({ success: false, message: 'Exception non trouvée' });
    }
    res.json({ success: true, message: 'Exception supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BOUTIQUE — HORAIRES HABITUELS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Horaires habituels d'une boutique (avec surcharge si centre fermé)
// @route   GET /api/horaires/boutiques/:boutiqueId
// @access  Public
exports.getHorairesBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;

    const boutique = await Boutique.findOne({ _id: boutiqueId, deletedAt: null })
      .populate('categorieId', 'nom');
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    const restaurant = isRestaurant(boutique);

    const [horairesB, horairesCentre] = await Promise.all([
      HorairesBoutique.find({ boutiqueId }).sort({ jour: 1 }),
      restaurant ? Promise.resolve([]) : HorairesCentre.find().sort({ jour: 1 })
    ]);

    const result = JOURS.map(jour => {
      const boutH = horairesB.find(h => h.jour === jour);
      const centreH = horairesCentre.find(h => h.jour === jour);

      // Cascade : si le centre est fermé et que la boutique n'est pas un restaurant
      if (!restaurant && centreH && centreH.ferme) {
        return {
          jour,
          heure_ouverture: null,
          heure_fermeture: null,
          ferme: true,
          fermePar: 'centre'
        };
      }

      if (boutH) {
        return {
          _id: boutH._id,
          jour,
          heure_ouverture: boutH.heure_ouverture,
          heure_fermeture: boutH.heure_fermeture,
          ferme: boutH.ferme,
          fermePar: boutH.ferme ? 'boutique' : null
        };
      }

      return { jour, heure_ouverture: null, heure_fermeture: null, ferme: false, fermePar: null };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Créer ou modifier l'horaire d'un jour pour une boutique
// @route   PUT /api/horaires/boutiques/:boutiqueId/:jour
// @access  Private (admin, responsable_boutique)
exports.upsertHoraireBoutique = async (req, res) => {
  try {
    const { boutiqueId, jour } = req.params;

    if (!JOURS.includes(jour)) {
      return res.status(400).json({ success: false, message: 'Jour invalide' });
    }

    const boutique = await Boutique.findOne({ _id: boutiqueId, deletedAt: null })
      .populate('categorieId', 'nom');
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    // Vérification d'accès pour responsable_boutique
    if (req.user.role === 'responsable_boutique' &&
        boutique.proprietaire?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Accès refusé : ce n\'est pas votre boutique' });
    }

    const { heure_ouverture, heure_fermeture, ferme } = req.body;

    const horaire = await HorairesBoutique.findOneAndUpdate(
      { boutiqueId, jour },
      {
        heure_ouverture: ferme ? null : (heure_ouverture || null),
        heure_fermeture: ferme ? null : (heure_fermeture || null),
        ferme: !!ferme,
        updatedBy: req.user._id,
        updatedAt: new Date()
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, data: horaire });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BOUTIQUE — EXCEPTIONS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Exceptions d'une boutique pour un mois donné (avec indication fermeture centre)
// @route   GET /api/horaires/boutiques/:boutiqueId/exceptions?annee=&mois=
// @access  Public
exports.getExceptionsBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const annee = parseInt(req.query.annee) || new Date().getUTCFullYear();
    const mois = parseInt(req.query.mois) || (new Date().getUTCMonth() + 1);

    const boutique = await Boutique.findOne({ _id: boutiqueId, deletedAt: null })
      .populate('categorieId', 'nom');
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    const debut = new Date(Date.UTC(annee, mois - 1, 1));
    const fin = new Date(Date.UTC(annee, mois, 1));

    const restaurant = isRestaurant(boutique);

    const [exceptionsB, exceptionsCentre] = await Promise.all([
      HorairesExceptionnelsBoutique.find({ boutiqueId, date: { $gte: debut, $lt: fin } }).sort({ date: 1 }),
      restaurant ? Promise.resolve([]) : HorairesExceptionnelsCentre.find({ date: { $gte: debut, $lt: fin } }).sort({ date: 1 })
    ]);

    // Fusionner : les exceptions centre sont ajoutées avec fermePar: 'centre' si pas déjà défini par boutique
    const result = [...exceptionsB.map(e => ({ ...e.toObject(), fermePar: e.ferme ? 'boutique' : null }))];

    if (!restaurant) {
      exceptionsCentre.forEach(ec => {
        const boutDate = exceptionsB.find(eb =>
          eb.date.toISOString().slice(0, 10) === ec.date.toISOString().slice(0, 10)
        );
        if (!boutDate && ec.ferme) {
          result.push({
            _id: null,
            date: ec.date,
            heure_ouverture: null,
            heure_fermeture: null,
            ferme: true,
            motif: ec.motif,
            fermePar: 'centre'
          });
        }
      });
    }

    result.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ success: true, data: result, exceptionsCentre: restaurant ? [] : exceptionsCentre });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Créer une exception pour une boutique
// @route   POST /api/horaires/boutiques/:boutiqueId/exceptions
// @access  Private (admin, responsable_boutique)
exports.createExceptionBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;

    const boutique = await Boutique.findOne({ _id: boutiqueId, deletedAt: null });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    if (req.user.role === 'responsable_boutique' &&
        boutique.proprietaire?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Accès refusé : ce n\'est pas votre boutique' });
    }

    const { date, heure_ouverture, heure_fermeture, ferme, motif } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: 'La date est obligatoire' });
    }

    const dateOnly = toDateOnly(date);

    const exception = await HorairesExceptionnelsBoutique.create({
      boutiqueId,
      date: dateOnly,
      heure_ouverture: ferme ? null : (heure_ouverture || null),
      heure_fermeture: ferme ? null : (heure_fermeture || null),
      ferme: !!ferme,
      motif: motif || null,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: exception });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Une exception existe déjà pour cette date' });
    }
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Modifier une exception d'une boutique
// @route   PUT /api/horaires/boutiques/:boutiqueId/exceptions/:id
// @access  Private (admin, responsable_boutique)
exports.updateExceptionBoutique = async (req, res) => {
  try {
    const { boutiqueId, id } = req.params;

    const boutique = await Boutique.findOne({ _id: boutiqueId, deletedAt: null });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    if (req.user.role === 'responsable_boutique' &&
        boutique.proprietaire?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const exception = await HorairesExceptionnelsBoutique.findOne({ _id: id, boutiqueId });
    if (!exception) {
      return res.status(404).json({ success: false, message: 'Exception non trouvée' });
    }

    const { heure_ouverture, heure_fermeture, ferme, motif } = req.body;
    exception.heure_ouverture = ferme ? null : (heure_ouverture || null);
    exception.heure_fermeture = ferme ? null : (heure_fermeture || null);
    exception.ferme = !!ferme;
    exception.motif = motif || null;
    await exception.save();

    res.json({ success: true, data: exception });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Supprimer une exception d'une boutique
// @route   DELETE /api/horaires/boutiques/:boutiqueId/exceptions/:id
// @access  Private (admin, responsable_boutique)
exports.deleteExceptionBoutique = async (req, res) => {
  try {
    const { boutiqueId, id } = req.params;

    const boutique = await Boutique.findOne({ _id: boutiqueId, deletedAt: null });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    if (req.user.role === 'responsable_boutique' &&
        boutique.proprietaire?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const exception = await HorairesExceptionnelsBoutique.findOneAndDelete({ _id: id, boutiqueId });
    if (!exception) {
      return res.status(404).json({ success: false, message: 'Exception non trouvée' });
    }

    res.json({ success: true, message: 'Exception supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
