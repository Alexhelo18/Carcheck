const API_URL = window.location.protocol === "file:"
    ? "http://localhost:3000/api"
    : `${window.location.origin}/api`;

const api = {
    async request(path, options = {}) {
        const res = await fetch(`${API_URL}${path}`, {
            headers: { "Content-Type": "application/json" },
            ...options
        });

        if (!res.ok) {
            let payload = {};

            try {
                payload = await res.json();
            } catch (err) {
                payload = {};
            }

            const error = new Error(payload.message || "Richiesta non riuscita");
            error.status = res.status;
            throw error;
        }

        return await res.json();
    },

    async getOfficine() {
        try {
            return await this.request("/officine");
        } catch (err) {
            console.error("API officine non disponibile:", err);
            return [];
        }
    },

    async getOfficinaById(id) {
        try {
            return await this.request(`/officine/${id}`);
        } catch (err) {
            console.error("API dettaglio officina non disponibile:", err);
            return null;
        }
    },

    async createPrenotazione(prenotazione) {
        return await this.request("/bookings", {
            method: "POST",
            body: JSON.stringify(prenotazione)
        });
    },

    async getPrenotazioni(filters = {}) {
        const params = new URLSearchParams(filters);
        const query = params.toString() ? `?${params.toString()}` : "";
        return await this.request(`/prenotazioni${query}`);
    },

    async updatePrenotazione(id, data) {
        return await this.request(`/prenotazioni/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data)
        });
    },

    async getWorkshopServices(workshopId) {
        return await this.request(`/workshops/${workshopId}/services`);
    },

    async saveWorkshopServices(workshopId, services) {
        return await this.request(`/workshops/${workshopId}/services`, {
            method: "PUT",
            body: JSON.stringify({ services })
        });
    },

    async getAvailability(workshopId, serviceId, date) {
        const params = new URLSearchParams({ serviceId, date });
        return await this.request(`/workshops/${workshopId}/availability?${params.toString()}`);
    },

    async getWorkshopAgenda(workshopId) {
        return await this.request(`/workshops/${workshopId}/agenda`);
    },

    async saveWorkshopAgenda(workshopId, settings) {
        return await this.request(`/workshops/${workshopId}/agenda`, {
            method: "PUT",
            body: JSON.stringify(settings)
        });
    },

    async createCalendarBlock(workshopId, block) {
        return await this.request(`/workshops/${workshopId}/calendar-blocks`, {
            method: "POST",
            body: JSON.stringify(block)
        });
    },

    async getBooking(id) {
        return await this.request(`/bookings/${id}`);
    },

    async bookingAction(id, action, data = {}) {
        return await this.request(`/bookings/${id}/${action}`, {
            method: "PATCH",
            body: JSON.stringify(data)
        });
    },

    async proposeReschedule(id, proposal) {
        return await this.request(`/bookings/${id}/reschedule-proposals`, {
            method: "POST",
            body: JSON.stringify(proposal)
        });
    },

    async respondReschedule(id, proposalId, action) {
        return await this.request(`/bookings/${id}/reschedule-proposals/${proposalId}/${action}`, {
            method: "PATCH",
            body: JSON.stringify({})
        });
    },

    async getNotifications(filters = {}) {
        const params = new URLSearchParams(filters);
        const query = params.toString() ? `?${params.toString()}` : "";
        return await this.request(`/notifications${query}`);
    }
};
