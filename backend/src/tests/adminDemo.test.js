const assert = require("assert");
const { execFileSync } = require("child_process");
const path = require("path");
const adminController = require("../controllers/adminController");
const { readDemoStore } = require("../data/demoStore");

const backendDir = path.join(__dirname, "../..");

function mockReq({ body = {}, query = {}, params = {}, headers = {} } = {}) {
    return { body, query, params, headers, ip: "127.0.0.1", originalUrl: "/test" };
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

function call(handler, req) {
    const res = mockRes();
    handler(req, res, () => {
        res.nextCalled = true;
    });
    return res;
}

function seed(extraEnv = {}) {
    execFileSync("node", ["src/scripts/seedDemo.js"], {
        cwd: backendDir,
        env: {
            ...process.env,
            NODE_ENV: "test",
            DEMO_USER_EMAIL: "demo.user@test.local",
            DEMO_USER_PASSWORD: "DemoUserPassword123!",
            DEMO_WORKSHOP_EMAIL: "demo.workshop@test.local",
            DEMO_WORKSHOP_PASSWORD: "DemoWorkshopPassword123!",
            SUPER_ADMIN_EMAIL: "super.admin@test.local",
            SUPER_ADMIN_PASSWORD: "SuperAdminPassword123!",
            ...extraEnv
        },
        stdio: "pipe"
    });
}

function run() {
    seed();
    seed();

    const store = readDemoStore();
    assert.equal(store.users.length, 2, "seed idempotente: utenti non duplicati");
    assert.equal(store.adminUsers.length, 1, "seed idempotente: admin non duplicati");
    assert.equal(store.bookings.length, 12, "crea 12 prenotazioni demo");
    assert.equal(store.platformFees.length, 3, "crea fee per prenotazioni completate");

    let productionBlocked = false;
    try {
        seed({ NODE_ENV: "production", ALLOW_DEMO_SEED: "" });
    } catch (err) {
        productionBlocked = true;
    }
    assert.equal(productionBlocked, true, "seed bloccato in produzione");

    const loginRes = call(adminController.login, mockReq({
        body: {
            email: "super.admin@test.local",
            password: "SuperAdminPassword123!"
        }
    }));
    assert.equal(loginRes.statusCode, 200, "accesso super admin riuscito");
    assert.ok(loginRes.payload.token, "token admin presente");

    const denied = call(adminController.requireAdmin("read"), mockReq());
    assert.equal(denied.statusCode, 401, "admin bloccato senza token");

    const allowedReq = mockReq({ headers: { authorization: `Bearer ${loginRes.payload.token}` } });
    const allowed = call(adminController.requireAdmin("read"), allowedReq);
    assert.equal(allowed.nextCalled, true, "admin autorizzato con token");

    const metrics = adminController.overviewMetrics();
    assert.ok(metrics.users.total >= 2, "KPI utenti calcolati");
    assert.ok(metrics.revenue.maturedCents > 0, "KPI ricavi calcolati");

    console.log("adminDemo.test.js: ok");
}

run();
