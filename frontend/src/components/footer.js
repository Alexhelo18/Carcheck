function loadFooter() {
    const footer = document.getElementById("footer");

    if (!footer) {
        return;
    }

    const year = new Date().getFullYear();
    const company = {
        legalName: "[DA COMPLETARE]",
        supportEmail: "[EMAIL SUPPORTO DA COMPLETARE]"
    };

    footer.innerHTML = `
        <footer class="site-footer">
            <div class="footer-grid">
                <div class="footer-column">
                    <h2>CarCheck</h2>
                    <a href="../pages/chi-siamo.html">Chi siamo</a>
                    <a href="../pages/come-funziona.html">Come funziona</a>
                    <a href="../pages/contatti.html">Contatti</a>
                    <a href="../pages/lavora-con-noi.html">Lavora con noi</a>
                </div>

                <div class="footer-column">
                    <h2>Automobilisti</h2>
                    <a href="../pages/ricerca.html">Cerca officine</a>
                    <a href="../pages/come-funziona.html#automobilisti">Come prenotare</a>
                    <a href="../pages/dashboardUser.html">Le tue prenotazioni</a>
                    <a href="../pages/assistenza.html">Assistenza</a>
                    <a href="../pages/cancellazioni.html">Cancellazioni</a>
                    <a href="../pages/recensioni.html">Regole recensioni</a>
                </div>

                <div class="footer-column">
                    <h2>Officine</h2>
                    <a href="../pages/register.html">Registra la tua officina</a>
                    <a href="../pages/login.html">Accesso officina</a>
                    <a href="../pages/per-officine.html">Per officine</a>
                    <a href="../pages/per-officine.html#costi">Costi servizio</a>
                    <a href="../pages/assistenza.html#officine">Assistenza officine</a>
                    <a href="../pages/condizioni-officine.html">Condizioni officine</a>
                </div>

                <div class="footer-column">
                    <h2>Legale</h2>
                    <a href="../pages/termini.html">Termini e Condizioni</a>
                    <a href="../pages/privacy.html">Informativa Privacy</a>
                    <a href="../pages/cookie-policy.html">Cookie Policy</a>
                    <a href="../pages/preferenze-cookie.html">Preferenze cookie</a>
                    <a href="../pages/accessibilita.html">Accessibilità</a>
                    <a href="../pages/segnalazioni.html">Segnalazioni</a>
                </div>
            </div>

            <div class="footer-meta">
                <p>© ${year} CarCheck - ${company.legalName}</p>
                <p>Supporto: ${company.supportEmail}</p>
            </div>
        </footer>
    `;
}

loadFooter();
