# Fonctionnalité : Upload et Affichage des Images (Cloudinary)

## Vue d'ensemble

Les images sont uploadées via un endpoint centralisé `/api/upload`, converties en WebP par Sharp, puis stockées sur **Cloudinary**. Les URLs Cloudinary sont enregistrées en base de données. Le stockage local (`public/uploads/`) n'est plus utilisé pour les nouveaux uploads.

---

## Architecture globale

```
1. Sélection fichier (frontend)
      ↓
2. FormData → POST /api/upload (UploadService)
      ↓
3. Multer (mémoire) → Sharp (conversion WebP buffer)
      ↓
4. Upload buffer → Cloudinary (dossier "mall/")
      ↓
5. Réponse : { url: secure_url, filename: public_id }
      ↓
6. URL stockée en base (String / String[])
      ↓
7. Affichage : <img [src]="url">
```

---

## Backend

### Variables d'environnement (`backend/.env`)

```
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

La variable `CLOUDINARY_URL` est automatiquement lue par le SDK Cloudinary.

### Configuration Cloudinary (`backend/utils/cloudinary.js`)

```javascript
const cloudinary = require('cloudinary').v2;
cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });

uploadBuffer(buffer, options) // upload depuis un Buffer (en mémoire)
uploadFile(filePath, options)  // upload depuis un chemin fichier (scripts)
deleteAsset(publicId)          // suppression par public_id
```

### Middleware Multer (`backend/middlewares/upload.js`)

- **Stockage** : `multer.memoryStorage()` — le fichier transite en RAM, pas sur disque
- **Taille max** : 10 MB
- **Formats acceptés** : `jpeg`, `jpg`, `png`, `gif`, `webp`

### Traitement Sharp

Avant l'upload Cloudinary, le buffer est converti en **WebP lossless** :
```javascript
const webpBuffer = await sharp(req.file.buffer)
  .webp({ lossless: true, effort: 6 })
  .toBuffer();
```

### Endpoint upload (`backend/routes/upload.routes.js`)

```
POST   /api/upload   — authentifié (protect)
DELETE /api/upload   — authentifié (protect)
```

**POST** — body : `FormData` avec champ `image`

Réponse :
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/cloud_name/image/upload/v.../mall/filename.webp",
  "filename": "mall/filename"
}
```
> `filename` contient le **public_id** Cloudinary, à conserver pour la suppression.

**DELETE** — body : `{ "filename": "mall/1772354867115-881296" }`

Supprime l'asset sur Cloudinary via `cloudinary.uploader.destroy(public_id)`.

---

## Modèles — stockage des URLs

| Modèle | Champ | Type |
|--------|-------|------|
| `Boutique` | `image` | `String` (null par défaut) |
| `Produit` | `images` | `[String]` (tableau, plusieurs images possibles) |
| `VariantProduit.options[i]` | `image` | `String` (null par défaut) |

Les URLs Cloudinary complètes (ex: `https://res.cloudinary.com/...`) sont stockées directement.

---

## Frontend

### UploadService (`frontend/src/app/shared/service/upload.service.ts`)

Aucun changement côté frontend. L'interface reste identique :

```typescript
upload(file: File): Observable<{ url: string; filename: string }>
deleteFile(filename: string): Observable<void>
```

- `url` → URL Cloudinary `secure_url` (https://)
- `filename` → `public_id` Cloudinary (ex: `mall/1772354867115-881296`)

### Utilisation dans un composant

```typescript
onImageSelected(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  this.uploadingImage = true;
  this.uploadService.upload(file).subscribe({
    next: (result) => {
      this.productModal.images.push(result.url); // URL Cloudinary
      this.uploadingImage = false;
    },
    error: () => { this.uploadingImage = false; }
  });
}

removeImage(idx: number): void {
  const filename = this.images[idx].split('/').pop()!;
  // Pour Cloudinary : extraire le public_id si nécessaire
  this.images.splice(idx, 1);
  this.uploadService.deleteFile(filename).subscribe();
}
```

> **Important** : pour la suppression, passer le `public_id` complet (ex: `mall/filename`) stocké dans `result.filename` au moment de l'upload, pas extrait depuis l'URL.

### Résolution des URLs

Les URLs Cloudinary commencent par `https://`, donc la méthode `resolveUrl()` des composants frontoffice les retourne directement sans transformation.

```typescript
resolveUrl(url: string): string {
  if (url.startsWith('http')) return url; // ← URLs Cloudinary passent ici
  const base = this.apiBase.replace(/\/$/, '');
  return base + (url.startsWith('/') ? url : '/' + url);
}
```

---

## Script de migration

Pour migrer les images locales vers Cloudinary (usage unique) :

```bash
cd backend
node scripts/migrate-images-to-cloudinary.js
```

Le script :
1. Se connecte à MongoDB
2. Cherche dans `boutiques`, `produits`, `variantproduits` les URLs contenant `/uploads/`
3. Uploade chaque fichier depuis `public/uploads/` vers Cloudinary (dossier `mall/`)
4. Met à jour les URLs en base avec les `secure_url` Cloudinary
5. Ignore les URLs déjà sur Cloudinary (`cloudinary.com`) ou les fichiers absents

---

## Bonnes pratiques

1. **Stocker le `public_id`** (`result.filename`) au moment de l'upload si vous devez supprimer l'image plus tard.
2. **Ne jamais stocker de fichier binaire en base** — stocker uniquement l'URL `secure_url`.
3. **Utiliser `uploadingImage = true/false`** pour bloquer le submit pendant l'upload.
4. **Le dossier Cloudinary** utilisé est `mall/` — toutes les images du projet y sont regroupées.
5. Le répertoire `public/uploads/` n'est plus nécessaire pour les nouveaux uploads, mais conservé pour compatibilité ascendante.

---

## Variables d'environnement

| Variable | Endroit | Rôle |
|----------|---------|------|
| `CLOUDINARY_URL` | `backend/.env` | URL complète de connexion Cloudinary (`cloudinary://key:secret@cloud`) |
| `apiBaseUrl` | `frontend/src/environnements/environnement.ts` | URL de base du frontend pour appeler l'API |
