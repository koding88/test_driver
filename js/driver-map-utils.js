// Format coordinates for display
export function formatCoordinates(coords) {
    if (!coords) return "Unknown";
    return `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
}

// Convert speed from m/s to km/h
export function convertSpeed(speedMS) {
    return (speedMS * 3.6).toFixed(1);
}

// Format heading direction
export function formatHeading(heading) {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(((heading % 360) / 360) * 8);
    return directions[index % 8];
}

export async function calculateDistance(point1, point2) {
    try {
        // Format coordinates for OSRM API
        const from = `${point1[1]},${point1[0]}`; // lat,lng
        const to = `${point2[1]},${point2[0]}`; // lat,lng

        // Call OSRM Routing API
        const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=false`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch route from Leaflet API");
        }

        const data = await response.json();

        // Extract distance in meters from response
        const distance = data.routes[0].distance;

        return distance;
    } catch (error) {
        console.error("Error calculating distance:", error);
        throw error;
    }
}
