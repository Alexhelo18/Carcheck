const crypto = require("crypto");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, "sha512").toString("hex");
    return `pbkdf2$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
    const [method, salt, hash] = String(storedHash || "").split("$");

    if (method !== "pbkdf2" || !salt || !hash) {
        return false;
    }

    return hashPassword(password, salt) === storedHash;
}

module.exports = {
    hashPassword,
    verifyPassword
};
