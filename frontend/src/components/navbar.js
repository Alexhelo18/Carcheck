function loadNavbar() {
    const navbar = document.getElementById("navbar");

    if (!navbar) {
        return;
    }

    const icon = {
        home: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.2v-6.2H8.7V21H3.5a.5.5 0 0 1-.5-.5z"></path>
            </svg>
        `,
        search: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10.8 18.1a7.3 7.3 0 1 1 0-14.6 7.3 7.3 0 0 1 0 14.6Zm5.2-1.8 4.5 4.5"></path>
            </svg>
        `,
        calendar: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"></path>
            </svg>
        `,
        user: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM4.8 20.4a7.2 7.2 0 0 1 14.4 0"></path>
            </svg>
        `,
        garage: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 10.5 12 4l9 6.5V21H3V10.5Z"></path>
                <path d="M7 21v-7h10v7M8.5 10.5h7"></path>
            </svg>
        `,
        account: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14"></path>
            </svg>
        `
    };

    const session = JSON.parse(localStorage.getItem("carcheckUser") || "null");
    const dashboardLink = session && session.tipo === "officina"
        ? `<a href="../pages/dashboardOfficina.html">Area officina</a>`
        : session && session.tipo === "utente"
            ? `<a href="../pages/dashboardUser.html">Area utente</a>`
            : "";
    const authLinks = session
        ? `<button type="button" class="nav-logout" id="logoutBtn">Esci</button>`
        : `
            <a href="../pages/login.html">Accedi</a>
            <a href="../pages/register.html" class="register-btn">Registrati</a>
        `;
    const mobilePrivateLinks = session && session.tipo === "officina"
        ? `
            <a href="../pages/dashboardOfficina.html" data-mobile-tab="account">
                <span class="tab-icon">${icon.garage}</span>
                <span>Officina</span>
            </a>
        `
        : session && session.tipo === "utente"
            ? `
                <a href="../pages/dashboardUser.html" data-mobile-tab="account">
                    <span class="tab-icon">${icon.user}</span>
                    <span>Utente</span>
                </a>
            `
            : `
                <button type="button" class="mobile-account-btn" id="mobileAccountBtn" data-mobile-tab="account">
                    <span class="tab-icon">${icon.account}</span>
                    <span>Account</span>
                </button>
            `;
    const mobileAccountPanel = session ? "" : `
        <div class="mobile-account-panel" id="mobileAccountPanel" aria-hidden="true">
            <a href="../pages/login.html">
                <span class="tab-icon">${icon.user}</span>
                <span>Accedi</span>
            </a>
            <a href="../pages/register.html">
                <span class="tab-icon">${icon.account}</span>
                <span>Registrati</span>
            </a>
        </div>
    `;

    navbar.innerHTML = `
        <nav class="navbar">
            <a href="../pages/home.html" class="nav-logo">
                <img src="../../../public/immages/Logo carcheck.png" class="logo-img" alt="Logo CarCheck">
                <span>CarCheck</span>
            </a>

            <div class="nav-center">
                <input type="text" placeholder="Cerca officine..." class="search-bar" id="navSearch">
            </div>

            <div class="nav-right">
                <a href="../pages/ricerca.html">Officine</a>
                ${dashboardLink}
                ${authLinks}
            </div>
        </nav>

        <nav class="mobile-tabbar" aria-label="Navigazione mobile">
            <a href="../pages/home.html" data-mobile-tab="home">
                <span class="tab-icon">${icon.home}</span>
                <span>Home</span>
            </a>
            <a href="../pages/ricerca.html" data-mobile-tab="search">
                <span class="tab-icon">${icon.search}</span>
                <span>Cerca</span>
            </a>
            <a href="../pages/ricerca.html?azione=prenota" data-mobile-tab="booking">
                <span class="tab-icon">${icon.calendar}</span>
                <span>Prenota</span>
            </a>
            ${mobilePrivateLinks}
        </nav>
        ${mobileAccountPanel}
    `;

    const navSearch = document.getElementById("navSearch");
    navSearch.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && navSearch.value.trim()) {
            const query = encodeURIComponent(navSearch.value.trim());
            window.location.href = `../pages/ricerca.html?servizio=${query}`;
        }
    });

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("carcheckUser");
            window.location.href = "../pages/home.html";
        });
    }

    const mobileAccountBtn = document.getElementById("mobileAccountBtn");
    const mobileAccountPanelElement = document.getElementById("mobileAccountPanel");

    if (mobileAccountBtn && mobileAccountPanelElement) {
        mobileAccountBtn.addEventListener("click", () => {
            const isOpen = mobileAccountPanelElement.classList.toggle("open");
            mobileAccountPanelElement.setAttribute("aria-hidden", String(!isOpen));
            mobileAccountBtn.classList.toggle("active", isOpen);
        });
    }

    const currentPage = window.location.pathname.split("/").pop();

    if (mobileAccountBtn && ["login.html", "register.html"].includes(currentPage)) {
        mobileAccountBtn.classList.add("active");
    }

    const mobileTabByPage = {
        "home.html": "home",
        "ricerca.html": new URLSearchParams(window.location.search).get("azione") === "prenota" ? "booking" : "search",
        "officina.html": "search",
        "prenotazione.html": "booking",
        "dashboardUser.html": "account",
        "dashboardOfficina.html": "account",
        "login.html": "account",
        "register.html": "account"
    };
    const activeMobileTab = mobileTabByPage[currentPage];

    document.querySelectorAll(".mobile-tabbar > a, .mobile-tabbar > button").forEach((item) => {
        const marker = item.dataset.mobileTab || item.querySelector("[data-mobile-tab]")?.dataset.mobileTab;
        const isActive = marker === activeMobileTab;
        item.classList.toggle("active", isActive);
        if (isActive) item.setAttribute("aria-current", "page");
    });
}

loadNavbar();
