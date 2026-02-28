# Fonctionnalité : Gestion des Stocks

## Vue d'ensemble

La gestion des stocks permet au **responsable_boutique** de suivre les entrées et sorties de produits (et de leurs variants) dans sa boutique. L'historique complet des mouvements est conservé.

## Accès et rôles

- **responsable_boutique uniquement** : la route `/stocks` est réservée à ce rôle.
- L'admin n'a pas accès à cette page (chaque boutique est gérée par son responsable).

## Architecture

### Backend

#### Modèle `StockMouvement` (`backend/models/StockMouvement.js`)
Champs principaux :
- `produitId` (ref Produit) — obligatoire
- `boutiqueId` (ref Boutique) — obligatoire
- `type` — `'entree'` | `'sortie'`
- `quantite` — nombre entier ≥ 1
- `motif` — texte libre optionnel
- `commandeId` — rempli automatiquement lors d'une vente (null pour un mouvement manuel)
- `variantId` (ref VariantProduit) — optionnel, pour les mouvements au niveau d'un variant
- `optionId` (ObjectId) — ID de l'option subdocument dans `VariantProduit.options`
- `optionValeur` (String) — valeur lisible de l'option (ex: "M", "Rouge"), dénormalisée pour l'historique

#### Contrôleur `stock.controller.js`

**`POST /api/stocks/mouvement`** — Ajouter un mouvement
- Corps : `{ produitId, boutiqueId, type, quantite, motif?, variantId?, optionId?, optionValeur? }`
- Si `variantId + optionId` fournis : met à jour `option.stock` directement sur le `VariantProduit` (entrée : +quantite, sortie : max(0, stock-quantite))
- Crée ensuite l'enregistrement `StockMouvement`
- Protection : un responsable ne peut gérer que sa propre boutique

**`GET /api/stocks/boutique/:boutiqueId`** — Stock actuel agrégé
- Retourne la liste des produits avec `quantite_entree`, `quantite_sortie`, `quantite_disponible`
- Utilise une agrégation MongoDB (`$group` + `$addFields`)
- Note : inclut TOUS les mouvements du produit (y compris ceux liés à un variant), ce qui donne le total produit

**`GET /api/stocks/mouvements/:boutiqueId`** — Historique paginé
- Query params : `page`, `limit`, `type` (`entree`|`sortie`), `produitId`
- Popule `produitId`, `variantId`, `commandeId`
- Tri par `createdAt` décroissant

### Frontend

#### Service `StockService` (`frontend/src/app/shared/service/stock.service.ts`)
```typescript
getStockByBoutique(boutiqueId: string): Observable<StockAgg[]>
getMouvementsByBoutique(boutiqueId: string, params?: {...}): Observable<StockMouvementsResponse>
addMouvement(payload: AddMouvementPayload): Observable<StockMouvementItem>
```

#### Page `StocksComponent` (`frontend/src/app/pages/stocks/`)
Fichiers : `stocks.ts`, `stocks.html`, `stocks.scss`

**Onglet Inventaire** :
- Tableau : Produit | Prix | Entrées | Sorties | Stock actuel | Actions
- Colonne "Stock actuel" affiche le solde (entrées − sorties) avec code couleur :
  - Vert (`badge-stock-ok`) : stock > 5
  - Orange (`badge-stock-low`) : stock entre 1 et 5
  - Rouge (`badge-stock-zero`) : stock = 0
- Bouton expand par ligne pour voir les variants et leur stock propre (champ `option.stock`)
- Bouton "+" par ligne pour ouvrir le modal de mouvement pré-rempli avec ce produit

**Onglet Historique** :
- Filtres : type (entrée/sortie) + produit
- Tableau paginé : Date | Produit | Variant/Option | Type | Quantité | Motif | Source (Manuel/Commande)

**Modal "Mouvement de stock"** :
1. Type : toggle Entrée / Sortie
2. Produit : select parmi les produits de la boutique
3. Variant : appear dynamiquement si le produit a des variants (fetch laser au choix du produit)
4. Option : appear si un variant est sélectionné (affiche stock actuel)
5. Quantité (min 1)
6. Motif (optionnel)

## Règles métier

1. Un mouvement manuel ne touche pas à `commandeId` (laissé `null`).
2. Le stock d'une option de variant est dénormalisé dans `VariantProduit.options[i].stock` ET tracé dans `StockMouvement`. Les deux sources coexistent :
   - `option.stock` → lecture rapide du stock courant d'un variant
   - `StockMouvement` → historique complet et audit
3. La sortie ne permet pas un stock négatif : `Math.max(0, stock - quantite)` côté backend.
4. Les variants sont chargés paresseusement (lazy) lors de l'ouverture du modal ou de l'expansion d'une ligne, puis mis en cache dans `variantsByProduit` pour éviter des appels répétés.
5. Le champ "Créé le" est masqué dans les pages de liste non-historiques (ex: liste des produits). Il reste visible uniquement dans les onglets d'historique.

## Intégration avec les variants

- Lors de la **création** d'un variant dans la page Produits, le champ `stock` est caché dans le formulaire — le stock est géré exclusivement via la page Stocks.
- Le backend conserve quand même `stock: 0` comme valeur par défaut à la création.
- Les mouvements de stock liés à un variant renseignent `variantId`, `optionId`, et `optionValeur` dans le `StockMouvement` pour permettre un historique détaillé.
