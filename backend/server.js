// require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./utils/db');
const app = require('./app');
const localeRouter = require('./routes/locales.route');
const boutiquesRouter = require('./routes/boutiques.route');
const dureeContratRouter = require('./routes/dureeContrat.route');
const reservationRouter = require('./routes/reservation.route');

// Initialiser Express
// const app = express();
const categorieRouter = require('./routes/categorie.routes');
const sousCategorieRouter = require('./routes/sousCategorie.routes');
const uniteRouter = require('./routes/unite.routes');
const produitRouter = require('./routes/produit.routes');
const stockRouter = require('./routes/stock.routes');
const commandeRouter = require('./routes/commande.routes');

// Connecter à la base de données
connectDB();

app.use("/api/locales", localeRouter);
app.use("/api/boutiques", boutiquesRouter);
app.use("/api/duree-contrats", dureeContratRouter);
app.use("/api/reservations", reservationRouter);
app.use("/api/categories", categorieRouter);
app.use("/api/sous-categories", sousCategorieRouter);
app.use("/api/unites", uniteRouter);
app.use("/api/produits", produitRouter);
app.use("/api/stocks", stockRouter);
app.use("/api/commandes", commandeRouter);

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/logs', require('./routes/log.routes'));

// Route de test
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Backend MEAN - Gestion des Utilisateurs',
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
