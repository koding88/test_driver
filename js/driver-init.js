import { initMap } from "./driver-map.js";
import { initializeApp } from "./driver-app-state.js";
import { startTrip, endTrip, notifyArrival } from "./driver-trip.js";
import { handleRideAccept, handleRideReject } from "./driver-ride-request.js";
import { toggleApp, goOffline } from "./driver-tracking.js";

// Initialize the application
window.onload = async function () {
    // Initialize map
    initMap();

    // Initialize app state
    await initializeApp();

    // Bind event handlers to window for HTML onclick access
    window.startTrip = startTrip;
    window.endTrip = endTrip;
    window.notifyArrival = notifyArrival;
    window.handleRideAccept = handleRideAccept;
    window.handleRideReject = handleRideReject;
    window.toggleApp = toggleApp;
    window.goOffline = goOffline;
};
