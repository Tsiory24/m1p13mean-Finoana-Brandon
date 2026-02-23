const DureeContrat = require("../models/DureeContrat");

// GET all DureeContrats
exports.getAllDureeContrats = async (req, res) => {
  try {
    const durees = await DureeContrat.find();
    res.status(200).json({
      success: true,
      data: { durees }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des durées de contrat",
      error: err.message
    });
  }
};

// GET DureeContrat by ID
exports.getDureeContratById = async (req, res) => {
  try {
    const duree = await DureeContrat.findById(req.params.id);
    if (!duree) return res.status(404).json({ message: "Durée de contrat non trouvée" });

    res.status(200).json({
      success: true,
      data: { duree }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la durée de contrat",
      error: err.message
    });
  }
};

// CREATE DureeContrat
exports.createDureeContrat = async (req, res) => {
  const { duree } = req.body;
  const newDuree = new DureeContrat({ duree });

  try {
    const savedDuree = await newDuree.save();
    res.status(201).json({
      success: true,
      data: { savedDuree }
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Erreur lors de la création de la durée de contrat",
      error: err.message
    });
  }
};

// UPDATE DureeContrat
exports.updateDureeContrat = async (req, res) => {
  try {
    const duree = await DureeContrat.findById(req.params.id);
    if (!duree) return res.status(404).json({ message: "Durée de contrat non trouvée" });

    const { duree: newDureeValue } = req.body;
    if (newDureeValue !== undefined) duree.duree = newDureeValue;

    const updatedDuree = await duree.save();
    res.status(200).json({
      success: true,
      data: { updatedDuree }
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Erreur lors de la mise à jour de la durée de contrat",
      error: err.message
    });
  }
};

// DELETE DureeContrat
exports.deleteDureeContrat = async (req, res) => {
  try {
    const duree = await DureeContrat.findById(req.params.id);
    if (!duree) return res.status(404).json({ message: "Durée de contrat non trouvée" });

    await duree.deleteOne();
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la durée de contrat",
      error: err.message
    });
  }
};
