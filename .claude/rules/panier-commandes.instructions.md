# Fonctionnalité : Panier, Commandes & Profil Acheteur (Frontoffice)

## Vue d'ensemble

Cette fonctionnalité permet aux acheteurs connectés de :
1. Ajouter des produits (avec variants) à un panier local
2. Passer commande depuis le panier
3. Consulter leur historique de commandes

---

## Panier (CartService)

### Stockage
Le panier est stocké dans **localStorage** sous la clé `mall_cart`. Aucun modèle backend n't est créé.

### Interface `CartItem`
- `produitId`, `boutiqueId`, `boutiqueNom`, `boutiqueSlug` — identifiants de la boutique/produit
- `nom`, `image` — données affichées dans le panier
- `prix_unitaire` — `produit.prix_actuel` au moment de l'ajout
- `prix_supplement` — `option.prix_supplement` du variant sélectionné (0 si pas de variant)
- `prix_total_ligne` — `(prix_unitaire + prix_supplement) * quantite`
- `quantite` — quantité sélectionnée (limitée par `stock`)
- `variantId?`, `variantNom?`, `optionId?`, `optionValeur?` — présents si un variant est sélectionné
- `stock` — stock disponible pour l'item (option si variant, sinon 999)

### Méthodes
- `addItem(item)` — ajoute ou incrémente si même `produitId` + `optionId`
- `removeItem(produitId, optionId?)` — supprime un item
- `updateQuantity(produitId, optionId, qty)` — met à jour la quantité
- `clearCart()` — vide le panier (appeler après commande réussie)
- `getItemsByBoutique(boutiqueId)` — items filtrés pour une boutique
- Computed: `totalQuantity`, `totalPrice`, `boutiquesInCart`

---

## Commandes

### Règle multi-boutique
`Commande.boutiqueId` est unique → si le panier contient des produits de N boutiques, N commandes sont créées au checkout (via `forkJoin`).

### Endpoint acheteur
`GET /api/commandes/mes-commandes` — déclaré **avant** `GET /:id` dans le router pour éviter un conflit de routing.

### Statuts et sens métier
| Statut | Badge | Signification |
|--------|-------|---------------|
| `en_attente` | Orange | Commande créée, en attente de traitement |
| `confirmee` | Bleu | Confirmée par le responsable, stock déduit |
| `livree` | Vert | Livrée/remise au client |
| `annulee` | Rouge | Annulée |

Stock déduit automatiquement lors de la transition `en_attente → confirmee` (via `StockMouvement` côté backend).

---

## Paiement

Le paiement (`PUT /api/commandes/:id/paiement`) est **réservé aux responsables/admins** — enregistrement en caisse dans un contexte physique. L'acheteur voit `montant_paye` et `reste_a_payer` dans ses commandes mais ne peut pas initier un paiement en ligne.

---

## Routes Frontoffice

| Route | Accès | Composant |
|-------|-------|-----------|
| `/panier` | Public | `PanierComponent` |
| `/mes-commandes` | Acheteur connecté (`foAuthGuard`) | `MesCommandesComponent` |

### `foAuthGuard`
Redirige vers `/connexion` si `authService.isAcheteurLoggedIn` est false.

---

## Page Produit (`produit-detail`)

### Ajouts
- **Sélecteur de quantité** : boutons − / + limités par `stockDisponible`
- **Indicateur de stock** : badge vert/orange/rouge selon la quantité en stock de l'option sélectionnée
- **Bouton "Ajouter au panier"** : désactivé si option hors-stock ou chargement en cours

### Logique
- `stockDisponible` : si variants → stock de l'option sélectionnée ; sinon → 999
- `canAddToCart` : `quantite >= 1 && (!variants || stockDisponible > 0)`
- `addToCart()` : construit un `CartItem` et appelle `cartService.addItem()`
- Notification de succès via `NotificationService`

---

## Header (`fo-header`)

Le badge panier dans le header est connecté à `cartService.totalQuantity()` (signal Angular). Le bouton navigue vers `/panier`.
