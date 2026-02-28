# Fonctionnalité : Gestion de l'Historique des Prix

## Vue d'ensemble

Cette fonctionnalité permet de modifier le prix d'un produit et/ou le supplément d'une option de variant, tout en conservant un historique complet des changements. Les commandes passées ne sont jamais affectées car le `prix_unitaire` est dénormalisé au moment de la création d'une commande.

## Architecture

### Modèles

#### `PrixProduit` (existant)
Enregistre chaque changement de `prix_actuel` d'un produit.
- Crée une entrée à la **création** du produit
- Crée une entrée à chaque **modification du prix**
- Utilisé par `getPrixProduitAtDate(produitId, date)` pour retrouver le prix à une date donnée

#### `PrixVariantOption` (nouveau)
Enregistre chaque changement de `prix_supplement` d'une option de variant.
- `variantId` : référence au `VariantProduit`
- `optionId` : `_id` du sous-document option
- `optionValeur` : valeur lisible (ex: "M", "Rouge") dénormalisée pour l'historique
- `prix_supplement` : valeur **après** le changement
- `createdAt` : timestamp

### Utilitaire `utils/prixUtils.js`

```javascript
getPrixProduitAtDate(produitId, date, currentPrix)
// Retourne le prix du produit tel qu'il était à `date`
// Cherche dans PrixProduit la dernière entrée avec createdAt <= date
// Fallback sur currentPrix si aucune entrée antérieure n'existe

getPrixVariantOptionAtDate(variantId, optionId, date, currentSupplement)
// Retourne le prix_supplement de l'option tel qu'il était à `date`
// Cherche dans PrixVariantOption la dernière entrée avec createdAt <= date
// Fallback sur currentSupplement si aucune entrée antérieure n'existe
```

### Usage typique dans les commandes

```javascript
// Dans commande.controller.js, au lieu de produit.prix_actuel :
const prix = await getPrixProduitAtDate(produitId, commandeDate, produit.prix_actuel);
```

## API Endpoints

### Produits — Prix
- `GET /api/produits/:produitId/prix` — Historique complet des prix d'un produit (trié par date desc)

### Variants — Prix
- `GET /api/variants/:variantId/prix` — Historique complet des suppléments de toutes les options d'un variant (trié par date desc)
- `PATCH /api/variants/:variantId/options/:optionId/prix` — Modifier le supplément d'une option spécifique, crée automatiquement une entrée dans `PrixVariantOption`

## Prix au moment des commandes

Les commandes stockent `prix_unitaire` directement dans chaque `ligne` de commande (dénormalisé), capturé depuis `produit.prix_actuel` au moment de la création.

Le changement de prix d'un produit ou d'une option **n'affecte donc jamais les commandes existantes**.

`getPrixProduitAtDate` et `getPrixVariantOptionAtDate` sont disponibles pour :
- Recalculer ou vérifier le prix historique d'une commande
- Afficher l'évolution des prix dans des rapports
- Vérifier la cohérence des données

## Pages Frontend

### Page `/produits`
- **Responsable** : bouton "Prix" sur chaque carte produit → modal de changement de prix
  - Affiche le prix actuel, l'historique (date + prix) et un champ de saisie
- **Responsable** : bouton "Prix" par option dans le panel des variants → modal de changement de supplément
  - Affiche le supplément actuel, l'historique et un champ de saisie (peut être négatif = réduction)
