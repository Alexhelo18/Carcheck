function loadFooter() {
    const footer = document.getElementById("footer");

    if (!footer) {
        return;
    }

    footer.innerHTML = `
        <footer class="site-footer">
            <div class="footer-links">
                <a href="../pages/home.html#come-funziona">Come funziona</a>
                <a href="#">Chi siamo</a>
                <a href="#">Contatti</a>
                <a href="#">Termini e Condizioni</a>
                <a href="#">Privacy Policy</a>
                <a href="#">Cookie Policy</a>
                <a href="../pages/register.html">Registrazione officina</a>
                <a href="../pages/login.html">Accesso utente</a>
                <a href="../pages/login.html">Accesso officina</a>
            </div>
            <p>© 2026 CarCheck - Recensioni e prenotazioni per officine.</p>
        </footer>
    `;
}

loadFooter();
