const connectDB = require('./utils/db');
const app = require('./app');

const authRouter = require('./routes/auth.routes');
const userRouter = require('./routes/users.routes');
const logRouter = require('./routes/log.routes');
const notificationRouter = require('./routes/notification.routes');

// Routes
const localeRouter       = require('./routes/locales.route');
const boutiquesRouter    = require('./routes/boutiques.route');
const dureeContratRouter = require('./routes/dureeContrat.route');
const reservationRouter = require('./routes/reservation.route');
const prixLocaleRouter   = require('./routes/prixLocale.routes');
const uploadRouter       = require('./routes/upload.routes');

// Initialiser Express
// const app = express();
const categorieRouter = require('./routes/categorie.routes');
const sousCategorieRouter = require('./routes/sousCategorie.routes');
const uniteRouter = require('./routes/unite.routes');
const produitRouter = require('./routes/produit.routes');
const stockRouter = require('./routes/stock.routes');
const commandeRouter = require('./routes/commande.routes');
const variantProduitRouter = require('./routes/variantProduit.routes');
const horairesRouter  = require('./routes/horaires.route');
const affichesRouter  = require('./routes/affiches.route');
const promotionRouter = require('./routes/promotion.route');
const paiementLoyerRouter = require('./routes/paiementLoyer.route');

// Connecter à la base de données
connectDB();

// ── Enregistrement des routes (après que les middlewares soient prêts via app.js) ──
app.use('/api/auth',           authRouter);
app.use('/api/users',          userRouter);
app.use('/api/logs',           logRouter);
app.use('/api/locales',        localeRouter);
app.use('/api/boutiques',      boutiquesRouter);
app.use('/api/duree-contrats', dureeContratRouter);
app.use('/api/prix-locales',   prixLocaleRouter);
app.use('/api/upload',         uploadRouter);
app.use('/api/categories',     categorieRouter);
app.use('/api/sous-categories',sousCategorieRouter);
app.use('/api/unites',         uniteRouter);
app.use('/api/produits',       produitRouter);
app.use('/api/variants',       variantProduitRouter);
app.use('/api/stocks',         stockRouter);
app.use('/api/commandes',      commandeRouter);
app.use("/api/reservations", reservationRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/horaires',      horairesRouter);
app.use('/api/affiches',      affichesRouter);
app.use('/api/promotions',    promotionRouter);
app.use('/api/paiements-loyer', paiementLoyerRouter);

// Route de test
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Backend MEAN - Centre Commercial',
    version: '1.0.0'
  });
});

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Une erreur est survenue sur le serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV}`);
});
