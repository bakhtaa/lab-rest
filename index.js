const express = require('express');
const cors = require('cors');
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/* =========================
   KEYCLOAK DISABLED (TEST MODE)
   ========================= */

 const memoryStore = new session.MemoryStore();

 app.use(session({
    secret: 'api-secret',
     resave: false,
     saveUninitialized: true,
    store: memoryStore
}));

 const keycloak = new Keycloak(
    { store: memoryStore },
     './keycloak-config.json'
 );

 app.use(keycloak.middleware());

/* =========================
   SWAGGER
   ========================= */

const swaggerDoc = YAML.load("./openapi.yaml");

console.log(swaggerDoc.components);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

/* =========================
   ROUTES (NO AUTH)
   ========================= */

app.get('/', keycloak.protect(), (req, res) => {
    res.json("Registre de personnes! API en mode test sans Keycloak");
});

app.get('/secure',keycloak.protect(),  (req, res) => {
    res.json({ message: 'Authenticated Successfully (TEST MODE)' });
});

/* =========================
   CRUD PERSONNES
   ========================= */

// GET ALL
app.get('/personnes', (req, res, next) => {
    console.log("Authorization:", req.headers.authorization);
    next();
}, keycloak.protect(), (req, res) => {
    db.all("SELECT * FROM personnes", [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// GET BY ID
app.get('/personnes/:id', keycloak.protect(), (req, res) => {
    const id = req.params.id;

    db.get("SELECT * FROM personnes WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({
            message: "success",
            data: row
        });
    });
});

// CREATE
app.post('/personnes',keycloak.protect(),  (req, res) => {
    const nom = req.body.nom;
    const adresse = req.body.adresse;

    db.run(
        `INSERT INTO personnes (nom, adresse) VALUES (?, ?)`,
        [nom, adresse],
        function (err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            res.json({
                message: "success",
                data: {
                    id: this.lastID,
                    nom,
                    adresse
                }
            });
        }
    );
});

// UPDATE
app.put('/personnes/:id', keycloak.protect(), (req, res) => {
    const id = req.params.id;
    const nom = req.body.nom;
    const adresse = req.body.adresse;

    db.run(
        `UPDATE personnes SET nom = ?, adresse = ? WHERE id = ?`,
        [nom, adresse, id],
        function (err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            res.json({ message: "success" });
        }
    );
});

// DELETE
app.delete('/personnes/:id',keycloak.protect(), (req, res) => {
    const id = req.params.id;

    db.run(
        `DELETE FROM personnes WHERE id = ?`,
        id,
        function (err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            res.json({ message: "success" });
        }
    );
});

/* =========================
   START SERVER
   ========================= */

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});