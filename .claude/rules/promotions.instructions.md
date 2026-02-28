# Fonctionnalité : Promotions produit

## Vue d'ensemble

Cette fonctionnalité permet au **responsable_boutique** de créer des promotions (réduction en pourcentage) sur un produit entier ou sur une option d'un variant, pour une durée définie (dateDebut / dateFin). Chaque changement de prix est historisé dans les modèles de prix existants.

## Accès et rôles

- **responsable_boutique** : créer/terminer des promotions sur ses propres produits/variants
- **public** : consulter les promotions actives via GET /api/promotions/actives

## Règles métier

1. La promotion s'applique **immédiatement** à la création : `prix_actuel` du produit (ou `prix_supplement` de l'option) est mis à jour au prix réduit.
2. L'historique des prix (`PrixProduit` / `PrixVariantOption`) enregistre le changement avec `motif: "Promotion -X%"`.
3. **Expiration paresseuse** : lors du chargement des promotions, le contrôleur expire automatiquement celles dont `dateFin < now` (restaure le prix original, crée une entrée d'historique avec `motif: "Fin de promotion"`, marque `actif = false`).
4. **Terminaison manuelle** : le responsable peut terminer une promo avant la date de fin.
5. Un produit (ou une option) ne peut avoir **qu'une seule promotion active** à la fois.
6. `prixReduit = Math.round(prixOriginal * (1 - pourcentage / 100))`

## Architecture

### Modèle `Promotion`
- `type`: `'produit'` | `'variant_option'`
- `produitId` — ref Produit (si type='produit')
- `variantId` — ref VariantProduit (si type='variant_option')
- `optionId` — ObjectId sous-document option
- `optionValeur` — valeur lisible dénormalisée (ex: "M", "Rouge")
- `boutiqueId` — ref Boutique
- `pourcentage` — 1 à 99
- `prixOriginal` — prix AVANT la promotion
- `prixReduit` — prix APRÈS la promotion
- `dateDebut` / `dateFin` — période de la promo
- `actif` — true tant que la promo est en cours
- `terminePar` — `'responsable'` | `'expiration'` | null

### Champ `motif` ajouté aux modèles prix
- `PrixProduit.motif` — ex: `"Promotion -20%"`, `"Fin de promotion"`, null
- `PrixVariantOption.motif` — même chose

## Endpoints API

```
GET    /api/promotions/actives?produitId=&boutiqueId=   public
GET    /api/promotions/boutique?page=&limit=            responsable_boutique
POST   /api/promotions                                  responsable_boutique
DELETE /api/promotions/:id                              responsable_boutique
```

### POST /api/promotions — body
```json
{
  "type": "produit",
  "produitId": "<ObjectId>",
  "pourcentage": 20,
  "dateDebut": "2025-03-01",
  "dateFin": "2025-03-31"
}
```
ou pour variant_option :
```json
{
  "type": "variant_option",
  "produitId": "<ObjectId>",
  "variantId": "<ObjectId>",
  "optionId": "<ObjectId>",
  "optionValeur": "M",
  "pourcentage": 15,
  "dateDebut": "2025-03-01",
  "dateFin": "2025-03-15"
}
```

## Page Frontend (`/produits` — responsable)

Sur chaque carte produit :
- Badge vert "🏷️ -X% jusqu'au DD/MM" si une promo est active
- Bouton "Promouvoir" si aucune promo active → ouvre le modal de création
- Bouton "Terminer promo" si une promo active → confirmation + restauration prix

Sur les options de variants (dans le panel variants) :
- Même logique avec badge et boutons par option

Modal promotion :
- Sélection du pourcentage (1-99%)
- Date début (défaut: aujourd'hui)
- Date fin (obligatoire)
- Preview : "X Ar → Y Ar (−Z%)"
