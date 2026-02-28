const PrixProduit = require('../models/PrixProduit');
const PrixVariantOption = require('../models/PrixVariantOption');

/**
 * Get the product price (prix_par_unite) as it was at a given date.
 * Finds the most recent PrixProduit record with createdAt <= date.
 * Falls back to currentPrix if no record exists before that date.
 *
 * @param {string|ObjectId} produitId
 * @param {Date} date
 * @param {number} [currentPrix] - fallback value
 * @returns {Promise<number|null>}
 */
async function getPrixProduitAtDate(produitId, date, currentPrix) {
  const record = await PrixProduit.findOne({
    produitId,
    createdAt: { $lte: date }
  }).sort({ createdAt: -1 });

  return record ? record.prix_par_unite : (currentPrix ?? null);
}

/**
 * Get the variant option price supplement as it was at a given date.
 * Finds the most recent PrixVariantOption record with createdAt <= date.
 * Falls back to currentSupplement if no record exists before that date.
 *
 * @param {string|ObjectId} variantId
 * @param {string|ObjectId} optionId
 * @param {Date} date
 * @param {number} [currentSupplement] - fallback value
 * @returns {Promise<number>}
 */
async function getPrixVariantOptionAtDate(variantId, optionId, date, currentSupplement) {
  const record = await PrixVariantOption.findOne({
    variantId,
    optionId,
    createdAt: { $lte: date }
  }).sort({ createdAt: -1 });

  return record !== null ? record.prix_supplement : (currentSupplement ?? 0);
}

module.exports = { getPrixProduitAtDate, getPrixVariantOptionAtDate };
