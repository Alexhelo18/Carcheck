function loadNavbar() {
    const navbar = document.getElementById("navbar");

    if (!navbar) {
        return;
    }

    const session = JSON.parse(localStorage.getItem("carcheckUser") || "null");
    const dashboardLink = session && session.tipo === "officina"
        ? `<a href="../pages/dashboardOfficina.html">Area officina</a>`
        : session && session.tipo === "utente"
            ? `<a href="../pages/dashboardUser.html">Area utente</a>`
            : "";
    const authLinks = session
        ? `<button type="button" class="nav-logout" id="logoutBtn">Esci</button>`
        : `
            <a href="../pages/loginUser.html">Accedi utente</a>
            <a href="../pages/loginOfficina.html">Accedi officina</a>
            <a href="../pages/registerUser.html" class="register-btn">Registrati</a>
        `;
    const mobileAreaLink = session && session.tipo === "officina"
        ? `
            <a href="../pages/dashboardOfficina.html">
                <span class="tab-icon">M</span>
                <span>Officina</span>
            </a>
        `
        : session && session.tipo === "utente"
            ? `
                <a href="../pages/dashboardUser.html">
                    <span class="tab-icon">P</span>
                    <span>Utente</span>
                </a>
            `
            : `
                <a href="../pages/loginUser.html">
                    <span class="tab-icon">L</span>
                    <span>Login</span>
                </a>
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
            <a href="../pages/home.html">
                <span class="tab-icon">H</span>
                <span>Home</span>
            </a>
            <a href="../pages/ricerca.html">
                <span class="tab-icon">C</span>
                <span>Cerca</span>
            </a>
            <a href="../pages/ricerca.html">
                <span class="tab-icon">+</span>
                <span>Prenota</span>
            </a>
            ${mobileAreaLink}
        </nav>
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

    const currentPage = window.location.pathname.split("/").pop();
    document.querySelectorAll(".mobile-tabbar a").forEach((link) => {
        const linkPage = link.getAttribute("href").split("/").pop();

        if (linkPage === currentPage) {
            link.classList.add("active");
        }
    });
}

loadNavbar();
