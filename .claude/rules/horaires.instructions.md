# Fonctionnalité : Gestion des Horaires

## Vue d'ensemble

Cette fonctionnalité permet de gérer les horaires d'ouverture du centre commercial et des boutiques individuelles, avec deux niveaux :
1. **Horaires habituels** : définis par jour de la semaine (lundi–dimanche)
2. **Horaires exceptionnels** : définis pour une date précise (horaire différent ou fermeture complète)

## Accès et rôles

- **admin** : gère les horaires du centre commercial ET peut consulter ceux des boutiques
- **responsable_boutique** : gère uniquement les horaires de sa propre boutique
- **acheteur** / **public** : peut consulter les horaires via les endpoints GET (sans authentification)

## Architecture

### Modèles

#### `HorairesCentre`
Horaires habituels du centre — 7 documents max (1 par jour).
- `jour` : enum lundi–dimanche (unique)
- `heure_ouverture` : String (ex: "09:00") ou null
- `heure_fermeture` : String (ex: "20:00") ou null
- `ferme` : Boolean (default: false)
- `updatedBy` / `updatedAt`

#### `HorairesExceptionnelsCentre`
Exceptions du centre sur une date précise.
- `date` : Date (unique, stockée à minuit UTC)
- `heure_ouverture` / `heure_fermeture` : String ou null (null si `ferme: true`)
- `ferme` : Boolean
- `motif` : String optionnel
- `createdBy` / timestamps

#### `HorairesBoutique`
Horaires habituels par boutique et par jour.
- `boutiqueId` (ref Boutique) + `jour` : index unique composite
- Mêmes champs que HorairesCentre

#### `HorairesExceptionnelsBoutique`
Exceptions par boutique sur une date précise.
- `boutiqueId` + `date` : index unique composite
- Mêmes champs que HorairesExceptionnelsCentre

### Règles métier importantes

1. Les boutiques de catégorie **"restaurant"** (nom de catégorie contenant "restaurant" en minuscule) sont **exclues de la cascade** du centre : elles peuvent avoir des horaires complètement indépendants même si le centre est fermé.
2. La **cascade centre → boutique** est calculée à la **lecture** (pas écrite en base) : si le centre a une exception `ferme: true` pour une date, toutes les boutiques non-restaurant sont considérées fermées ce jour-là.
3. Les réponses incluent un champ `fermePar: 'centre' | 'boutique' | null` pour indiquer la source de la fermeture.
4. Un responsable_boutique ne peut modifier les horaires **que de sa propre boutique**.

### Endpoints

```
# Centre (public en lecture, admin en écriture)
GET    /api/horaires/centre                              → 7 jours habituels
PUT    /api/horaires/centre/:jour                        → upsert un jour (admin)
GET    /api/horaires/centre/exceptions?annee=&mois=      → exceptions du mois
POST   /api/horaires/centre/exceptions                   → créer exception (admin)
PUT    /api/horaires/centre/exceptions/:id               → modifier exception (admin)
DELETE /api/horaires/centre/exceptions/:id               → supprimer exception (admin)

# Boutiques (public en lecture, responsable/admin en écriture)
GET    /api/horaires/boutiques/:boutiqueId                       → 7 jours habituels
PUT    /api/horaires/boutiques/:boutiqueId/:jour                 → upsert (responsable/admin)
GET    /api/horaires/boutiques/:boutiqueId/exceptions?annee=&mois= → exceptions du mois
POST   /api/horaires/boutiques/:boutiqueId/exceptions            → créer exception
PUT    /api/horaires/boutiques/:boutiqueId/exceptions/:id        → modifier exception
DELETE /api/horaires/boutiques/:boutiqueId/exceptions/:id        → supprimer exception
```

## Pages Frontend

### `/horaires`
Accessible par admin et responsable_boutique.

- **Admin** : deux onglets — "Centre commercial" et "Boutique" (avec sélecteur de boutique)
- **Responsable** : onglet unique "Ma Boutique"

**Chaque onglet contient :**

1. **Section Horaires habituels** : tableau des 7 jours avec colonnes Jour / Ouverture / Fermeture / Statut / Modifier
2. **Section Exceptions** :
   - Calendrier mensuel visuel (navigable mois par mois)
     - Jour normal : gris clair (pas de badge)
     - Exception horaire différent : fond orange
     - Exception fermé : fond rouge
     - Fermeture héritée du centre : badge "Centre fermé"
   - Clic sur un jour → modal création/modification d'exception
   - Liste paginée des exceptions sous le calendrier

**Modal horaire habituel** : toggle Fermé + inputs heure_ouverture / heure_fermeture (disabled si fermé)

**Modal exception** : Date (read-only) + toggle Fermé + Heures (si pas fermé) + Motif
