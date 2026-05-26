// Load the JSON mock data asynchronously
async function loadMockData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('HTTP request failed');
        const data = await response.json();
        mockUsers = data.mockUsers || [];
        localScannedProducts = data.localScannedProducts || [];
        console.log("Mock data loaded successfully from data.json");
    } catch (error) {
        console.warn("Could not load data.json (likely due to CORS or local file:// environment). Falling back to internal mock data.", error);
        mockUsers = fallbackData.mockUsers;
        localScannedProducts = fallbackData.localScannedProducts;
    }
    
    // Apply a tiny random jitter to contributors coordinates so they disperse naturally around the city center
    mockUsers.forEach(user => {
        if (user.id !== 'me') {
            user.coords = [
                user.coords[0] + (Math.random() - 0.5) * 0.018, // Lng jitter (~1.5km max dispersion)
                user.coords[1] + (Math.random() - 0.5) * 0.012  // Lat jitter (~1.3km max dispersion)
            ];
        }
    });

    // Set initial zoom threshold based on startup zoom (users mode is default)
    lastZoomThreshold = map.getZoom() < 4.5 ? 'clustered' : 'individual';
    renderCurrentMarkers();
}

// Load data and trigger loop
loadMockData();
requestAnimationFrame(rotateGlobe);
