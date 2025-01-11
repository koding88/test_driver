import CONFIG from "./config.js";
import { updateDriverMarker } from "./driver-map.js";
import {
    showRideRequestDialog,
    closeRideRequestDialog,
    updatePassengerLocation,
} from "./driver-ride-request.js";
import { showNotification, updateStatus } from "./driver-ui.js";
import {
    updateDriverStatus,
    startTracking,
    isAppEnabled,
} from "./driver-tracking.js";
import { appState } from "./driver-app-state.js";
import { calculateDistance } from "./driver-map-utils.js";

const driverID = "6778b7848652dafe31a9788f";

// Socket connection
export const socket = io(CONFIG.SERVER.SOCKET_URL, {
    transports: ["websocket"],
    query: {
        userId: driverID,
        type: "driver",
    },
});

let pendingRideRequest = null;
export let currentRideRequest = null;

// Socket connection event handlers
socket.on("connect", async () => {
    updateStatus("Connected to server", "success");

    // Only update status if app is enabled
    if (isAppEnabled) {
        document
            .getElementById("onlineStatus")
            .classList.remove("bg-red-100", "text-red-800");
        document
            .getElementById("onlineStatus")
            .classList.add("bg-green-100", "text-green-800");
        document.getElementById("onlineStatus").textContent = "Online";

        const driverId = document.getElementById("driverSelect").value;
        await updateDriverStatus(driverId, "online");
        await startTracking();
    }
});

socket.on("disconnect", () => {
    updateStatus(
        "Disconnected from server. Attempting to reconnect...",
        "error"
    );
    document
        .getElementById("onlineStatus")
        .classList.remove("bg-green-100", "text-green-800");
    document
        .getElementById("onlineStatus")
        .classList.add("bg-red-100", "text-red-800");
    document.getElementById("onlineStatus").textContent = "Offline";
});

// New ride request event handler
socket.on("new_ride_request", async (data) => {
    console.log("Received new ride request:", data);
    const driverId = document.getElementById("driverSelect").value;

    if (!currentRideRequest && driverId) {
        if (!appState.currentLocation) {
            console.error("Driver location not available");
            return;
        }

        const distance = await calculateDistance(
            [
                data.pickup_location.coordinates[1],
                data.pickup_location.coordinates[0],
            ],
            [
                appState.currentLocation.latitude,
                appState.currentLocation.longitude,
            ]
        );

        console.log(`Distance to pickup: ${distance}m`);
        // Accept all ride requests regardless of distance
        pendingRideRequest = data;
        showRideRequestDialog(data, distance);
    } else {
        console.log("Already has active request or no driver selected");
    }
});

// Ride taken event handler
socket.on("ride_taken", (data) => {
    console.log("Ride taken by another driver:", data);

    if (
        pendingRideRequest &&
        pendingRideRequest.ride_request_id === data.ride_request_id
    ) {
        closeRideRequestDialog();
        showNotification(
            "Ride Unavailable",
            "This ride has been accepted by another driver"
        );
        pendingRideRequest = null;
    }
});

// Passenger location update handler
socket.on("passenger:passengerLocation", (data) => {
    console.log("Received passenger location update:", data);
    if (currentRideRequest && data.tripId === currentRideRequest._id) {
        const { coordinates } = data.location;
        console.log("Updating passenger location:", coordinates);
        updatePassengerLocation([coordinates[1], coordinates[0]]);
    }
});

// Driver location update handler
socket.on("driver:driverLocation", (data) => {
    console.log("Received location update:", data);
    if (data.driverId !== document.getElementById("driverSelect").value) {
        // Convert GeoJSON Point to {latitude, longitude} format
        const locationForMarker = {
            latitude: data.location.coordinates[1],
            longitude: data.location.coordinates[0],
            speed: 0,
            heading: 0,
        };
        updateDriverMarker(data.driverId, locationForMarker);
    }
});
