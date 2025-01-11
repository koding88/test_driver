import CONFIG from "./config.js";
import { socket } from "./driver-socket.js";
import { showNotification, updateStatus } from "./driver-ui.js";
import { map } from "./driver-map.js";
import { updateDriverStatus, startTracking } from "./driver-tracking.js";
import { updatePassengerLocation } from "./driver-ride-request.js";
import { appState } from "./driver-app-state.js";

let currentTrip = null;
let tripStarted = false;
let routeCoordinates = [];
let currentRouteIndex = 0;
let movementInterval = null;
let pollingInterval = null;
let currentRoute = null;

// Start trip
export async function startTrip() {
    try {
        console.log("Starting trip:", appState.currentRideRequest._id);
        const response = await fetch(
            `${CONFIG.SERVER.API_BASE_URL}/trip/${appState.currentRideRequest._id}/start`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) throw new Error("Failed to start trip");

        const data = await response.json();
        console.log("Trip started response:", data);
        tripStarted = true;

        // Emit trip started event to passenger
        socket.emit("trip_started", {
            trip_id: appState.currentRideRequest._id,
            passenger_id: 1, // Hardcoded for testing
            pickup_location: appState.currentRideRequest.pickup_location,
            dropoff_location: appState.currentRideRequest.dropoff_location,
        });

        // Hide start trip button and show end trip button
        document.getElementById("startTripBtn").style.display = "none";
        document.getElementById("endTripBtn").style.display = "inline-block";

        // Remove existing route
        if (currentRoute) {
            map.removeControl(currentRoute);
        }

        // Get pickup and dropoff coordinates in correct format
        const pickupCoords =
            appState.currentRideRequest.pickup_location.coordinates;
        const dropoffCoords =
            appState.currentRideRequest.dropoff_location.coordinates;

        // Create route to destination
        currentRoute = L.Routing.control({
            waypoints: [
                L.latLng(pickupCoords[1], pickupCoords[0]),
                L.latLng(dropoffCoords[1], dropoffCoords[0]),
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

        currentRoute.on("routesfound", function (e) {
            console.log("Route found:", e);
            // Update map bounds to show the entire route
            const bounds = L.latLngBounds(
                e.routes[0].waypoints.map((wp) => wp.latLng)
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        });

        updateStatus("Trip started - Heading to destination", "info");
    } catch (error) {
        console.error("Error starting trip:", error);
        updateStatus("Failed to start trip: " + error.message, "error");
    }
}

// End trip
export async function endTrip() {
    try {
        console.log("Ending trip:", appState.currentRideRequest._id);
        const response = await fetch(
            `${CONFIG.SERVER.API_BASE_URL}/trip/${appState.currentRideRequest._id}/end`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) throw new Error("Failed to end trip");

        const data = await response.json();
        console.log("Trip ended response:", data);

        // Emit trip completed event to passenger
        socket.emit("trip_completed", {
            trip_id: appState.currentRideRequest._id,
            passenger_id: 1, // Hardcoded for testing
            dropoff_time: new Date(),
            pickup_location: appState.currentRideRequest.pickup_location,
            dropoff_location: appState.currentRideRequest.dropoff_location,
        });

        showNotification(
            "Trip Completed",
            "You have reached the destination. Trip completed successfully."
        );

        // Reset all states
        appState.currentRideRequest = null;
        currentTrip = null;
        tripStarted = false;
        routeCoordinates = [];
        currentRouteIndex = 0;

        // Clear all intervals
        if (movementInterval) {
            clearInterval(movementInterval);
            movementInterval = null;
        }
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }

        // Remove route from map
        if (appState.currentRoute) {
            map.removeControl(appState.currentRoute);
            appState.currentRoute = null;
        }

        // Remove passenger marker
        if (appState.passengerMarker) {
            map.removeLayer(appState.passengerMarker);
            appState.passengerMarker = null;
        }

        // Reset UI buttons
        document.getElementById("arrivalBtn").style.display = "none";
        document.getElementById("startTripBtn").style.display = "none";
        document.getElementById("endTripBtn").style.display = "none";

        // Reset driver status to online and ready
        const driverId = document.getElementById("driverSelect").value;
        await updateDriverStatus(driverId, "online");
        updateStatus("Driver is online and ready for requests", "success");

        // Restart tracking
        await startTracking();
    } catch (error) {
        console.error("Error ending trip:", error);
        updateStatus("Failed to end trip: " + error.message, "error");
    }
}

// Notify arrival
export async function notifyArrival() {
    try {
        console.log("Driver notifying arrival at pickup location");

        // Get the ride request to get passenger information
        const rideRequestResponse = await fetch(
            `${CONFIG.SERVER.API_BASE_URL}/trip/${appState.currentRideRequest._id}`
        ).then((res) => res.json());

        if (!rideRequestResponse.payload) {
            throw new Error("Could not find ride request");
        }

        console.log("Current ride request:", rideRequestResponse.payload);

        // Emit to specific passenger's room
        socket.emit("driver_arrived", {
            ride_request_id: appState.currentRideRequest.ride_request_id,
            passenger_id: 1,
            location: {
                type: "Point",
                coordinates: [
                    appState.currentRideRequest.pickup_location.coordinates[0],
                    appState.currentRideRequest.pickup_location.coordinates[1],
                ],
            },
        });

        showNotification(
            "Arrival Notified",
            "You have notified the passenger of your arrival."
        );

        // Show start trip button and hide arrival button
        document.getElementById("arrivalBtn").style.display = "none";
        document.getElementById("startTripBtn").style.display = "inline-block";
    } catch (error) {
        console.error("Error notifying arrival:", error);
        showNotification(
            "Error",
            "Failed to notify arrival. Please try again."
        );
    }
}

// Check driver's active trip
export async function checkDriverActiveTrip(driverId) {
    try {
        // First get driver's active trip
        const activeResponse = await fetch(
            `${CONFIG.SERVER.API_BASE_URL}/trip/driver/active-trip/${driverId}`
        );
        const activeData = await activeResponse.json();

        if (activeData.payload) {
            const trip = activeData.payload;
            appState.currentRideRequest = trip;

            // Get trip details
            const tripResponse = await fetch(
                `${CONFIG.SERVER.API_BASE_URL}/trip/${trip._id}`
            );
            const tripData = await tripResponse.json();

            if (!tripData.payload) {
                throw new Error("Could not find trip details");
            }

            const tripDetails = tripData.payload;

            // Restore UI state based on trip status
            if (tripDetails.status === "assigned") {
                // Show arrival button
                document.getElementById("arrivalBtn").style.display =
                    "inline-block";
                document.getElementById("startTripBtn").style.display = "none";
                document.getElementById("endTripBtn").style.display = "none";

                // Create route to pickup location
                const pickupCoords = tripDetails.pickup_location.coordinates;

                if (appState.currentLocation) {
                    currentRoute = L.Routing.control({
                        waypoints: [
                            L.latLng(
                                appState.currentLocation.latitude,
                                appState.currentLocation.longitude
                            ),
                            L.latLng(pickupCoords[1], pickupCoords[0]),
                        ],
                        router: L.Routing.osrmv1({
                            serviceUrl: CONFIG.MAP.ROUTING_SERVICE_URL,
                            profile: "driving",
                        }),
                        lineOptions: {
                            styles: [
                                { color: "#4CAF50", opacity: 0.8, weight: 6 },
                            ],
                        },
                        show: false,
                        addWaypoints: false,
                        draggableWaypoints: false,
                        fitSelectedRoutes: true,
                    }).addTo(map);

                    // Add passenger marker
                    updatePassengerLocation([pickupCoords[1], pickupCoords[0]]);
                }
            } else if (tripDetails.status === "in_progress") {
                // Show end trip button
                document.getElementById("arrivalBtn").style.display = "none";
                document.getElementById("startTripBtn").style.display = "none";
                document.getElementById("endTripBtn").style.display =
                    "inline-block";

                tripStarted = true;

                // Create route to dropoff location
                const dropoffCoords = tripDetails.dropoff_location.coordinates;

                if (appState.currentLocation) {
                    currentRoute = L.Routing.control({
                        waypoints: [
                            L.latLng(
                                appState.currentLocation.latitude,
                                appState.currentLocation.longitude
                            ),
                            L.latLng(dropoffCoords[1], dropoffCoords[0]),
                        ],
                        router: L.Routing.osrmv1({
                            serviceUrl: CONFIG.MAP.ROUTING_SERVICE_URL,
                            profile: "driving",
                        }),
                        lineOptions: {
                            styles: [
                                { color: "#4CAF50", opacity: 0.8, weight: 6 },
                            ],
                        },
                        show: false,
                        addWaypoints: false,
                        draggableWaypoints: false,
                        fitSelectedRoutes: true,
                    }).addTo(map);

                    // Add passenger marker
                    updatePassengerLocation([
                        dropoffCoords[1],
                        dropoffCoords[0],
                    ]);
                }
            }
        }
    } catch (error) {
        console.error("Error checking driver's active trip:", error);
    }
}
