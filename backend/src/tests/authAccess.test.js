const assert = require("assert");
const authController = require("../controllers/authController");

function mockReq(body = {}) {
    return { body };
}

function mockRes() {
    return {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.payload = payload;
            return this;
        }
    };
}

function call(handler, body) {
    const res = mockRes();
    handler(mockReq(body), res);
    return res;
}

function run() {
    const unknown = call(authController.login, {
        email: "nonregistrato@test.local",
        password: "Password123!",
        tipo: "utente"
    });

    assert.equal(unknown.statusCode, 401, "un account non registrato non deve accedere");

    const registered = call(authController.register, {
        nome: "Utente Test",
        email: "registrato@test.local",
        password: "Password123!",
        tipo: "utente"
    });

    assert.equal(registered.statusCode, 201, "registrazione riuscita");
    assert.equal(registered.payload.utente.passwordHash, undefined, "hash password non esposto");

    const login = call(authController.login, {
        email: "registrato@test.local",
        password: "Password123!",
        tipo: "utente"
    });

    assert.equal(login.statusCode, 200, "account registrato puo accedere");

    const wrongPassword = call(authController.login, {
        email: "registrato@test.local",
        password: "Sbagliata123!",
        tipo: "utente"
    });

    assert.equal(wrongPassword.statusCode, 401, "password errata bloccata");
    console.log("authAccess.test.js: ok");
}

run();
