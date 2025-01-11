import { appState } from "./driver-app-state.js";
import { updateDriverStatus } from "./driver-tracking.js";
import { startTracking, stopTracking } from "./driver-tracking.js";

// Toggle app function
export async function toggleApp() {
    try {
        const toggleBtn = document.getElementById("toggleAppBtn");
        const offlineBtn = document.getElementById("offlineBtn");
        const onlineStatus = document.getElementById("onlineStatus");
        const driverId = document.getElementById("driverSelect").value;

        if (!appState.isAppEnabled) {
            // Enable app
            appState.isAppEnabled = true;
            appState.isOnline = true;

            // Update UI
            toggleBtn.textContent = "Disable App";
            toggleBtn.classList.remove("bg-blue-500");
            toggleBtn.classList.add("bg-red-500");
            offlineBtn.style.display = "inline-block";

            onlineStatus.textContent = "Online";
            onlineStatus.classList.remove("bg-red-100", "text-red-800");
            onlineStatus.classList.add("bg-green-100", "text-green-800");

            // Update driver status and start tracking
            await updateDriverStatus(driverId, "online");
            await startTracking();
            updateStatus("App is enabled and ready for requests", "success");
        } else {
            // Disable app
            appState.isAppEnabled = false;
            appState.isOnline = false;

            // Update UI
            toggleBtn.textContent = "Enable App";
            toggleBtn.classList.remove("bg-red-500");
            toggleBtn.classList.add("bg-blue-500");
            offlineBtn.style.display = "none";

            onlineStatus.textContent = "Offline";
            onlineStatus.classList.remove("bg-green-100", "text-green-800");
            onlineStatus.classList.add("bg-red-100", "text-red-800");

            // Update driver status and stop tracking
            await updateDriverStatus(driverId, "offline");
            stopTracking();
            updateStatus("App is disabled", "info");
        }
    } catch (error) {
        console.error("Error toggling app:", error);
        showNotification("Error", "Failed to toggle app state");
    }
}

// Go offline function
export async function goOffline() {
    try {
        const toggleBtn = document.getElementById("toggleAppBtn");
        const offlineBtn = document.getElementById("offlineBtn");
        const onlineStatus = document.getElementById("onlineStatus");
        const driverId = document.getElementById("driverSelect").value;

        // Check if we can go offline
        if (appState.currentRideRequest || appState.currentTrip) {
            showNotification(
                "Cannot Go Offline",
                "You cannot go offline while in an active trip or ride request"
            );
            return;
        }

        // Disable app
        appState.isAppEnabled = false;
        appState.isOnline = false;

        // Update UI
        toggleBtn.textContent = "Enable App";
        toggleBtn.classList.remove("bg-red-500");
        toggleBtn.classList.add("bg-blue-500");
        offlineBtn.style.display = "none";

        onlineStatus.textContent = "Offline";
        onlineStatus.classList.remove("bg-green-100", "text-green-800");
        onlineStatus.classList.add("bg-red-100", "text-red-800");

        // Update driver status and stop tracking
        await updateDriverStatus(driverId, "offline");
        stopTracking();
        updateStatus("App is disabled", "info");
    } catch (error) {
        console.error("Error going offline:", error);
        showNotification("Error", "Failed to go offline");
    }
}

// Update status message
export function updateStatus(message, type = "info") {
    const statusDiv = document.getElementById("status");
    if (!statusDiv) return;

    let bgColor, textColor, borderColor;
    switch (type) {
        case "success":
            bgColor = "bg-green-50";
            textColor = "text-green-800";
            borderColor = "border-green-500";
            break;
        case "error":
            bgColor = "bg-red-50";
            textColor = "text-red-800";
            borderColor = "border-red-500";
            break;
        case "warning":
            bgColor = "bg-yellow-50";
            textColor = "text-yellow-800";
            borderColor = "border-yellow-500";
            break;
        default:
            bgColor = "bg-blue-50";
            textColor = "text-blue-800";
            borderColor = "border-blue-500";
    }

    // Remove old classes
    statusDiv.className = "";
    // Add new classes
    statusDiv.className = `p-4 rounded-lg ${bgColor} ${textColor} border-l-4 ${borderColor}`;
    statusDiv.textContent = message;
}

// Update GPS status
function updateGPSStatus(status) {
    const gpsStatus = document.getElementById("gpsStatus");
    if (!gpsStatus) return;

    gpsStatus.className = "status-badge";

    switch (status) {
        case "active":
            gpsStatus.classList.add("bg-green-500");
            gpsStatus.innerHTML = '<span class="mr-2">📍</span>GPS Hoạt động';
            break;
        case "disabled":
            gpsStatus.classList.add("bg-red-500");
            gpsStatus.innerHTML =
                '<span class="mr-2">⚠️</span>GPS Không hoạt động';
            break;
        default:
            gpsStatus.classList.add("bg-blue-500");
            gpsStatus.innerHTML =
                '<span class="mr-2">🔄</span>Đang tìm vị trí...';
    }
}

// Show notification
export function showNotification(title, message) {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById(
        "notificationContainer"
    );
    if (!notificationContainer) {
        notificationContainer = document.createElement("div");
        notificationContainer.id = "notificationContainer";
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(notificationContainer);
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className =
        "notification bg-white rounded-lg shadow-lg p-4 mb-4 max-w-md";
    notification.style.animation = "slideIn 0.5s ease-out";

    notification.innerHTML = `
        <div class="flex items-start">
            <div class="ml-3 w-0 flex-1">
                <p class="text-sm font-medium text-gray-900">${title}</p>
                <p class="mt-1 text-sm text-gray-500">${message}</p>
            </div>
            <div class="ml-4 flex-shrink-0 flex">
                <button class="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none">
                    <span class="sr-only">Close</span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    `;

    // Add click handler to close button
    const closeButton = notification.querySelector("button");
    closeButton.onclick = () => {
        notification.style.animation = "slideOut 0.5s ease-out";
        setTimeout(() => notification.remove(), 500);
    };

    // Add notification to container
    notificationContainer.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = "slideOut 0.5s ease-out";
            setTimeout(() => notification.remove(), 500);
        }
    }, 5000);
}

// Add CSS for animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .notification {
        transition: all 0.5s ease-in-out;
    }
`;
document.head.appendChild(style);
