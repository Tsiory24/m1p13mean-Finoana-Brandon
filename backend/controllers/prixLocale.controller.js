const PrixLocale = require('../models/PrixLocale');

// GET all (admin)
exports.getAllPrix = async (req, res) => {
  try {
    const prix = await PrixLocale.find({ deletedAt: null })
      .sort({ created_at: -1 })
      .populate('valider_par', 'nom prenom email');
    res.json({ success: true, data: { prix } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// GET current (latest active price) — accessible to all authenticated users
exports.getCurrentPrix = async (req, res) => {
  try {
    const prix = await PrixLocale.findOne({ deletedAt: null })
      .sort({ created_at: -1 })
      .populate('valider_par', 'nom prenom email');
    res.json({ success: true, data: { prix } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// GET by ID
exports.getPrixById = async (req, res) => {
  try {
    const prix = await PrixLocale.findOne({ _id: req.params.id, deletedAt: null })
      .populate('valider_par', 'nom prenom email');
    if (!prix) return res.status(404).json({ success: false, message: 'Prix non trouvé' });
    res.json({ success: true, data: { prix } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// CREATE (admin)
exports.createPrix = async (req, res) => {
  try {
    const { prix_par_m2 } = req.body;
    if (prix_par_m2 === undefined || prix_par_m2 === null || isNaN(Number(prix_par_m2))) {
      return res.status(400).json({ success: false, message: 'Le prix par m² est obligatoire' });
    }
    if (Number(prix_par_m2) < 0) {
      return res.status(400).json({ success: false, message: 'Le prix doit être positif' });
    }

    const prix = await PrixLocale.create({
      prix_par_m2: Number(prix_par_m2),
      valider_par: req.user._id
    });

    const populated = await prix.populate('valider_par', 'nom prenom email');
    res.status(201).json({ success: true, data: { prix: populated } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// UPDATE (admin)
exports.updatePrix = async (req, res) => {
  try {
    const prix = await PrixLocale.findOne({ _id: req.params.id, deletedAt: null });
    if (!prix) return res.status(404).json({ success: false, message: 'Prix non trouvé' });

    const { prix_par_m2 } = req.body;
    if (prix_par_m2 !== undefined) {
      if (isNaN(Number(prix_par_m2)) || Number(prix_par_m2) < 0) {
        return res.status(400).json({ success: false, message: 'Prix invalide' });
      }
      prix.prix_par_m2 = Number(prix_par_m2);
    }
    prix.valider_par = req.user._id;

    await prix.save();
    const populated = await prix.populate('valider_par', 'nom prenom email');
    res.json({ success: true, data: { prix: populated } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// SOFT DELETE (admin)
exports.deletePrix = async (req, res) => {
  try {
    const prix = await PrixLocale.findOne({ _id: req.params.id, deletedAt: null });
    if (!prix) return res.status(404).json({ success: false, message: 'Prix non trouvé' });

    prix.deletedAt = new Date();
    await prix.save();

    res.json({ success: true, message: 'Prix supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};
