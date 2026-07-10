function loadFooter() {
    const footer = document.getElementById("footer");

    if (!footer) {
        return;
    }

    footer.innerHTML = `
        <footer class="site-footer">
            <p>© 2026 CarCheck - Recensioni e prenotazioni per officine.</p>
        </footer>
    `;
}

loadFooter();
