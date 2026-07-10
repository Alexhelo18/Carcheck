const utenti = [];

function register(req, res) {
    const utente = {
        id: utenti.length + 1,
        nome: req.body.nome,
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
            tipo: req.body.tipo || "utente"
        }
    });
}

module.exports = {
    register,
    login
};
