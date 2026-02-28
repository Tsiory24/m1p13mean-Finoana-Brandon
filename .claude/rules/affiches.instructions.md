# Fonctionnalité : Boutiques & Produits à l'affiche

## Vue d'ensemble

Cette fonctionnalité permet d'afficher des boutiques et produits en vedette sur la page d'accueil du centre commercial, avec gestion des priorités par l'admin et un système de demande/validation pour les produits.

---

## Boutiques à l'affiche

### Backend

#### Champs ajoutés au modèle `Boutique`
- `enAffiche: Boolean` (default: false) — la boutique est-elle à l'affiche
- `ordreAffiche: Number` (default: null) — position dans l'ordre d'affichage

#### Endpoints
- `GET /api/boutiques/affiche` — (public) retourne les boutiques `enAffiche:true` triées par `ordreAffiche ASC`
- `PUT /api/boutiques/affiche` — (admin) reçoit `[{ boutiqueId, ordre }]`, met à jour `enAffiche` + `ordreAffiche` pour toutes les boutiques (reset les non listées)

### Frontend

Dans la page `/boutiques` (admin), un onglet **"À l'affiche"** permet :
1. Voir les boutiques actuellement à l'affiche (liste ordonnée avec numéros)
2. Ajouter une boutique active depuis un sélecteur
3. Retirer une boutique de la liste
4. Réordonner via boutons ↑ / ↓
5. Sauvegarder l'ordre (call `PUT /api/boutiques/affiche`)

---

## Produits à l'affiche

### Modèle `Config` (singleton)
Document unique en base gérant les paramètres admin :
- `delaiResoumissionAffiche: Number` — délai en jours avant qu'une demande refusée puisse être re-soumise (default: 7)

### Modèle `DemandeAfficheProduit`
- `produitId` (ref Produit)
- `boutiqueId` (ref Boutique)
- `statut: 'en_attente' | 'accepte' | 'refuse'`
- `ordre: Number` (défini par l'admin à l'acceptation)
- `motifRefus: String` (optionnel, admin)
- `dateRefus: Date` (pour calculer le délai de re-soumission)
- `traitePar` (ref User — admin qui a traité)
- `timestamps: true`

### Endpoints
```
GET    /api/affiches/produits                       public — produits acceptés triés par ordre
GET    /api/affiches/produits/demandes              admin — liste toutes les demandes (filtre statut, pagination)
POST   /api/affiches/produits/demander/:produitId   responsable_boutique — faire une demande
PUT    /api/affiches/produits/:id/accepter          admin — accepter la demande
PUT    /api/affiches/produits/:id/refuser           admin — refuser avec motif optionnel
DELETE /api/affiches/produits/:id                   admin — retirer un produit de l'affiche
PUT    /api/affiches/produits/reorder               admin — réordonner [{demandeId, ordre}]
GET    /api/affiches/config                         public — lire la config
PUT    /api/affiches/config                         admin — modifier delaiResoumissionAffiche
```

### Règles métier
1. **Demande initiale** : le responsable peut envoyer une demande seulement si aucune demande `en_attente` ou `accepte` n'existe déjà pour ce produit.
2. **Re-soumission après refus** : possible seulement si `dateRefus + delaiResoumissionAffiche jours <= maintenant`. La nouvelle demande devient `en_attente`.
3. **Ordre** : à l'acceptation, l'admin peut spécifier l'ordre ou le produit est placé en dernier automatiquement.
4. **Retrait** : l'admin peut retirer un produit accepté à tout moment. Le responsable pourra re-demander après le délai de refus.

### Frontend responsable (`/produits`)

Par produit dans la liste, un indicateur de statut affiche :
- **Aucune demande** → bouton "Demander mise à l'affiche"
- **En attente** → badge orange "En attente de validation"
- **Accepté** → badge vert "À l'affiche" (pas d'action disponible)
- **Refusé** → badge rouge "Refusé", motif en tooltip ; bouton "Re-demander" si le délai est écoulé, sinon affiche "Re-soumission possible dans X jours"

### Frontend admin (`/affiches`)

Onglet **Demandes** :
- Tableau paginé des demandes `en_attente` (et optionnellement toutes via filtre)
- Colonnes : Produit | Boutique | Prix | Date demande | Actions
- Actions : Accepter (ordre optionnel) | Refuser (modal avec motif)

Onglet **À l'affiche** :
- Liste ordonnée des produits `accepte` avec : #ordre | Image | Nom | Boutique | Boutons ↑↓ | Retirer
- Bouton "Sauvegarder l'ordre"

Section **Configuration** :
- Champ "Délai de re-soumission (jours)" avec bouton sauvegarder

---

## Navigation
- Page `/affiches` accessible aux **admin** uniquement
- Visible dans la sidebar admin
- La page `/produits` affiche les statuts pour le **responsable_boutique**
