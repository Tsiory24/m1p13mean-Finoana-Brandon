const Locale = require("../models/Locale");
const Boutique = require("../models/Boutique");
const LocaleUtil = require("../utils/locale.util");

// GET all Localeses
exports.getAllLocales = async (req, res) => {
  try {
    const locales = await Locale.find({ deletedAt: null }).populate("boutiqueId");
    res.status(200).json({
        success: true,
        data: {
          locales
        }
      });
  } catch (err) {
    res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des locales',
        error: err.message
    });
  }
};

exports.getAllLocalesAvecDisponibilite = async (req, res) => {
  try {
    const locales = await LocaleUtil.getLocalesWithDisponibilite();
    res.status(200).json({
        success: true,
        data: {
          locales
        }
      });
  } catch (err) {
    res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des locales',
        error: err.message
    });
  }
};

// GET Locales by ID
exports.getLocaleById = async (req, res) => {
  try {
    const locale = await Locale.findOne({_id : req.params.id, deletedAt: null }).populate("boutiqueId");
    if (!locale) return res.status(404).json({ message: "Locale not found" });
    // res.json(Locales);
    res.status(200).json({
        success: true,
        data: {
          locale
        }
      });
  } catch (err) {
    res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de Locale',
        error: err.message
    });
  }
};

// CREATE Locales
exports.createLocale = async (req, res) => {
  const { code, zone, surface, etat } = req.body;
  const locale = new Locale({ code, zone, surface, etat, boutiqueId: null });

  try {
    const newLocale = await locale.save();
    // res.status(201).json(newLocales);
    res.status(201).json({
        success: true,
        data: {
          newLocale
        }
      });
  } catch (err) {
    res.status(400).json({
        success: false,
        message: 'Erreur lors de la création de Localese',
        error: err.message
    });
  }
};

// UPDATE Locales
exports.updateLocale = async (req, res) => {
  try {
    const locale = await Locale.findOne({_id : req.params.id, deletedAt: null });
    if (!locale) return res.status(404).json({ message: "Locale not found" });

    const { code, zone, surface, etat, boutiqueId } = req.body;

    if (code !== undefined) locale.code = code;
    if (zone !== undefined) locale.zone = zone;
    if (surface !== undefined) locale.surface = surface;
    if (etat !== undefined) locale.etat = etat;
    if (boutiqueId !== undefined) locale.boutiqueId = boutiqueId;

    const updatedLocale = await locale.save();
    res.status(200).json({
        success: true,
        data: {
          updatedLocale
        }
      });
  } catch (err) {
    res.status(400).json({
        success: false,
        message: 'Erreur lors de la modification de Locale',
        error: err.message
    });
  }
};

// DELETE Locales
exports.deleteLocale = async (req, res) => {
  try {
    const locale = await Locale.findOne({ _id: req.params.id, deletedAt: null });
    if (!locale) {
      return res.status(404).json({
        success: false,
        message: "Locale non trouvée"
      });
    }

    // Si la locale est assignée à une boutique, on peut aussi dissocier
    if (locale.boutiqueId) {
      const boutique = await Boutique.findById(locale.boutiqueId);
      if (boutique) {
        boutique.localeId = null;
        await boutique.save();
      }
      locale.boutiqueId = null;
    }

    // Soft delete
    locale.deletedAt = new Date();

    await locale.save();

    res.status(200).json({
      success: true,
      message: "Locale supprimée (soft delete) avec succès",
      data : {
        locale
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la locale",
      error: err.message
    });
  }
};




exports.assignnerBoutique = async (req, res) => {
  try {
    const locale = await Locale.findOne({_id : req.params.id, deletedAt: null });
    if (!locale) return res.status(404).json({ message: "locale not found" });
    const boutique = req.boutique; // récupéré depuis le middleware

   

    locale.boutiqueId = boutique._id;
    boutique.localeId = locale._id;

    const updatedLocale = await locale.save();
    const updatedBoutique = await boutique.save();

    res.status(200).json({
      success: true,
      data: {
        updatedLocale,
        updatedBoutique
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'assignation de la box à la boutique',
      error: err.message
    });
  }
};

// Crée une réservation pour un locale donné
exports.reserverLocale = async (req, res) => {
  try {
    const { localeId, boutiqueId, montant } = req.body;

    if (!localeId || !boutiqueId) {
      return res.status(400).json({
        success: false,
        message: "localeId et boutiqueId sont requis"
      });
    }

    // Appel de la fonction utilitaire
    const reservation = await LocaleUtil.reserver(localeId, boutiqueId, montant || 0);

    res.status(201).json({
      success: true,
      message: "Réservation créée avec succès",
      data: {
        reservation
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la réservation",
      error: err.message
    });
  }
};