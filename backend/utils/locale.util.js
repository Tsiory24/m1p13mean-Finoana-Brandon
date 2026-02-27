const Locale = require("../models/Locale");
const Reservation = require("../models/Reservation");
const PrixLocale = require("../models/PrixLocale");
const DureeContrat = require("../models/DureeContrat");
const ReservationUtil = require("./reservation.util");
// const Boutique = require("../models/Boutique");

/**
 * Récupère la dernière boutique qui a occupé un locale
 */
async function getDerniereBoutique(localeId) {
  // On cherche la réservation la plus récente pour ce locale
  const lastReservation = await Reservation.find({ localeId : localeId , statut: "validée" })
    .sort({ dateFin: -1 }) // La plus récente à la fin
    .limit(1)
    .populate("boutiqueId");

  if (lastReservation.length === 0) return null; // Aucune réservation
  return lastReservation[0].boutiqueId; // Retourne la boutique
}

/**
 * Boucle sur tous les locales et ajoute le champ 'disponibilite'
 */
async function getLocalesWithDisponibilite() {
  const locales = await Locale.find({ deletedAt: null });

  // Fetch the latest active price once for all locales
  const latestPrix = await PrixLocale.findOne({ deletedAt: null }).sort({ created_at: -1 });
  const prixParm2 = latestPrix ? latestPrix.prix_par_m2 : 0;

  const results = await Promise.all(
    locales.map(async (locale) => {
      // Récupère la dernière boutique
      const derniereBoutique = await getDerniereBoutique(locale._id);

      // Vérifie si le locale est disponible
      // Indisponible si réservation validée active OU réservation en_attente
      const now = new Date();
      const pendingReservation = await Reservation.findOne({
        localeId: locale._id,
        statut: "en_attente"
      });

      const activeReservation = await Reservation.findOne({
        localeId: locale._id,
        dateDebut: { $lte: now },
        dateFin: { $gte: now },
        statut: "validée"
      });

      const unavailableReservation = pendingReservation || activeReservation;

      // Clone l'objet pour ne pas modifier le document Mongo
      const localeObj = locale.toObject();
      localeObj.disponibilite = unavailableReservation ? false : true;
      localeObj.disponibleLe = activeReservation ? activeReservation.dateFin : null;
      localeObj.enAttente = !!pendingReservation;
      localeObj.derniereBoutique = derniereBoutique || null;
      localeObj.prixParm2 = prixParm2;

      return localeObj;
    })
  );

  return results;
}

/**
 * Crée une réservation pour un locale et une boutique (sans dates - à fixer lors de la validation)
 * @param {ObjectId} localeId
 * @param {ObjectId} boutiqueId
 */
async function reserver(localeId, boutiqueId) {
  // Vérifie le locale
  const locale = await Locale.findOne({ _id: localeId, deletedAt: null });
  if (!locale) throw new Error("Locale introuvable");

  // Vérifie qu'il n'y a pas déjà une réservation en attente ou active pour ce locale
  const existing = await Reservation.findOne({
    localeId,
    statut: { $in: ["en_attente", "validée"] },
    $or: [
      { dateFin: null },
      { dateFin: { $gte: new Date() } }
    ]
  });
  if (existing) throw new Error("Ce locale a déjà une réservation active ou en attente");

  // Récupère le dernier prix au m² et la durée de contrat en vigueur
  const latestPrix = await PrixLocale.findOne({ deletedAt: null }).sort({ created_at: -1 });
  const latestDuree = await DureeContrat.findOne().sort({ createdAt: -1 });

  const prixParm2 = latestPrix ? latestPrix.prix_par_m2 : 0;
  const dureeLocation = latestDuree ? latestDuree.duree : null;
  const prixMensuel = prixParm2 * locale.surface;

  // Crée la réservation sans dates (elles seront fixées par l'admin lors de la validation)
  const reservation = await ReservationUtil.creerReservation({
    localeId,
    boutiqueId,
    prixMensuel,
    dureeLocation
  });

  return reservation;
}

// Exemple d'utilisation
// async function example() {
//   const localesAvecDispo = await getLocalesWithDisponibilite();
//   console.log(localesAvecDispo);
// }

module.exports = {
  getDerniereBoutique,
  getLocalesWithDisponibilite,
  reserver
};
