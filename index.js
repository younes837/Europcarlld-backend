const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const { connectToDatabase } = require("./config/dbConfig");

const app = express();
connectToDatabase();

app.use(cors());
app.use(express.json());

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Import des routes
const contratRoutes = require("./routes/contratRoutes");
const sinistreRoutes = require("./routes/sinistreRoutes");
const parcRoutes = require("./routes/totalParcRoute");
const MarcheRoutes = require("./routes/marcheRoutes");
const pneu = require("./routes/pneuRoutes");
const vendus = require("./routes/venduRoutes");
const achatRoutes = require("./routes/achatRoutes");
const get_car_dispo = require("./routes/etatCarRoutes");
const { getParcGlobal } = require("./controllers/parcController");
const { get_ca_vehicule } = require("./controllers/revenueController");
const {
  getTopClient,
  getTopClientOriginal,
  getClientCount,
  getMargeParClient,
} = require("./controllers/calculGrillController");
const { get_ca } = require("./controllers/caController");
const { get_commande_encours } = require("./controllers/cmmdencoursController");
const { get_km_projection } = require("./controllers/projkmController");
const { get_vidange_projection } = require("./controllers/projkmController");
const {
  get_entretien_vehicule,
  test,
  get_all_entretien,
  get_entretien_matricule,
} = require("./controllers/entretienController");

// Utilisation des routes
app.use("/api", contratRoutes);
app.use("/api", sinistreRoutes);
app.use("/api", parcRoutes);
app.use("/api", MarcheRoutes);
app.use("/api", vendus);
app.use("/api", get_car_dispo);
app.use("/api", pneu);
app.use("/api", achatRoutes);

app.get("/api/parc-global", getParcGlobal);
app.get("/api/parc_ca", get_ca_vehicule);
app.get("/api/cal_grille_offre", getTopClient);
app.get("/api/totalclient", getClientCount);
app.get("/api/cal_grille_offre_original", getTopClientOriginal);
app.get("/api/marge_client", getMargeParClient);
app.get("/api/ca_annuelle", get_ca);
app.get("/api/com_encours", get_commande_encours);
app.get("/api/km_project", get_km_projection);
app.get("/api/vidange_pro", get_vidange_projection);
app.get("/api/list_entretien", get_entretien_vehicule);
app.get("/api/all_entretien", get_all_entretien);
app.get("/api/entretien_matricule", get_entretien_matricule);

// Wildcard handler for serving index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

app.listen(3001, () => console.log("Server running on port 3001"));
