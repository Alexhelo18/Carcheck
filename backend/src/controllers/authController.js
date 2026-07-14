const { readDemoStore } = require("../data/demoStore");
const { hashPassword, verifyPassword } = require("../utils/password");
const { rootAdmin } = require("../config/adminAccount");

const utenti = [];

function safeUser(utente) {
    const { passwordHash, ...safe } = utente;
    return safe;
}

function register(req, res) {
    const email = String(req.body.email || "").trim().toLowerCase();
    const tipo = req.body.tipo || "utente";
    const alreadyRegistered = utenti.some((utente) => utente.email === email && utente.tipo === tipo);

    if (!email || !req.body.password) {
        return res.status(400).json({ message: "Email e password sono obbligatorie." });
    }

    if (alreadyRegistered) {
        return res.status(409).json({ message: "Account gia registrato." });
    }

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
        email,
        passwordHash: hashPassword(req.body.password),
        tipo,
        status: "ACTIVE",
        verified: true
    };

    utenti.push(utente);
    res.status(201).json({ ok: true, utente: safeUser(utente) });
}

function login(req, res) {
    const email = String(req.body.email || "").trim().toLowerCase();
    const tipo = req.body.tipo || "utente";

    if (email === rootAdmin.email) {
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
        utente.email === email &&
        utente.tipo === tipo &&
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

    const registeredUser = utenti.find((utente) => (
        utente.email === email &&
        utente.tipo === tipo &&
        utente.status === "ACTIVE"
    ));

    if (!registeredUser || !verifyPassword(req.body.password, registeredUser.passwordHash)) {
        return res.status(401).json({ message: "Email o password non corrette." });
    }

    return res.json({
        ok: true,
        utente: safeUser(registeredUser)
    });
}

module.exports = {
    register,
    login,
    utenti
};
