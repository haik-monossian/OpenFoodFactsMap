// Initialize MapLibre Map
const map = new maplibregl.Map({
    container: 'map',
    style: styleURLs.dark,
    center: [2.3522, 48.8566], // Center on Paris initially
    zoom: 2.5,
    pitch: 0,
    bearing: 0,
    projection: { type: 'globe' }, // Native 3D Globe projection
    attributionControl: false
});

// Telemetry widgets
const statLat = document.getElementById('stat-lat');
const statLng = document.getElementById('stat-lng');
const statZoom = document.getElementById('stat-zoom');
const statPitch = document.getElementById('stat-pitch');

function updateTelemetry() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const pitch = map.getPitch();

    // Standardize longitude representation to [-180, 180]
    let lng = center.lng;
    while (lng < -180) lng += 360;
    while (lng > 180) lng -= 360;

    if (statLat) statLat.textContent = `${center.lat.toFixed(5)}°`;
    if (statLng) statLng.textContent = `${lng.toFixed(5)}°`;
    if (statZoom) statZoom.textContent = zoom.toFixed(1);
    if (statPitch) statPitch.textContent = `${Math.round(pitch)}°`;
}

// Update telemetry on map movement
map.on('move', updateTelemetry);
updateTelemetry(); // Initial update

// Apply dynamic 3D globe
function applyCurrentProjection() {
    map.setProjection({
        type: 'globe'
    });
}

// Apply atmospheric glow/fog effects
function applyCurrentAtmosphere() {
    try {
        // Apply a premium deep-space dark atmosphere glow
        map.setSky({
            'sky-color': '#0d1326',
            'sky-horizon-blend': 0.6,
            'horizon-color': '#111827',
            'horizon-fog-blend': 0.8,
            'fog-color': '#030712',
            'fog-ground-blend': 0.9,
            'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1.0, 4, 0.8, 7, 0.0]
        });
    } catch (error) {
        console.warn('Atmospheric rendering settings not fully supported on this style:', error);
    }
}

// Once style is loaded, set up projection, atmosphere and draw markers
map.on('style.load', () => {
    applyCurrentProjection();
    applyCurrentAtmosphere();
    
    // Rerender markers for active mode (needed on style change)
    if (typeof renderCurrentMarkers === 'function' && (mockUsers.length > 0 || localScannedProducts.length > 0)) {
        renderCurrentMarkers();
    }
});

// Fly to coordinates smoothly
function flyToCoordinates(lng, lat, zoom = 8.5) {
    isFlying = true;
    userInteracting = true; // Temporary disable rotation

    map.flyTo({
        center: [lng, lat],
        zoom: zoom,
        essential: true,
        speed: 1.0,
        curve: 1.4,
        pitch: currentMode === 'users' ? 0 : 30 // Inclinate a bit in local product view
    });
}

// Detect when flyTo ends to re-enable auto-spin
map.on('moveend', () => {
    if (isFlying) {
        isFlying = false;
        setTimeout(() => {
            if (!isFlying) userInteracting = false;
        }, 1200); // Small buffer to settle down smoothly
    }
    if (typeof hideNotification === 'function') {
        hideNotification();
    }
});

// User Interaction Detection to pause/resume auto-rotation
const setInteracting = () => { userInteracting = true; };
const unsetInteracting = () => { 
    if (!isFlying) {
        userInteracting = false; 
    }
};

map.on('mousedown', setInteracting);
map.on('mouseup', unsetInteracting);
map.on('dragstart', setInteracting);
map.on('dragend', unsetInteracting);
map.on('zoomstart', setInteracting);
map.on('zoomend', unsetInteracting);
map.on('touchstart', setInteracting);
map.on('touchend', unsetInteracting);

// Smooth Auto-Rotation Animation Loop
let lastTimestamp = 0;

function rotateGlobe(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (spinEnabled && !userInteracting && !isFlying) {
        const zoom = map.getZoom();
        // Only spin at lower zoom levels (space view)
        if (zoom < 5) {
            const center = map.getCenter();
            // Slow down spin speed as zoom level increases
            const zoomFactor = (5 - zoom) / 5;
            center.lng -= (rotationSpeed * zoomFactor * delta) / 1000;
            
            // Normalize longitude
            if (center.lng < -180) center.lng += 360;

            map.easeTo({
                center: center,
                duration: 0,
                easing: n => n
            });
        }
    }

    requestAnimationFrame(rotateGlobe);
}
