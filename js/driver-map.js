import CONFIG from "./config.js";
import { MAP_CONFIG, appState } from "./driver-app-state.js";

// Map instance
export let map;

// Custom driver icon
const driverIcon = L.divIcon({
    className: "custom-div-icon",
    html: `
        <div class="marker-pulse" style="background-color: #4CAF50"></div>
        <div class="marker-core" style="background-color: #4CAF50"></div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

// Passenger marker icon
export const passengerIcon = L.divIcon({
    className: "passenger-icon",
    html: "👤",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

// Driver markers map
const drivers = new Map();
const driverColors = {};

// Initialize map
export function initMap() {
    map = L.map("map").setView([21.0285, 105.8542], MAP_CONFIG.initialZoom);
    L.tileLayer(MAP_CONFIG.tileLayerUrl).addTo(map);

    // Add zoom level display
    map.on("zoomend", function () {
        document.getElementById(
            "zoomLevel"
        ).textContent = `Zoom: ${map.getZoom()}`;
    });
}

// Create custom icon for map markers
export function createCustomIcon(emoji, className) {
    return L.divIcon({
        html: `
            <div class="marker-pulse ${className}"></div>
            <div class="marker-core ${className}">${emoji}</div>
        `,
        className: "custom-marker-container",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
    });
}

// Create driver marker
export function createDriverMarker(coords) {
    if (!coords || coords.length !== 2) {
        console.error("Invalid coordinates for driver marker:", coords);
        return;
    }

    const [latitude, longitude] = coords;

    // Remove existing marker if any
    if (appState.driverMarker) {
        map.removeLayer(appState.driverMarker);
    }

    // Create new marker
    appState.driverMarker = L.marker([latitude, longitude], {
        icon: createCustomIcon("🚗", "driver-marker"),
        title: "Your Location",
    }).addTo(map);

    // Add popup with driver info
    appState.driverMarker.bindPopup("Your current location");

    // Center map on driver location
    map.setView([latitude, longitude], map.getZoom());
}

// Update driver marker
export function updateDriverMarker(driverId, location) {
    let driverData = drivers.get(driverId);

    if (!driverData) {
        // Generate random color for new driver
        driverColors[driverId] = getRandomColor();
        driverData = {
            marker: null,
            active: true,
            lastUpdate: new Date(),
            speed: location.speed || 0,
            heading: location.heading || 0,
        };
        drivers.set(driverId, driverData);
    }

    const popupContent = `
        <div class="popup-content">
            <h4>Driver Information</h4>
            <p><strong>ID:</strong> ${driverId.slice(0, 8)}...</p>
            <p><strong>Status:</strong> <span class="status">Active</span></p>
            <p><strong>Location:</strong><br>
            Lat: ${location.latitude.toFixed(6)}<br>
            Long: ${location.longitude.toFixed(6)}</p>
            <p><strong>Last Update:</strong><br>${new Date().toLocaleTimeString()}</p>
        </div>
    `;

    if (driverData.marker) {
        driverData.marker.setLatLng([location.latitude, location.longitude]);
        driverData.marker.setPopupContent(popupContent);
    } else {
        const driverIcon = L.divIcon({
            className: "custom-div-icon",
            html: `
                <div class="marker-pulse" style="background-color: ${driverColors[driverId]}"></div>
                <div class="marker-core" style="background-color: ${driverColors[driverId]}"></div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
        });

        driverData.marker = L.marker([location.latitude, location.longitude], {
            icon: driverIcon,
        }).addTo(map);

        driverData.marker
            .bindPopup(popupContent, {
                maxWidth: 300,
                className: "custom-popup",
            })
            .openPopup();
    }

    driverData.active = true;
    driverData.lastUpdate = new Date();
}

// Update route on map
export function updateRoute(start, end) {
    // Remove existing route if any
    if (appState.routeControl) {
        map.removeControl(appState.routeControl);
    }

    // Create new route
    appState.routeControl = L.Routing.control({
        waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
        router: L.Routing.osrmv1({
            serviceUrl: CONFIG.MAP.ROUTING_SERVICE_URL,
            profile: "driving",
        }),
        lineOptions: {
            styles: [{ color: "#0066CC", opacity: 0.7, weight: 6 }],
        },
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        showAlternatives: false,
    }).addTo(map);

    // Hide the routing instructions
    appState.routeControl.hide();

    // Fit map to show both points
    const bounds = L.latLngBounds([start, end]);
    map.fitBounds(bounds, { padding: [50, 50] });
}

// Clear route from map
export function clearRoute() {
    if (appState.routeControl) {
        map.removeControl(appState.routeControl);
        appState.routeControl = null;
    }
}

// Update map bounds to show all relevant markers
export function updateMapBounds() {
    const bounds = L.latLngBounds([]);

    // Add driver marker to bounds
    if (appState.driverMarker) {
        bounds.extend(appState.driverMarker.getLatLng());
    }

    // Add pickup/dropoff locations if in a trip
    if (appState.currentTrip) {
        if (appState.currentTrip.pickup_location) {
            const [lng, lat] = appState.currentTrip.pickup_location.coordinates;
            bounds.extend([lat, lng]);
        }
        if (appState.currentTrip.dropoff_location) {
            const [lng, lat] =
                appState.currentTrip.dropoff_location.coordinates;
            bounds.extend([lat, lng]);
        }
    }

    // Only fit bounds if we have points
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Generate random color for drivers
function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Get driver name by ID
export function getDriverNameById(driverId) {
    if (driverId === "6778b7848652dafe31a9788f") {
        return "Dương Ngọc Anh";
    }
    return "Unknown Driver";
}
