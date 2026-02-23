const Reservation = require("../models/Reservation");



/**
 * Créer une réservation après assignation locale/boutique
 * @param {ObjectId} localeId
 * @param {ObjectId} boutiqueId
 * @param {Date} dateDebut
 * @param {Date} dateFin
 * @param {Number} montant
 * @returns {Promise<Reservation>}
 */
const creerReservation = async ({
  localeId,
  boutiqueId,
  dateDebut,
  dateFin,
  montant
}) => {
  if (!localeId || !boutiqueId || !dateDebut || !dateFin || montant == null) {
    throw new Error("Paramètres manquants pour la réservation");
  }

  const reservation = new Reservation({
    localeId,
    boutiqueId,
    dateDebut,
    dateFin,
    montant,
    statut: "en_attente" // ou "en_attente" selon ton besoin
  });

  return await reservation.save();
};

module.exports = {
  creerReservation
};