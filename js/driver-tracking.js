import CONFIG from "./config.js";
import { socket } from "./driver-socket.js";
import { showNotification, updateStatus } from "./driver-ui.js";
import { createDriverMarker } from "./driver-map.js";
import { appState } from "./driver-app-state.js";

export let isAppEnabled = false;

// Toggle app state
export async function toggleApp() {
    try {
        const driverId = document.getElementById("driverSelect").value;
        if (!driverId) {
            showNotification("Error", "No driver selected");
            return;
        }

        isAppEnabled = !isAppEnabled;
        const toggleButton = document.getElementById("toggleAppBtn");
        const offlineButton = document.getElementById("offlineBtn");

        if (isAppEnabled) {
            toggleButton.textContent = "Disable App";
            toggleButton.classList.remove("bg-blue-500");
            toggleButton.classList.add("bg-red-500");
            offlineButton.style.display = "inline-block";

            // Update driver status to online
            await updateDriverStatus(driverId, "online");
            await startTracking();
        } else {
            toggleButton.textContent = "Enable App";
            toggleButton.classList.remove("bg-red-500");
            toggleButton.classList.add("bg-blue-500");
            offlineButton.style.display = "none";

            // Update driver status to offline
            await updateDriverStatus(driverId, "offline");
            stopTracking();
        }
    } catch (error) {
        console.error("Error toggling app state:", error);
        showNotification("Error", "Failed to toggle app state");
    }
}

// Go offline
export async function goOffline() {
    try {
        const driverId = document.getElementById("driverSelect").value;
        if (!driverId) {
            showNotification("Error", "No driver selected");
            return;
        }

        // Update driver status to offline
        await updateDriverStatus(driverId, "offline");
        stopTracking();

        // Update UI
        const toggleButton = document.getElementById("toggleAppBtn");
        const offlineButton = document.getElementById("offlineBtn");
        toggleButton.textContent = "Enable App";
        toggleButton.classList.remove("bg-red-500");
        toggleButton.classList.add("bg-blue-500");
        offlineButton.style.display = "none";
        isAppEnabled = false;
    } catch (error) {
        console.error("Error going offline:", error);
        showNotification("Error", "Failed to go offline");
    }
}

// Start tracking
export async function startTracking() {
    if (!navigator.geolocation) {
        showNotification(
            "Error",
            "Geolocation is not supported by your browser"
        );
        return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
        updateLocation,
        handleLocationError,
        {
            enableHighAccuracy: true,
        }
    );

    // Start watching position
    appState.watchId = navigator.geolocation.watchPosition(
        updateLocation,
        handleLocationError,
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        }
    );
}

// Stop tracking
export function stopTracking() {
    if (appState.watchId !== null) {
        navigator.geolocation.clearWatch(appState.watchId);
        appState.watchId = null;
    }
    document.getElementById("currentLocation").textContent = "Not tracking";
    document.getElementById("onlineStatus").textContent = "Offline";
    document
        .getElementById("onlineStatus")
        .classList.remove("bg-green-100", "text-green-800");
    document
        .getElementById("onlineStatus")
        .classList.add("bg-red-100", "text-red-800");
}

// Update driver status
export async function updateDriverStatus(driverId, status) {
    try {
        const response = await fetch(
            `${CONFIG.SERVER.API_BASE_URL}/driver/${driverId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
            }
        );

        if (!response.ok) {
            throw new Error("Failed to update driver status");
        }

        updateStatus(
            `Driver status updated to ${status}`,
            status === "online" ? "success" : "info"
        );
    } catch (error) {
        console.error("Error updating driver status:", error);
        showNotification("Error", "Failed to update driver status");
    }
}

// Update location
function updateLocation(position) {
    const { latitude, longitude, speed, heading } = position.coords;
    const locationString = `Lat: ${latitude.toFixed(
        6
    )}, Lng: ${longitude.toFixed(6)}`;
    document.getElementById(
        "currentLocation"
    ).textContent = `${locationString} | Speed: ${
        speed ? (speed * 3.6).toFixed(1) : "0"
    } km/h | Heading: ${heading ? heading.toFixed(1) : "0"}°`;

    // Update driver marker on map
    createDriverMarker([latitude, longitude]);

    // Update driver location in state
    appState.currentLocation = { latitude, longitude };

    // Emit location update
    socket.emit("driver:updateLocation", {
        driverId: document.getElementById("driverSelect").value,
        location: {
            type: "Point",
            coordinates: [longitude, latitude],
        },
        speed: speed || 0,
        heading: heading || 0,
    });
}

// Handle location error
function handleLocationError(error) {
    let errorMessage;
    switch (error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = "Location access denied";
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
        case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        default:
            errorMessage = "An unknown error occurred";
    }
    console.error("Geolocation error:", error);
    showNotification("Error", errorMessage);
    updateStatus(errorMessage, "error");
}
