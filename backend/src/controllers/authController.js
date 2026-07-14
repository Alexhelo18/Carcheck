const { readDemoStore } = require("../data/demoStore");
const { verifyPassword } = require("../utils/password");
const { rootAdmin } = require("../config/adminAccount");

const utenti = [];

function register(req, res) {
    const utente = {
        id: utenti.length + 1,
        nome: req.body.nome,
        nomeProfilo: req.body.nomeProfilo || "",
        cognome: req.body.cognome || "",
        username: req.body.username || "",
        dataNascita: req.body.dataNascita || "",
        telefono: req.body.telefono || "",
        marketing: Boolean(req.body.marketing),
        ragioneSociale: req.body.ragioneSociale || "",
        partitaIva: req.body.partitaIva || "",
        email: req.body.email,
        tipo: req.body.tipo || "utente"
    };

    utenti.push(utente);
    res.status(201).json({ ok: true, utente });
}

function login(req, res) {
    if (req.body.email === rootAdmin.email) {
        if (!verifyPassword(req.body.password, rootAdmin.passwordHash)) {
            return res.status(401).json({ message: "Credenziali non valide" });
        }

        return res.json({
            ok: true,
            utente: {
                id: rootAdmin.id,
                email: rootAdmin.email,
                nome: rootAdmin.nome,
                tipo: "admin",
                role: rootAdmin.role,
                verified: true,
                is_demo: false
            }
        });
    }

    const demoUser = readDemoStore().users.find((utente) => (
        utente.email === req.body.email &&
        utente.tipo === (req.body.tipo || "utente") &&
        utente.status === "ACTIVE"
    ));

    if (demoUser) {
        if (!verifyPassword(req.body.password, demoUser.passwordHash)) {
            return res.status(401).json({ message: "Credenziali non valide" });
        }

        return res.json({
            ok: true,
            utente: {
                id: demoUser.id,
                email: demoUser.email,
                nome: demoUser.nome,
                cognome: demoUser.cognome,
                tipo: demoUser.tipo,
                role: demoUser.role,
                verified: demoUser.verified,
                officinaId: demoUser.officinaId,
                is_demo: demoUser.is_demo
            }
        });
    }

    res.json({
        ok: true,
        utente: {
            email: req.body.email,
            nome: req.body.nome || "",
            tipo: req.body.tipo || "utente"
        }
    });
}

module.exports = {
    register,
    login,
    utenti
};
