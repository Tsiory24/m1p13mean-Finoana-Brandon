const Boutique = require('../models/Boutique');
const Locale = require('../models/Locale');
const Reservation = require('../models/Reservation');
const PaiementLoyer = require('../models/PaiementLoyer');
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
