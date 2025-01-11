import CONFIG from "./config.js";
import { checkDriverActiveTrip } from "./driver-trip.js";
import { toggleApp } from "./driver-tracking.js";

// Global state variables
export const appState = {
    isOnline: false,
    isAppEnabled: false,
    watchId: null,
    currentLocation: null,
    currentTrip: null,
    currentRideRequest: null,
    driverMarker: null,
    routeControl: null,
    driverID: "6778b7848652dafe31a9788f",
    passengerMarker: null,
    currentRoute: null,
};

// Map configuration
export const MAP_CONFIG = {
    initialZoom: 15,
    tileLayerUrl: CONFIG.MAP.TILE_LAYER_URL,
};

// Initialize app
export async function initializeApp() {
    const driverId = document.getElementById("driverSelect").value;
    await checkDriverActiveTrip(driverId);
    if (appState.currentRideRequest || appState.currentTrip) {
        await toggleApp();
    }
}
