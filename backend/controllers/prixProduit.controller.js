const PrixProduit = require('../models/PrixProduit');
const Produit = require('../models/Produit');

exports.getHistoriquePrixByProduit = async (req, res) => {
  try {
    const produit = await Produit.findOne({ _id: req.params.produitId, deletedAt: null });
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    const historique = await PrixProduit.find({ produitId: req.params.produitId })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: historique });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
