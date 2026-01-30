# 📚 Architecture MEAN Stack - Guide Complet

## 🎯 Qu'est-ce que le Stack MEAN ?

**MEAN** est un acronyme pour :
- **M**ongoDB : Base de données NoSQL
- **E**xpress : Framework web pour Node.js
- **A**ngular : Framework frontend JavaScript
- **N**ode.js : Environnement d'exécution JavaScript côté serveur

Ce guide se concentre sur la partie **Backend (Node.js + Express + MongoDB)**.

---

## 🏗️ Architecture Backend - Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Angular)                      │
│                    Envoie des requêtes HTTP                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER.JS (Point d'entrée)                │
│                   Initialise Express & MongoDB               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARES (Filtres)                     │
│          CORS, Body Parser, Authentication, etc.             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    ROUTES (Routeur)                          │
│         Dirige les requêtes vers les bons controllers        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  CONTROLLERS (Logique métier)                │
│         Traite la requête, appelle les Models               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MODELS (Schémas Mongoose)                 │
│              Interagit avec MongoDB                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB (Base de données)                 │
│              Stocke et récupère les données                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Structure des Dossiers

```
backend/
├── server.js              # Point d'entrée de l'application
├── .env                   # Variables d'environnement (secrets)
├── package.json           # Dépendances et scripts
│
├── controllers/           # Logique métier
│   ├── authController.js  # Gestion auth (login, register, etc.)
│   └── logController.js   # Gestion des logs
│
├── middlewares/          # Intercepteurs de requêtes
│   └── auth.js           # Vérification JWT, autorisation
│
├── models/               # Schémas de données
│   ├── User.js           # Modèle utilisateur
│   └── Log.js            # Modèle log
│
├── routes/               # Définition des routes API
│   ├── authRoutes.js     # Routes /api/auth/*
│   └── logRoutes.js      # Routes /api/logs/*
│
└── utils/                # Fonctions utilitaires
    ├── db.js             # Connexion MongoDB
    ├── generateToken.js  # Génération JWT
    └── logger.js         # Création de logs
```

---

## 🔄 Flux d'une Requête HTTP - Exemple Concret

### Exemple : Inscription d'un utilisateur

```
1. CLIENT (Angular)
   POST http://localhost:5000/api/auth/register
   Body: { nom: "John", motDePasse: "123456", ... }
   
           ↓

2. SERVER.JS
   - Reçoit la requête
   - Applique CORS
   - Parse le JSON (body-parser)
   
           ↓

3. ROUTES (authRoutes.js)
   app.use('/api/auth', authRoutes)
   → Trouve la route POST /register
   → Applique les validations (express-validator)
   → Appelle authController.register
   
           ↓

4. CONTROLLER (authController.js)
   exports.register = async (req, res) => {
     - Vérifie les erreurs de validation
     - Vérifie si l'utilisateur existe déjà
     - Appelle User.create() pour créer l'utilisateur
     - Génère un token JWT
     - Crée un log de l'action
     - Renvoie la réponse JSON
   }
   
           ↓

5. MODEL (User.js)
   User.create({ nom, motDePasse, ... })
   - Le middleware pre('save') hash le mot de passe
   - Mongoose valide les données selon le schéma
   - Sauvegarde dans MongoDB
   
           ↓

6. MongoDB
   - Stocke le document dans la collection "users"
   - Retourne le document créé avec _id
   
           ↓

7. RÉPONSE → CLIENT
   {
     success: true,
     data: { user: {...}, token: "..." }
   }
```

---

## 📦 Rôle de Chaque Composant

### 1. **SERVER.JS** - Le Chef d'Orchestre

**Rôle** : Point d'entrée qui initialise tout

```javascript
// 1. Charge les variables d'environnement
require('dotenv').config();

// 2. Initialise Express
const app = express();

// 3. Se connecte à MongoDB
connectDB();

// 4. Configure les middlewares globaux
app.use(cors());
app.use(bodyParser.json());

// 5. Définit les routes
app.use('/api/auth', authRoutes);
app.use('/api/logs', logRoutes);

// 6. Démarre le serveur
app.listen(PORT);
```

**Analogie** : C'est comme le standard téléphonique d'une entreprise qui reçoit tous les appels et les redirige.

---

### 2. **MODELS** - Les Schémas de Données

**Rôle** : Définit la structure des données et interagit avec MongoDB

```javascript
// models/User.js
const userSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  motDePasse: { type: String, required: true },
  role: { type: String, enum: ['admin', 'responsable_boutique', 'acheteur'] }
});

module.exports = mongoose.model('User', userSchema);
```

**Ce qu'il fait** :
- ✅ Définit la structure (comme une classe en POO)
- ✅ Applique des validations (required, min, max, enum, etc.)
- ✅ Définit des méthodes personnalisées (comparePassword)
- ✅ Utilise des hooks (pre/post save) pour exécuter du code avant/après une opération
- ✅ Communique avec MongoDB via Mongoose

**Relation avec MongoDB** :
```
Model 'User' → Collection 'users' dans MongoDB
Model 'Log'  → Collection 'logs' dans MongoDB

Mongoose pluralise automatiquement et met en minuscule
```

---

### 3. **CONTROLLERS** - La Logique Métier

**Rôle** : Contient toute la logique de traitement des requêtes

```javascript
// controllers/authController.js
exports.register = async (req, res) => {
  try {
    // 1. Récupérer les données de la requête
    const { nom, motDePasse } = req.body;
    
    // 2. Vérifier si l'utilisateur existe
    const existingUser = await User.findOne({ nom });
    
    // 3. Créer le nouvel utilisateur
    const user = await User.create({ nom, motDePasse });
    
    // 4. Générer un token
    const token = generateToken(user._id);
    
    // 5. Envoyer la réponse
    res.status(201).json({ success: true, data: { user, token } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

**Analogie** : C'est comme un employé qui traite votre demande, vérifie les conditions, effectue les actions nécessaires et vous donne une réponse.

**Pourquoi séparer la logique ?**
- ✅ Code organisé et maintenable
- ✅ Réutilisable
- ✅ Testable indépendamment
- ✅ Séparation des responsabilités

---

### 4. **ROUTES** - L'Aiguillage

**Rôle** : Définit les endpoints et associe les URLs aux controllers

```javascript
// routes/authRoutes.js
const router = express.Router();

// Route publique
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Route protégée (nécessite authentification)
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);

module.exports = router;
```

**Structure des routes** :
```
/api/auth/register  → authController.register
/api/auth/login     → authController.login
/api/auth/logout    → protect → authController.logout
/api/logs           → protect → authorize('admin') → logController.getAllLogs
```

**Analogie** : C'est comme un panneau de signalisation qui indique quel chemin prendre selon la destination.

---

### 5. **MIDDLEWARES** - Les Filtres

**Rôle** : Intercepte les requêtes avant qu'elles n'arrivent au controller

```javascript
// middlewares/auth.js
exports.protect = async (req, res, next) => {
  // 1. Récupérer le token JWT
  const token = req.headers.authorization?.split(' ')[1];
  
  // 2. Vérifier si le token existe
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé' });
  }
  
  // 3. Vérifier la validité du token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // 4. Récupérer l'utilisateur
  req.user = await User.findById(decoded.id);
  
  // 5. Passer au prochain middleware/controller
  next();
};
```

**Types de middlewares** :
- **Globaux** : Appliqués à toutes les requêtes (CORS, bodyParser)
- **De route** : Appliqués à certaines routes (protect, authorize)
- **D'erreur** : Gèrent les erreurs

**Analogie** : C'est comme un agent de sécurité qui vérifie votre badge avant de vous laisser entrer.

---

### 6. **UTILS** - Les Outils

**Rôle** : Fonctions réutilisables et utilitaires

```javascript
// utils/generateToken.js
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// utils/logger.js
const createLog = async (logData, req) => {
  await Log.create({
    action: logData.action,
    utilisateur: logData.utilisateur,
    details: { ...logData.details, ipAddress: req.ip }
  });
};

// utils/db.js
const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connecté');
};
```

**Pourquoi des utils ?**
- ✅ Évite la duplication de code
- ✅ Facilite la maintenance
- ✅ Centralise les fonctions communes

---

## 🗄️ Relation avec MongoDB

### Comment Mongoose communique avec MongoDB

```
┌─────────────────────────────────────────────────────────┐
│                  CODE JAVASCRIPT                         │
│                                                          │
│  const user = await User.create({                       │
│    nom: "John",                                         │
│    motDePasse: "hashed123"                              │
│  });                                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Mongoose traduit en commande MongoDB
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  MONGOOSE (ODM)                          │
│                                                          │
│  - Valide les données selon le schéma                   │
│  - Exécute les hooks (pre/post save)                    │
│  - Construit la requête MongoDB                         │
│  - Envoie à MongoDB                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    MongoDB Driver                        │
│              Connexion TCP vers MongoDB                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  MongoDB Database                        │
│                                                          │
│  Collection: users                                       │
│  {                                                       │
│    _id: ObjectId("..."),                                │
│    nom: "John",                                         │
│    motDePasse: "$2a$10$...",                            │
│    role: "acheteur",                                    │
│    createdAt: ISODate("2026-01-30"),                    │
│    updatedAt: ISODate("2026-01-30")                     │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
```

### Opérations CRUD avec Mongoose

```javascript
// CREATE - Créer un document
const user = await User.create({ nom: "John", motDePasse: "123" });
// MongoDB: db.users.insertOne({ nom: "John", motDePasse: "123" })

// READ - Lire des documents
const user = await User.findOne({ nom: "John" });
// MongoDB: db.users.findOne({ nom: "John" })

const users = await User.find({ role: "admin" });
// MongoDB: db.users.find({ role: "admin" })

// UPDATE - Mettre à jour
await User.findByIdAndUpdate(userId, { nom: "Jane" });
// MongoDB: db.users.updateOne({ _id: userId }, { $set: { nom: "Jane" } })

// DELETE - Supprimer
await User.findByIdAndDelete(userId);
// MongoDB: db.users.deleteOne({ _id: userId })
```

---

## 🔐 Exemple Complet : Flux d'Authentification

### 1. **Inscription**

```javascript
// CLIENT envoie
POST /api/auth/register
{
  "nom": "john_doe",
  "motDePasse": "password123",
  "email": "john@example.com",
  "contact": "+261340000000",
  "role": "acheteur"
}

// ROUTES (authRoutes.js)
router.post('/register', registerValidation, authController.register);
                         ↓ (Valide les données)
                         
// CONTROLLER (authController.js)
exports.register = async (req, res) => {
  // 1. Vérifie si l'utilisateur existe
  const existingUser = await User.findOne({ nom: req.body.nom });
  
  // 2. Crée l'utilisateur
  const user = await User.create(req.body);
  //           ↓
  //    MODEL (User.js) - Hook pre('save')
  //    Le mot de passe est hashé automatiquement
  //           ↓
  //    MongoDB stocke le document
  
  // 3. Génère un token JWT
  const token = generateToken(user._id);
  
  // 4. Crée un log
  await createLog({
    action: 'inscription',
    utilisateur: user._id,
    statut: 'succès'
  });
  
  // 5. Renvoie la réponse
  res.status(201).json({ success: true, data: { user, token } });
};
```

### 2. **Connexion**

```javascript
// CLIENT envoie
POST /api/auth/login
{
  "identifier": "john_doe",  // ou email
  "motDePasse": "password123"
}

// CONTROLLER
exports.login = async (req, res) => {
  // 1. Trouve l'utilisateur par nom OU email
  const user = await User.findOne({
    $or: [
      { nom: req.body.identifier },
      { email: req.body.identifier }
    ]
  }).select('+motDePasse');  // Récupère aussi le mot de passe
  
  // 2. Vérifie le mot de passe (méthode du model)
  const isValid = await user.comparePassword(req.body.motDePasse);
  
  // 3. Génère le token
  const token = generateToken(user._id);
  
  // 4. Log l'action
  await createLog({ action: 'login_reussi', utilisateur: user._id });
  
  // 5. Réponse
  res.json({ success: true, data: { user, token } });
};
```

### 3. **Accès à une route protégée**

```javascript
// CLIENT envoie
GET /api/auth/me
Headers: { Authorization: "Bearer eyJhbGc..." }

// MIDDLEWARE (auth.js) - Exécuté en premier
exports.protect = async (req, res, next) => {
  // 1. Extrait le token
  const token = req.headers.authorization.split(' ')[1];
  
  // 2. Vérifie et décode le token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // decoded = { id: "userId123", iat: 123456, exp: 789012 }
  
  // 3. Récupère l'utilisateur depuis MongoDB
  req.user = await User.findById(decoded.id);
  
  // 4. Passe au controller
  next();
};

// CONTROLLER (authController.js)
exports.getMe = async (req, res) => {
  // req.user est déjà disponible grâce au middleware
  res.json({ success: true, data: req.user });
};
```

---

## 🔑 Concepts Clés

### 1. **Séparation des Responsabilités**

Chaque fichier a un rôle précis :
- **Routes** : "Quel chemin ?"
- **Middlewares** : "Puis-je passer ?"
- **Controllers** : "Que faire ?"
- **Models** : "Comment stocker ?"
- **Utils** : "Outils communs"

### 2. **Asynchronisme avec async/await**

```javascript
// ❌ MAUVAIS - Bloquant
const user = User.findOne({ nom: "John" }); // Ne fonctionne pas

// ✅ BON - Non bloquant
const user = await User.findOne({ nom: "John" });
```

### 3. **Gestion des Erreurs**

```javascript
try {
  const user = await User.create(data);
  res.json({ success: true, data: user });
} catch (error) {
  res.status(500).json({ success: false, error: error.message });
}
```

### 4. **Middleware Chain (Chaîne de middlewares)**

```javascript
router.post('/logout', 
  protect,                    // 1. Vérifie le token
  authorize('admin'),         // 2. Vérifie le rôle
  authController.logout       // 3. Exécute le controller
);
```

---

## 📊 Variables d'Environnement (.env)

```env
PORT=5000                    # Port du serveur
MONGODB_URI=mongodb://...    # Connexion MongoDB
JWT_SECRET=abc123...         # Secret pour signer les tokens
JWT_EXPIRE=7d                # Durée de validité des tokens
NODE_ENV=development         # Environnement (dev/prod)
```

**Pourquoi ?**
- ✅ Sécurité (secrets non commitées sur Git)
- ✅ Flexibilité (différent en dev/prod)
- ✅ Configuration centralisée

---

## 🎓 Résumé - Le Cycle Complet

```
1. CLIENT fait une requête HTTP
   ↓
2. SERVER.JS reçoit et applique middlewares globaux
   ↓
3. ROUTES identifie l'endpoint et applique middlewares spécifiques
   ↓
4. MIDDLEWARES vérifient authentification/autorisation
   ↓
5. CONTROLLER traite la logique métier
   ↓
6. MODEL interagit avec MongoDB via Mongoose
   ↓
7. MongoDB stocke/récupère les données
   ↓
8. Réponse remonte jusqu'au CLIENT
```

---

## 💡 Bonnes Pratiques

### ✅ À FAIRE
- Séparer la logique en fichiers distincts
- Utiliser async/await pour les opérations asynchrones
- Valider les données (express-validator)
- Hasher les mots de passe (bcrypt)
- Utiliser des variables d'environnement
- Logger les actions importantes
- Gérer les erreurs avec try/catch
- Documenter votre code

### ❌ À ÉVITER
- Mettre toute la logique dans server.js
- Stocker des mots de passe en clair
- Commit le fichier .env sur Git
- Ignorer les erreurs
- Dupliquer le code
- Mélanger les responsabilités

---

## 🚀 Pour Aller Plus Loin

### Améliorations possibles :
1. **Pagination** : Limiter le nombre de résultats
2. **Filtres et Recherche** : Rechercher des utilisateurs
3. **Upload de fichiers** : Multer pour les images
4. **Emails** : Nodemailer pour notifications
5. **Rate Limiting** : Limiter les tentatives de connexion
6. **Redis** : Cache pour améliorer les performances
7. **Tests** : Jest/Mocha pour tester le code
8. **Documentation API** : Swagger/OpenAPI

---

## 📚 Ressources

- **MongoDB** : https://www.mongodb.com/docs/
- **Mongoose** : https://mongoosejs.com/docs/
- **Express** : https://expressjs.com/
- **Node.js** : https://nodejs.org/docs/
- **JWT** : https://jwt.io/

---

## ❓ Questions Fréquentes

**Q: Pourquoi Mongoose et pas MongoDB natif ?**
R: Mongoose fournit une structure (schémas), des validations et simplifie les opérations.

**Q: Où sont stockés les tokens JWT ?**
R: Côté client (localStorage/sessionStorage), pas côté serveur.

**Q: Comment MongoDB sait quelle collection utiliser ?**
R: Mongoose utilise le nom du modèle, le pluralise et le met en minuscule (User → users).

**Q: Peut-on avoir plusieurs bases de données ?**
R: Oui, créez plusieurs connexions Mongoose avec `mongoose.createConnection()`.

---

🎉 **Vous maîtrisez maintenant l'architecture MEAN Backend !**
