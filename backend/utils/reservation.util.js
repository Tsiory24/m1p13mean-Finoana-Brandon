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
  if (!localeId || !boutiqueId) {
    throw new Error("localeId et boutiqueId sont requis");
  }

  const reservation = new Reservation({
    localeId,
    boutiqueId,
    dateDebut: dateDebut || null,
    dateFin: dateFin || null,
    montant: montant || 0,
    statut: "en_attente"
  });

  return await reservation.save();
};

module.exports = {
  creerReservation
};