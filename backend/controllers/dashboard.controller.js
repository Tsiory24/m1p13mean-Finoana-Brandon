const Boutique = require('../models/Boutique');
const Locale = require('../models/Locale');
const Reservation = require('../models/Reservation');
const PaiementLoyer = require('../models/PaiementLoyer');
const Commande = require('../models/Commande');
const Produit = require('../models/Produit');
const StockMouvement = require('../models/StockMouvement');
const User = require('../models/User');
const LocaleUtil = require('../utils/locale.util');

// ── Helpers ────────────────────────────────────────────────────────────────

function normaliserMois(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

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

/**
 * GET /api/dashboard/stats  — admin uniquement
 * Retourne les statistiques globales pour la vue d'ensemble du dashboard admin
 */
exports.getStats = async (req, res) => {
  try {
    const now = new Date();

    // Boutiques qui ont encore au moins une réservation active (validée, non expirée)
    const boutiquesAvecLocalIds = await Reservation.distinct('boutiqueId', {
      statut: 'validée',
      $or: [
        { dateFin: null },
        { dateFin: { $gte: now } }
      ]
    });
    const totalBoutiquesAvecLocal = boutiquesAvecLocalIds.length;

    // Total des locaux (non supprimés)
    const totalLocaux = await Locale.countDocuments({ deletedAt: null });

    // Locaux sans locataire = disponibilite:true (aucune réservation validée ou en attente active)
    const tousLesLocaux = await LocaleUtil.getLocalesWithDisponibilite(null);
    const totalLocauxSansLocataire = tousLesLocaux.filter(l => l.disponibilite === true).length;

    // Total des utilisateurs inscrits
    const totalUtilisateurs = await User.countDocuments();

    res.json({
      success: true,
      data: {
        totalBoutiquesAvecLocal,
        totalLocaux,
        totalLocauxSansLocataire,
        totalUtilisateurs
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/dashboard/loyers-stats  — admin uniquement
 * Retourne :
 *   - chart : { labels, values } — montants validés groupés par mois YYYY-MM
 *   - boutiques : [{ boutiqueNom, totalDu, totalPaye, totalImpaye }]
 */
exports.getLoyersStats = async (req, res) => {
  try {
    const anneeParam = req.query.annee ? parseInt(req.query.annee) : null;

    // Toutes les réservations validées avec leur boutique
    const reservations = await Reservation.find({ statut: 'validée' })
      .populate('boutiqueId', 'nom');

    // Tous les paiements validés
    const paiements = await PaiementLoyer.find({ statut: 'validé' });

    // ── Collecter toutes les années disponibles (supprimé côté front) ──────\n\n    // Helper pour vérifier si un mois (Date UTC) tombe dans l'année filtrée
    const matchAnnee = (moisDate) => !anneeParam || moisDate.getUTCFullYear() === anneeParam;
    const matchAnneeKey = (key) => !anneeParam || key.startsWith(String(anneeParam));

    // ── Par boutique : calcul totalDu (filtré par année) ───────────────────
    const boutiquesMap = {};

    for (const r of reservations) {
      const boutiqueId = r.boutiqueId?._id?.toString();
      if (!boutiqueId) continue;

      if (!boutiquesMap[boutiqueId]) {
        boutiquesMap[boutiqueId] = {
          boutiqueId,
          boutiqueNom: r.boutiqueId?.nom || '—',
          totalDu: 0,
          totalPaye: 0,
        };
      }

      if (r.dateDebut && r.dateFin && r.prixMensuel) {
        const moisListe = genererMois(r.dateDebut, r.dateFin);
        const moisFiltres = moisListe.filter(matchAnnee);
        boutiquesMap[boutiqueId].totalDu += moisFiltres.length * r.prixMensuel;
      }
    }

    // ── Ajouter les paiements validés (filtré par année) ──────────────────
    for (const p of paiements) {
      const boutiqueId = p.boutiqueId?.toString();
      if (!boutiqueId || !boutiquesMap[boutiqueId]) continue;
      // Ne compter que les mois du paiement qui tombent dans l'année
      const nbMois = p.moisConcernes.length || 1;
      const montantParMois = p.montantTotal / nbMois;
      const moisDansAnnee = p.moisConcernes.filter(m => matchAnnee(new Date(m))).length;
      boutiquesMap[boutiqueId].totalPaye += moisDansAnnee * montantParMois;
    }

    const boutiques = Object.values(boutiquesMap).map(b => ({
      boutiqueNom: b.boutiqueNom,
      totalDu: Math.round(b.totalDu),
      totalPaye: Math.round(b.totalPaye),
      totalImpaye: Math.max(0, Math.round(b.totalDu - b.totalPaye)),
    }));

    // ── Chart : payé et dû par mois (filtré par année) ───────────────────
    const chartPaye = {};
    const chartDu = {};

    for (const r of reservations) {
      if (r.dateDebut && r.dateFin && r.prixMensuel) {
        const moisListe = genererMois(r.dateDebut, r.dateFin);
        for (const mois of moisListe) {
          if (!matchAnnee(mois)) continue;
          const key = mois.toISOString().slice(0, 7);
          chartDu[key] = (chartDu[key] || 0) + r.prixMensuel;
        }
      }
    }

    for (const p of paiements) {
      const nbMois = p.moisConcernes.length || 1;
      const montantParMois = p.montantTotal / nbMois;
      for (const mois of p.moisConcernes) {
        const key = new Date(mois).toISOString().slice(0, 7);
        if (!matchAnneeKey(key)) continue;
        chartPaye[key] = (chartPaye[key] || 0) + montantParMois;
      }
    }

    const allMonths = Array.from(new Set([...Object.keys(chartDu), ...Object.keys(chartPaye)])).sort();

    res.json({
      success: true,
      data: {
        boutiques,
        chart: {
          labels: allMonths,
          paye: allMonths.map(m => Math.round(chartPaye[m] || 0)),
          impaye: allMonths.map(m => Math.max(0, Math.round((chartDu[m] || 0) - (chartPaye[m] || 0)))),
        },
      },
    });
  } catch (error) {
    console.error('Dashboard loyers-stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des stats loyers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/dashboard/responsable-stats  — responsable_boutique uniquement
 * Params: ?annee=YYYY (optionnel)
 * Retourne :
 *   - chiffreAffaires   : somme montant_total des commandes confirmees/livrees
 *   - totalLoyersPaye   : somme des paiements de loyer validés
 *   - benefice          : chiffreAffaires – totalLoyersPaye
 *   - chart             : { labels[], ventes[] } — CA mensuel (courbe)
 *   - meilleurProduit   : { nom, image, quantiteVendue, montant } du mois en cours
 */
exports.getResponsableStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const anneeParam = req.query.annee ? parseInt(req.query.annee) : null;

    // Boutiques du responsable
    const boutiques = await Boutique.find({ proprietaire: userId, deletedAt: null }).select('_id nom');
    const boutiqueIds = boutiques.map(b => b._id);

    if (boutiqueIds.length === 0) {
      return res.json({
        success: true,
        data: {
          chiffreAffaires: 0,
          totalLoyersPaye: 0,
          benefice: 0,
          totalProduits: 0,
          totalCommandes: 0,
          totalStockProduits: 0,
          chart: { labels: [], ventes: [] },
          meilleurProduit: null,
        },
      });
    }

    // ── 0. Compteurs globaux (non filtrés par année) ──────────────────
    const [totalProduits, totalCommandes, stockProduitIds] = await Promise.all([
      Produit.countDocuments({ boutiqueId: { $in: boutiqueIds }, deletedAt: null }),
      Commande.countDocuments({ boutiqueId: { $in: boutiqueIds } }),
      StockMouvement.distinct('produitId', { boutiqueId: { $in: boutiqueIds } }),
    ]);
    const totalStockProduits = stockProduitIds.length;

    // ── Filtre date par année ──────────────────────────────────────────
    const dateFilter = {};
    if (anneeParam) {
      dateFilter.date_commande = {
        $gte: new Date(Date.UTC(anneeParam, 0, 1)),
        $lt: new Date(Date.UTC(anneeParam + 1, 0, 1)),
      };
    }

    // ── 1. Chiffre d'affaires ──────────────────────────────────────────
    // Une "vente" = commande entièrement payée (reste_a_payer: 0)
    const commandesCA = await Commande.aggregate([
      {
        $match: {
          boutiqueId: { $in: boutiqueIds },
          statut_commande: { $in: ['confirmee', 'livree'] },
          reste_a_payer: 0,
          ...dateFilter,
        },
      },
      { $group: { _id: null, total: { $sum: '$montant_total' } } },
    ]);
    const chiffreAffaires = commandesCA[0]?.total || 0;

    // ── 2. Total loyers payés ──────────────────────────────────────────
    const paiements = await PaiementLoyer.find({
      boutiqueId: { $in: boutiqueIds },
      statut: 'validé',
    });

    let totalLoyersPaye = 0;
    if (anneeParam) {
      for (const p of paiements) {
        const nbMois = p.moisConcernes.length || 1;
        const montantParMois = p.montantTotal / nbMois;
        const moisDansAnnee = p.moisConcernes.filter(
          m => new Date(m).getUTCFullYear() === anneeParam
        ).length;
        totalLoyersPaye += moisDansAnnee * montantParMois;
      }
    } else {
      totalLoyersPaye = paiements.reduce((sum, p) => sum + p.montantTotal, 0);
    }
    totalLoyersPaye = Math.round(totalLoyersPaye);

    // ── 3. Bénéfice ────────────────────────────────────────────────────
    const benefice = Math.round(chiffreAffaires - totalLoyersPaye);

    // ── 4. Chart ventes mensuelles ─────────────────────────────────────
    const chartMatch = {
      boutiqueId: { $in: boutiqueIds },
      statut_commande: { $in: ['confirmee', 'livree'] },
      reste_a_payer: 0,
      ...dateFilter,
    };

    const chartAgg = await Commande.aggregate([
      { $match: chartMatch },
      {
        $group: {
          _id: {
            year: { $year: '$date_commande' },
            month: { $month: '$date_commande' },
          },
          total: { $sum: '$montant_total' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const chartLabels = chartAgg.map(
      r => `${r._id.year}-${String(r._id.month).padStart(2, '0')}`
    );
    const chartVentes = chartAgg.map(r => Math.round(r.total));

    // ── 5. Meilleur produit du mois (sélectionnable) ──────────────────
    const now = new Date();
    const topMoisParam = req.query.topMois ? parseInt(req.query.topMois) : null;
    const topAnneeParam = req.query.topAnnee ? parseInt(req.query.topAnnee) : null;
    const topAnnee = (topAnneeParam && topAnneeParam >= 2015) ? topAnneeParam : now.getUTCFullYear();
    const topMoisIndex = (topMoisParam && topMoisParam >= 1 && topMoisParam <= 12) ? topMoisParam - 1 : now.getUTCMonth();
    const debutMois = new Date(Date.UTC(topAnnee, topMoisIndex, 1));
    const finMois = new Date(Date.UTC(topAnnee, topMoisIndex + 1, 1));

    const topProduitAgg = await Commande.aggregate([
      {
        $match: {
          boutiqueId: { $in: boutiqueIds },
          statut_commande: { $in: ['confirmee', 'livree'] },
          reste_a_payer: 0,
          date_commande: { $gte: debutMois, $lt: finMois },
        },
      },
      { $unwind: '$lignes' },
      {
        $group: {
          _id: '$lignes.produitId',
          quantiteVendue: { $sum: '$lignes.quantite' },
          montant: { $sum: '$lignes.sous_total' },
        },
      },
      { $sort: { quantiteVendue: -1 } },
      { $limit: 1 },
    ]);

    let meilleurProduit = null;
    if (topProduitAgg.length > 0) {
      const produit = await Produit.findById(topProduitAgg[0]._id).select('nom images');
      if (produit) {
        meilleurProduit = {
          nom: produit.nom,
          image: produit.images?.[0] || null,
          quantiteVendue: topProduitAgg[0].quantiteVendue,
          montant: Math.round(topProduitAgg[0].montant),
        };
      }
    }

    res.json({
      success: true,
      data: {
        chiffreAffaires: Math.round(chiffreAffaires),
        totalLoyersPaye,
        benefice,
        totalProduits,
        totalCommandes,
        totalStockProduits,
        chart: { labels: chartLabels, ventes: chartVentes },
        meilleurProduit,
      },
    });
  } catch (error) {
    console.error('Dashboard responsable-stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques responsable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
