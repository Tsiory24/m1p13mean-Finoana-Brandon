
const connectDB = require('./utils/db');
const app = require('./app');
const localeRouter = require('./routes/locales.route');
const boutiquesRouter = require('./routes/boutiques.route');
const dureeContratRouter = require('./routes/dureeContrat.route');



connectDB();
// app.get('/', (req, res) => {
//   res.send('Serveur Express fonctionne 🚀');
// });

app.use("/locales", localeRouter);
app.use("/boutiques", boutiquesRouter);
app.use("/duree-contrats", dureeContratRouter);


app.listen(3000, () => {
  console.log(`Serveur lancé sur http://localhost:3000`);
});