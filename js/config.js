const CONFIG = {
    SERVER: {
        BASE_URL: "http://localhost:5001",
        API_BASE_URL: "http://localhost:5001/api/v1",
        SOCKET_URL: "http://localhost:5001",
    },
    MAP: {
        TILE_LAYER_URL: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ROUTING_SERVICE_URL: "https://router.project-osrm.org/route/v1",
    },
};

// Freeze the config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.SERVER);
Object.freeze(CONFIG.MAP);

export default CONFIG;
