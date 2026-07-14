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
    login
};
