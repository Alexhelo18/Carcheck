const DEFAULT_ADMIN_EMAIL = "axhelo@carcheck.it";
const DEFAULT_ADMIN_PASSWORD_HASH = "pbkdf2$carcheck-admin-v1$32ecd31ae4ad78535b06a3543e25564128f180f0e10f16d914d9c5ad1da79339c36dfd96fd27c1d97f64a4ef958aaa597f410fbb9e06ab2d28de42d558ce9c88";

const rootAdmin = {
    id: 1,
    nome: "Admin CarCheck",
    email: process.env.ROOT_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL,
    passwordHash: process.env.ROOT_ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_PASSWORD_HASH,
    role: "SUPER_ADMIN",
    tipo: "admin",
    status: "ACTIVE",
    verified: true,
    twoFactorEnabled: false,
    is_demo: false
};

module.exports = {
    rootAdmin
};
