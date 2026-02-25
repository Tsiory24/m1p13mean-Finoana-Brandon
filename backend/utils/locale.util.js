const Locale = require("../models/Locale");
const Reservation = require("../models/Reservation");
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

  const results = await Promise.all(
    locales.map(async (locale) => {
      // Récupère la dernière boutique
      const derniereBoutique = await getDerniereBoutique(locale._id);

      // Vérifie si le locale est disponible
      // On considère disponible si aucune réservation active ou future
      const now = new Date();
      const activeReservation = await Reservation.findOne({
        localeId: locale._id,
        dateDebut: { $lte: now },
        dateFin: { $gte: now },
        statut: "validée"
      });

      // Clone l'objet pour ne pas modifier le document Mongo
      const localeObj = locale.toObject();
      localeObj.disponibilite = activeReservation ? false : true;
      localeObj.disponibleLe = activeReservation ? activeReservation.dateFin : null;
      localeObj.derniereBoutique = derniereBoutique || null;

      return localeObj;
    })
  );

  return results;
}

/**
 * Crée une réservation pour un locale et une boutique
 * @param {ObjectId} localeId
 * @param {ObjectId} boutiqueId
 * @param {Number} montant
 */
async function reserver(localeId, boutiqueId, montant) {
  // Récupère le dernier contrat
  const dureeContrat = await DureeContrat.findOne().sort({ createdAt: -1 });
  if (!dureeContrat) throw new Error("Aucun contrat trouvé");

  // Récupère le locale
  const locale = await Locale.findOne({ _id: localeId, deletedAt: null });
  if (!locale) throw new Error("Locale introuvable");

  // Détermine la date de début
  let dateDebut = new Date();

  // Récupère la dernière réservation pour ce locale
  const lastReservation = await Reservation.findOne({ localeId })
    .sort({ dateFin: -1 });

  if (lastReservation) {
    // Commence le lendemain de la fin de la dernière réservation
    dateDebut = new Date(lastReservation.dateFin.getTime());
    dateDebut.setDate(dateDebut.getDate() + 1); // +1 jour
  }

  // Calcule la date de fin selon la durée du contrat
  const dateFin = new Date(dateDebut);
  dateFin.setMonth(dateFin.getMonth() + dureeContrat.duree);
  // const dateFin = new Date(dateDebut.getTime() + dureeContrat.duree * 24 * 60 * 60 * 1000);

  // Crée la réservation via la fonction utilitaire
  const reservation = await ReservationUtil.creerReservation({
    localeId,
    boutiqueId,
    dateDebut,
    dateFin,
    montant
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
