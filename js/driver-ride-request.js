import CONFIG from "./config.js";
import { socket } from "./driver-socket.js";
import { showNotification, updateStatus } from "./driver-ui.js";
import { map, passengerIcon } from "./driver-map.js";
import { appState } from "./driver-app-state.js";

let pendingRideRequest = null;

// Show ride request dialog
export async function showRideRequestDialog(request, distance) {
    try {
        console.log("Showing ride request dialog:", request);
        pendingRideRequest = request; // Store the request

        const content = `
            <div class="info-row mb-2 flex justify-between items-center">
                <span class="label font-medium">Distance to pickup:</span>
                <span class="value">${(distance / 1000).toFixed(1)} km</span>
            </div>
            <div class="info-row mb-2 flex justify-between items-center">
                <span class="label font-medium">Trip Price:</span>
                <span class="value">${request.price.toLocaleString()} VND</span>
            </div>
            <div class="info-row mb-2">
                <span class="label font-medium block mb-1">Pickup Location:</span>
                <span class="value block text-sm bg-gray-50 p-2 rounded">${request.pickup_location.coordinates[1].toFixed(
                    6
                )}, ${request.pickup_location.coordinates[0].toFixed(6)}</span>
            </div>
            <div class="info-row">
                <span class="label font-medium block mb-1">Dropoff Location:</span>
                <span class="value block text-sm bg-gray-50 p-2 rounded">${request.dropoff_location.coordinates[1].toFixed(
                    6
                )}, ${request.dropoff_location.coordinates[0].toFixed(6)}</span>
            </div>
        `;

        const rideRequestDialog = document.getElementById("rideRequestDialog");
        const overlay = document.getElementById("overlay");
        const rideRequestContent =
            document.getElementById("rideRequestContent");

        if (rideRequestContent) {
            rideRequestContent.innerHTML = content;
        }

        if (overlay) {
            overlay.style.display = "block";
            overlay.onclick = closeRideRequestDialog;
        }

        if (rideRequestDialog) {
            rideRequestDialog.style.display = "block";
            rideRequestDialog.onclick = (e) => e.stopPropagation();
        }

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                closeRideRequestDialog();
            }
        });
    } catch (error) {
        console.error("Error showing ride request dialog:", error);
        showNotification("Error", "Failed to show ride request");
    }
}

// Close ride request dialog
export function closeRideRequestDialog() {
    console.log("Closing ride request dialog");
    const rideRequestDialog = document.getElementById("rideRequestDialog");
    const overlay = document.getElementById("overlay");

    if (overlay) {
        overlay.style.display = "none";
        overlay.onclick = null;
    }

    if (rideRequestDialog) {
        rideRequestDialog.style.display = "none";
    }

    document.removeEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeRideRequestDialog();
        }
    });
}

// Handle ride accept
export function handleRideAccept() {
    console.log("Handling ride accept. Pending request:", pendingRideRequest);
    if (pendingRideRequest) {
        acceptRide(pendingRideRequest.ride_request_id);
        closeRideRequestDialog();
    } else {
        console.error("No pending ride request to accept");
        showNotification("Error", "No pending ride request to accept");
    }
}

// Handle ride reject
export function handleRideReject() {
    console.log("Handling ride reject");
    pendingRideRequest = null;
    closeRideRequestDialog();
}

// Accept ride
export async function acceptRide(rideRequestId) {
    try {
        console.log("Accepting ride request:", rideRequestId);

        if (!appState.driverID) {
            throw new Error("Driver ID not available");
        }

        if (!appState.currentLocation) {
            throw new Error("Driver location not available");
        }

        const response = await fetch(
            `${CONFIG.SERVER.API_BASE_URL}/booking/${rideRequestId}/accept`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    driver_id: appState.driverID,
                }),
            }
        );

        if (!response.ok) {
            const data = await response.json();
            if (data.message.includes("timed out")) {
                showNotification(
                    "Request Expired",
                    "This ride request has timed out and is no longer available"
                );
                pendingRideRequest = null;
                closeRideRequestDialog();
                return;
            }
            throw new Error(data.message || "Failed to accept ride");
        }

        const data = await response.json();
        console.log("Ride accept response:", data);
        appState.currentRideRequest = data.payload;

        // Show arrival button and hide other trip control buttons
        document.getElementById("arrivalBtn").style.display = "inline-block";
        document.getElementById("startTripBtn").style.display = "none";
        document.getElementById("endTripBtn").style.display = "none";

        // Add passenger marker and create route
        const pickupLocation =
            appState.currentRideRequest.pickup_location.coordinates;
        updatePassengerLocation([pickupLocation[1], pickupLocation[0]]);

        // Remove existing route if any
        if (appState.currentRoute) {
            map.removeControl(appState.currentRoute);
        }

        // Create route using correct coordinate format
        console.log("Creating route with coordinates:", {
            driverLocation: {
                latitude: appState.currentLocation.latitude,
                longitude: appState.currentLocation.longitude,
            },
            pickupLocation: {
                latitude: pickupLocation[1],
                longitude: pickupLocation[0],
            },
        });

        appState.currentRoute = L.Routing.control({
            waypoints: [
                L.latLng(
                    appState.currentLocation.latitude,
                    appState.currentLocation.longitude
                ),
                L.latLng(pickupLocation[1], pickupLocation[0]),
            ],
            router: L.Routing.osrmv1({
                serviceUrl: CONFIG.MAP.ROUTING_SERVICE_URL,
                profile: "driving",
            }),
            lineOptions: {
                styles: [{ color: "#4CAF50", opacity: 0.8, weight: 6 }],
            },
            show: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
        }).addTo(map);

        appState.currentRoute.on("routesfound", function (e) {
            console.log("Route found:", e);
            // Update map bounds to show the entire route
            const bounds = L.latLngBounds(
                e.routes[0].waypoints.map((wp) => wp.latLng)
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        });

        updateStatus("Heading to pickup location", "info");
    } catch (error) {
        console.error("Error accepting ride:", error);
        showNotification(
            "Error",
            error.message || "Failed to accept ride request"
        );
        updateStatus("Failed to accept ride: " + error.message, "error");
    }
}

// Update passenger location
export function updatePassengerLocation(coords) {
    if (appState.passengerMarker) {
        map.removeLayer(appState.passengerMarker);
    }
    appState.passengerMarker = L.marker(coords, {
        icon: passengerIcon,
    }).addTo(map);
}
