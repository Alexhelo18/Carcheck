const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "demoStore.json");

const emptyDemoStore = {
    meta: {
        isDemo: true,
        environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
        updatedAt: null
    },
    users: [],
    adminUsers: [],
    vehicles: [],
    workshops: [],
    services: [],
    workshopSettings: {},
    calendarBlocks: [],
    bookings: [],
    bookingEvents: [],
    rescheduleProposals: [],
    reviews: [],
    platformFees: [],
    reports: [],
    tickets: [],
    adminNotes: [],
    auditLogs: [],
    settings: {}
};

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function readDemoStore() {
    if (!fs.existsSync(DATA_FILE)) {
        return structuredClone(emptyDemoStore);
    }

    try {
        return {
            ...structuredClone(emptyDemoStore),
            ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))
        };
    } catch (err) {
        return structuredClone(emptyDemoStore);
    }
}

function writeDemoStore(data) {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        ...structuredClone(emptyDemoStore),
        ...data,
        meta: {
            ...(data.meta || {}),
            isDemo: true,
            updatedAt: new Date().toISOString()
        }
    }, null, 2));
}

module.exports = {
    DATA_FILE,
    readDemoStore,
    writeDemoStore,
    emptyDemoStore
};
