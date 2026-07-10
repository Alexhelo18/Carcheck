function loadNavbar() {
    const navbar = document.getElementById("navbar");

    if (!navbar) {
        return;
    }

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
                <a href="../pages/dashboardUser.html">Area utente</a>
                <a href="../pages/dashboardOfficina.html">Area officina</a>
                <a href="../pages/loginUser.html" class="register-btn">Login</a>
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
            <a href="../pages/dashboardUser.html">
                <span class="tab-icon">P</span>
                <span>Utente</span>
            </a>
            <a href="../pages/dashboardOfficina.html">
                <span class="tab-icon">M</span>
                <span>Officina</span>
            </a>
        </nav>
    `;

    const navSearch = document.getElementById("navSearch");
    navSearch.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && navSearch.value.trim()) {
            const query = encodeURIComponent(navSearch.value.trim());
            window.location.href = `../pages/ricerca.html?servizio=${query}`;
        }
    });

    const currentPage = window.location.pathname.split("/").pop();
    document.querySelectorAll(".mobile-tabbar a").forEach((link) => {
        const linkPage = link.getAttribute("href").split("/").pop();

        if (linkPage === currentPage) {
            link.classList.add("active");
        }
    });
}

loadNavbar();
