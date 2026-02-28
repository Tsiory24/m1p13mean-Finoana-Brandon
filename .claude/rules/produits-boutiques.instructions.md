# Fonctionnalité : Gestion des Produits et Relation Boutique-Produit

## Vue d'ensemble

Cette fonctionnalité implémente le CRUD complet des produits dans une boutique, en définissant la relation boutique-catégorie-produit.

## Relations et modèles

### Boutique → Catégorie
- Une boutique possède **une seule catégorie** (définie à la création, modifiable).
- Champ : `categorieId` (ObjectId ref `Categorie`, optionnel en base pour compatibilité ascendante).

### Produit → Boutique → Catégorie
- Un produit est lié à une boutique via `boutiqueId`.
- Le produit **hérite** la catégorie de la boutique (pas de `categorieId` direct sur le produit).
- La catégorie est accessible via `produit.boutiqueId.categorieId`.

### Produit → Sous-catégories
- Un produit peut avoir **plusieurs sous-catégories** (`sousCategorieIds: [ObjectId]`).
- Chaque sous-catégorie doit appartenir à la catégorie de la boutique (validation côté backend).

### Produit → Attributs dynamiques
- Tableau embarqué : `attributs: [{ cle: String, valeur: String }]`
- Exemples : `{ cle: "Matière", valeur: "Coton" }`, `{ cle: "Poids", valeur: "500g" }`

### Produit → Variants (modèle séparé `VariantProduit`)
- Un variant représente une dimension de personnalisation (ex: "Taille", "Couleur").
- Chaque variant a des options avec prix supplémentaire et stock propre.
- Structure :
  ```json
  {
    "produitId": "<ObjectId>",
    "nom": "Taille",
    "options": [
      { "valeur": "S", "prix_supplement": 0, "stock": 10 },
      { "valeur": "M", "prix_supplement": 0, "stock": 15 },
      { "valeur": "L", "prix_supplement": 500, "stock": 8 }
    ]
  }
  ```

## API Endpoints

### Catégories (admin seulement pour CREATE/UPDATE/DELETE)
- `GET /api/categories` — Liste toutes les catégories
- `GET /api/categories/:id` — Détail d'une catégorie
- `POST /api/categories` — Créer une catégorie (protected)
- `PUT /api/categories/:id` — Modifier une catégorie (protected)
- `DELETE /api/categories/:id` — Supprimer une catégorie (protected)

### Sous-catégories (admin seulement pour CREATE/UPDATE/DELETE)
- `GET /api/sous-categories?categorieId=xxx` — Liste (filtrable par catégorie)
- `GET /api/sous-categories/:id` — Détail
- `POST /api/sous-categories` — Créer (protected)
- `PUT /api/sous-categories/:id` — Modifier (protected)
- `DELETE /api/sous-categories/:id` — Supprimer (protected)

### Produits
- `GET /api/produits?boutiqueId=xxx&sousCategorieId=xxx` — Liste (filtrable)
- `GET /api/produits/:id` — Détail
- `POST /api/produits` — Créer (protected, responsable de la boutique)
- `PUT /api/produits/:id` — Modifier (protected)
- `DELETE /api/produits/:id` — Supprimer (protected, soft delete)
- `GET /api/produits/:produitId/prix` — Historique des prix

### Variants
- `GET /api/variants?produitId=xxx` — Liste les variants d'un produit
- `GET /api/variants/:id` — Détail d'un variant
- `POST /api/variants` — Créer un variant (protected)
- `PUT /api/variants/:id` — Modifier un variant (protected)
- `DELETE /api/variants/:id` — Supprimer un variant (protected, soft delete)

## Pages Frontend

### `/categories` (admin uniquement)
- Onglet **Catégories** : liste avec pagination, recherche, CRUD via modals
- Onglet **Sous-catégories** : liste avec filtre par catégorie, pagination, CRUD via modals

### `/produits`
- **Admin** : voir tous les produits de toutes les boutiques
- **Responsable boutique** : voir et gérer les produits de sa boutique
- Liste avec pagination (10/page), recherche par nom, filtre par sous-catégorie
- Formulaire inline/modal : nom, description, prix, unité, sous-catégories, attributs dynamiques
- Section variants par produit (accessible depuis la fiche produit)

### `/boutiques` — Formulaire de création/modification
- Ajout d'un sélecteur de **catégorie** dans le formulaire de création/modification de boutique

## Règles métier importantes

1. Les sous-catégories proposées lors de la création d'un produit doivent appartenir à la catégorie de la boutique.
2. Un responsable ne peut créer/modifier/supprimer que les produits de **sa boutique**.
3. L'admin peut gérer tous les produits.
4. La suppression d'un produit est un **soft delete** (champ `deletedAt`).
5. La suppression d'un variant est un **soft delete** (champ `deletedAt`).
6. Le changement de prix d'un produit crée automatiquement une entrée dans `PrixProduit` (historique).
7. Les promotions, "nouveau", "best-sellers" ne sont **pas** dans le scope actuel.
