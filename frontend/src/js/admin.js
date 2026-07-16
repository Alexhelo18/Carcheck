const isLocalAdminFrontend = window.location.protocol === "file:"
    || ["localhost", "127.0.0.1"].includes(window.location.hostname);
const ADMIN_API = isLocalAdminFrontend && window.location.port !== "3000"
    ? "http://localhost:3000/api/admin"
    : `${window.location.origin}/api/admin`;

const adminState = {
    token: localStorage.getItem("carcheckAdminToken") || "",
    admin: JSON.parse(localStorage.getItem("carcheckAdmin") || "null"),
    data: {},
    section: "overview"
};

async function adminRequest(path, options = {}) {
    const res = await fetch(`${ADMIN_API}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(adminState.token ? { Authorization: `Bearer ${adminState.token}` } : {})
        },
        ...options
    });

    if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Richiesta admin non riuscita.");
    }

    return res.json();
}

function cents(value) {
    return `${(Number(value || 0) / 100).toFixed(2)} €`;
}

function badge(value) {
    return `<span class="status-pill">${value || "N/D"}</span>`;
}

function demo(value) {
    return value ? `<span class="status-pill">Demo</span>` : "";
}

function renderTable(columns, rows, emptyText) {
    if (!rows.length) {
        return `<p class="empty-state">${emptyText}</p>`;
    }

    return `
        <div class="admin-table-wrap">
            <table class="admin-table">
                <thead><tr>${columns.map((col) => `<th>${col.label}</th>`).join("")}</tr></thead>
                <tbody>
                    ${rows.map((row) => `
                        <tr>${columns.map((col) => `<td>${col.render ? col.render(row) : row[col.key] || ""}</td>`).join("")}</tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderKpis(metrics) {
    const cards = [
        ["Utenti totali", metrics.users.total],
        ["Utenti attivi", metrics.users.active],
        ["Officine attive", metrics.workshops.active],
        ["Prenotazioni totali", metrics.bookings.total],
        ["Richieste in attesa", metrics.bookings.pending],
        ["Completate", metrics.bookings.completed],
        ["Ricavi maturati", cents(metrics.revenue.maturedCents)],
        ["Fee da incassare", cents(metrics.revenue.dueCents)]
    ];

    return `<div class="admin-kpi-grid">${cards.map(([label, value]) => `
        <article class="admin-kpi"><span>${label}</span><strong>${value}</strong></article>
    `).join("")}</div>`;
}

function renderOverview() {
    const overview = adminState.data.overview;
    const metrics = overview.metrics;

    return `
        ${renderKpis(metrics)}
        <section class="dashboard-grid">
            <article class="dashboard-panel">
                <h2>Metriche operative</h2>
                <div class="admin-metric-list">
                    <p>Completion rate <strong>${(metrics.operations.completionRate * 100).toFixed(1)}%</strong></p>
                    <p>Cancellation rate <strong>${(metrics.operations.cancellationRate * 100).toFixed(1)}%</strong></p>
                    <p>No-show rate <strong>${(metrics.operations.noShowRate * 100).toFixed(1)}%</strong></p>
                    <p>Workshop acceptance rate <strong>${(metrics.operations.workshopAcceptanceRate * 100).toFixed(1)}%</strong></p>
                    <p>Prenotazioni medie/officina <strong>${metrics.operations.averageBookingsPerWorkshop}</strong></p>
                </div>
            </article>
            <article class="dashboard-panel">
                <h2>Ricavi</h2>
                <div class="admin-chart-bars">
                    <span style="--value:${metrics.revenue.maturedCents || 1}">Maturati ${cents(metrics.revenue.maturedCents)}</span>
                    <span style="--value:${metrics.revenue.paidCents || 1}">Incassati ${cents(metrics.revenue.paidCents)}</span>
                    <span style="--value:${metrics.revenue.dueCents || 1}">Da incassare ${cents(metrics.revenue.dueCents)}</span>
                </div>
                <p class="field-hint">Stima e grafici sono basati sui dati disponibili. Nessun pagamento reale viene eseguito.</p>
            </article>
        </section>
    `;
}

function renderSection(section) {
    const query = document.getElementById("adminSearch")?.value.toLowerCase().trim() || "";
    const filterRows = (rows) => rows.filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query));
    const data = adminState.data;

    const sections = {
        overview: renderOverview,
        analytics: () => renderOverview(),
        users: () => renderTable([
            { label: "Nome", render: (row) => `${row.nome || ""} ${row.cognome || ""}` },
            { label: "Email", key: "email" },
            { label: "Stato", render: (row) => badge(row.status) },
            { label: "Verificato", render: (row) => row.verified ? "Si" : "No" },
            { label: "Veicoli", key: "vehiclesCount" },
            { label: "Prenotazioni", key: "bookingsCount" },
            { label: "Demo", render: (row) => demo(row.is_demo) }
        ], filterRows(data.users || []), "Non ci sono utenti da mostrare."),
        workshops: () => renderTable([
            { label: "Officina", key: "nome" },
            { label: "Citta", key: "citta" },
            { label: "P. IVA", key: "partitaIva" },
            { label: "Stato", render: (row) => badge(row.status) },
            { label: "Servizi", key: "activeServices" },
            { label: "Prenotazioni", key: "bookingsCount" },
            { label: "Fee maturate", render: (row) => cents(row.feeMaturedCents) },
            { label: "Demo", render: (row) => demo(row.is_demo) }
        ], filterRows(data.workshops || []), "Non ci sono officine in attesa di verifica."),
        bookings: () => renderTable([
            { label: "ID", render: (row) => `#${row.id}` },
            { label: "Utente", render: (row) => row.customerName || row.userEmail },
            { label: "Officina", key: "workshopName" },
            { label: "Servizio", key: "serviceName" },
            { label: "Stato", render: (row) => badge(row.status) },
            { label: "Modalita", key: "bookingMode" },
            { label: "Prezzo", render: (row) => `${Number(row.estimatedPrice || 0).toFixed(2)} €` },
            { label: "Demo", render: (row) => demo(row.is_demo) }
        ], filterRows(data.bookings || []), "Non ci sono prenotazioni nel periodo selezionato."),
        fees: () => renderTable([
            { label: "Booking", render: (row) => `#${row.bookingId}` },
            { label: "Officina", key: "workshopId" },
            { label: "Importo", render: (row) => cents(row.amountCents) },
            { label: "Stato", render: (row) => badge(row.status) },
            { label: "Maturata", key: "maturedAt" },
            { label: "Demo", render: (row) => demo(row.is_demo) }
        ], filterRows(data.fees || []), "Nessuna commissione maturata nel periodo selezionato."),
        reviews: () => renderTable([
            { label: "Autore", key: "autore" },
            { label: "Officina", key: "workshopId" },
            { label: "Booking", key: "bookingId" },
            { label: "Voto", key: "voto" },
            { label: "Stato", render: (row) => badge(row.status) },
            { label: "Verificata", render: (row) => row.verified ? "Si" : "No" },
            { label: "Demo", render: (row) => demo(row.is_demo) }
        ], filterRows(data.reviews || []), "Non ci sono recensioni da moderare."),
        reports: () => renderTable([
            { label: "Categoria", key: "category" },
            { label: "Priorita", key: "priority" },
            { label: "Stato", render: (row) => badge(row.status) },
            { label: "Risorsa", key: "resource" },
            { label: "Demo", render: (row) => demo(row.is_demo) }
        ], filterRows(data.reports || []), "Non sono presenti segnalazioni aperte."),
        tickets: () => renderTable([
            { label: "Categoria", key: "category" },
            { label: "Priorita", key: "priority" },
            { label: "Stato", render: (row) => badge(row.status) },
            { label: "Assegnatario", key: "assignee" },
            { label: "Demo", render: (row) => demo(row.is_demo) }
        ], filterRows(data.tickets || []), "Non sono presenti ticket aperti."),
        content: () => `<section class="dashboard-panel"><h2>Contenuti</h2><p>FAQ, banner, testi informativi e pagine vanno collegati a un CMS o tabella contenuti con versione, autore e storico modifiche.</p></section>`,
        settings: () => `<section class="dashboard-panel"><h2>Configurazioni globali</h2><pre class="admin-json">${JSON.stringify(data.settings || {}, null, 2)}</pre><p class="field-hint">Le modifiche critiche sono riservate ai SUPER_ADMIN via endpoint protetto.</p></section>`,
        admins: () => renderTable([
            { label: "Nome", key: "nome" },
            { label: "Email", key: "email" },
            { label: "Ruolo", render: (row) => badge(row.role) },
            { label: "Stato", render: (row) => badge(row.status) },
            { label: "2FA", render: (row) => row.twoFactorEnabled ? "Attiva" : "Da configurare" }
        ], filterRows(data.admins || []), "Non ci sono amministratori da mostrare."),
        audit: () => renderTable([
            { label: "Admin", key: "adminEmail" },
            { label: "Azione", key: "action" },
            { label: "Risorsa", key: "resource" },
            { label: "Esito", key: "outcome" },
            { label: "Timestamp", key: "timestamp" }
        ], filterRows(data.audit || []), "Nessun evento nel registro attivita."),
        security: () => `<section class="dashboard-panel"><h2>Stato sistema</h2><pre class="admin-json">${JSON.stringify(data.system || {}, null, 2)}</pre><p class="field-hint">2FA, rate limiting avanzato e sessioni revocabili sono predisposti, non completamente collegati.</p></section>`
    };

    document.getElementById("adminContent").innerHTML = sections[section] ? sections[section]() : renderOverview();
}

async function loadAdminData() {
    const [overview, users, workshops, bookings, fees, reviews, reports, tickets, settings, admins, audit] = await Promise.all([
        adminRequest("/overview"),
        adminRequest("/users"),
        adminRequest("/workshops"),
        adminRequest("/bookings"),
        adminRequest("/fees"),
        adminRequest("/reviews"),
        adminRequest("/reports"),
        adminRequest("/tickets"),
        adminRequest("/settings"),
        adminRequest("/admin-users"),
        adminRequest("/audit-logs")
    ]);

    let system = {};
    try {
        system = await adminRequest("/system");
    } catch (err) {
        system = { status: "Permesso richiesto: SUPER_ADMIN" };
    }

    adminState.data = { overview, users, workshops, bookings, fees, reviews, reports, tickets, settings, admins, audit, system };
    document.getElementById("adminEnvironment").textContent = overview.environment || "Demo";
    document.getElementById("adminNotifications").innerHTML = (overview.notifications || [])
        .map((item) => `<p>${item.message}</p>`)
        .join("") || `<p>Nessuna notifica amministrativa urgente.</p>`;
    renderSection(adminState.section);
}

function showDashboard() {
    document.getElementById("adminLoginPanel").classList.add("hidden");
    document.getElementById("adminDashboard").classList.remove("hidden");
    document.getElementById("adminName").textContent = `${adminState.admin?.nome || "Admin"} · ${adminState.admin?.role || ""}`;
    loadAdminData().catch(() => {
        localStorage.removeItem("carcheckAdminToken");
        localStorage.removeItem("carcheckAdmin");
        document.getElementById("adminLoginPanel").classList.remove("hidden");
        document.getElementById("adminDashboard").classList.add("hidden");
    });
}

function bindAdminUi() {
    document.getElementById("adminLoginForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const message = document.getElementById("adminLoginMessage");
        message.textContent = "";

        try {
            const result = await adminRequest("/login", {
                method: "POST",
                body: JSON.stringify({
                    email: form.elements.email.value.trim(),
                    password: form.elements.password.value
                })
            });
            adminState.token = result.token;
            adminState.admin = result.admin;
            localStorage.setItem("carcheckAdminToken", result.token);
            localStorage.setItem("carcheckAdmin", JSON.stringify(result.admin));
            showDashboard();
        } catch (err) {
            message.textContent = err.message;
        }
    });

    document.querySelectorAll("[data-admin-section]").forEach((button) => {
        button.addEventListener("click", () => {
            adminState.section = button.dataset.adminSection;
            document.querySelectorAll("[data-admin-section]").forEach((item) => item.classList.toggle("active", item === button));
            document.getElementById("adminTitle").textContent = button.textContent;
            document.getElementById("adminBreadcrumb").textContent = `Admin / ${button.textContent}`;
            renderSection(adminState.section);
            document.getElementById("adminSidebar").classList.remove("open");
        });
    });

    document.getElementById("adminSearch").addEventListener("input", () => renderSection(adminState.section));
    document.getElementById("adminMenuBtn").addEventListener("click", () => document.getElementById("adminSidebar").classList.toggle("open"));
    document.getElementById("adminLogout").addEventListener("click", async () => {
        await adminRequest("/logout", { method: "POST", body: JSON.stringify({}) }).catch(() => {});
        localStorage.removeItem("carcheckAdminToken");
        localStorage.removeItem("carcheckAdmin");
        localStorage.removeItem("carcheckUser");
        window.location.href = "../pages/login.html";
    });
}

bindAdminUi();

if (adminState.token && adminState.admin) {
    showDashboard();
}
