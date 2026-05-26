// Toast notifications
const notification = document.getElementById('notification');
const notificationText = notification ? notification.querySelector('.notification-text') : null;

function showNotification(text) {
    if (notificationText && notification) {
        notificationText.textContent = text;
        notification.classList.remove('hidden');
    }
}

function hideNotification() {
    if (notification) {
        notification.classList.add('hidden');
    }
}

// Search Panel Controls
const searchToggleBtn = document.getElementById('search-toggle-btn');
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('city-search');
const searchError = document.getElementById('search-error');

if (searchToggleBtn && searchContainer && searchInput) {
    searchToggleBtn.addEventListener('click', () => {
        searchContainer.classList.toggle('hidden');
        if (!searchContainer.classList.contains('hidden')) {
            searchInput.focus();
        } else {
            if (searchError) searchError.classList.add('hidden');
        }
    });
}

// Dynamic Search via OpenStreetMap Nominatim API
async function handleSearch() {
    if (!searchInput) return;
    const query = searchInput.value.trim();
    if (!query) return;

    if (searchError) searchError.classList.add('hidden');
    showNotification(`Recherche de "${query}"...`);

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        if (!response.ok) throw new Error('Search network failed');
        
        const data = await response.json();
        if (data && data.length > 0) {
            const place = data[0];
            const lat = parseFloat(place.lat);
            const lon = parseFloat(place.lon);
            
            const displayNameParts = place.display_name.split(',');
            const cityName = displayNameParts[0];
            const countryName = displayNameParts[displayNameParts.length - 1].trim();
            
            showNotification(`Vol vers ${cityName}, ${countryName}...`);
            flyToCoordinates(lon, lat, currentMode === 'users' ? 8.5 : 12.5);
            searchInput.value = ''; 
            searchContainer.classList.add('hidden'); 
        } else {
            if (searchError) searchError.classList.remove('hidden');
            hideNotification();
        }
    } catch (error) {
        console.error('Error during Nominatim lookup:', error);
        if (searchError) {
            searchError.textContent = "Erreur de connexion";
            searchError.classList.remove('hidden');
        }
        hideNotification();
    }
}

if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
}

// Mode Toggle Button (Double Users vs Eye SVG)
const modeToggleBtn = document.getElementById('mode-toggle-btn');
const modeUsersContainer = document.getElementById('mode-users-container');
const modeEyeContainer = document.getElementById('mode-eye-container');

if (modeToggleBtn && modeUsersContainer && modeEyeContainer) {
    modeToggleBtn.addEventListener('click', () => {
        if (currentMode === 'users') {
            currentMode = 'eye';
            modeUsersContainer.classList.add('hidden');
            modeEyeContainer.classList.remove('hidden');
            
            showNotification('Mode Observateur : Vos produits scannés localement');
            
            // Set current zoom threshold before drawing
            lastZoomThreshold = map.getZoom() < 10 ? 'clustered' : 'individual';
            renderCurrentMarkers();
            
            // Smoothly fly to a center view showing both Paris and Marseille scan clusters
            flyToCoordinates(3.86, 46.08, 5.8);
        } else {
            currentMode = 'users';
            modeEyeContainer.classList.add('hidden');
            modeUsersContainer.classList.remove('hidden');
            
            showNotification('Mode Communauté : Utilisateurs et listes de scans');
            
            lastZoomThreshold = null;
            renderCurrentMarkers();
            
            // Smoothly fly out back to global globe view
            flyToCoordinates(2.3522, 48.8566, 2.5);
        }
    });
}

// Style Selectors (Dark/Light Switcher in bottom right)
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        const selectedTheme = targetBtn.getAttribute('data-theme');

        // Toggle UI active state
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');

        // Apply new style (this triggers style.load event)
        showNotification(`Style de carte : ${selectedTheme === 'dark' ? 'Sombre' : 'Clair'}`);
        map.setStyle(styleURLs[selectedTheme]);
    });
});

// Profile Visibility Toggle Button (Moi)
const profileVisibilityBtn = document.getElementById('profile-visibility-btn');
const profileSharedContainer = document.getElementById('profile-shared-container');
const profileHiddenContainer = document.getElementById('profile-hidden-container');

if (profileVisibilityBtn && profileSharedContainer && profileHiddenContainer) {
    profileVisibilityBtn.addEventListener('click', () => {
        showMyProfile = !showMyProfile;
        if (showMyProfile) {
            profileSharedContainer.classList.remove('hidden');
            profileHiddenContainer.classList.add('hidden');
            showNotification('Votre profil est désormais visible par les autres.');
        } else {
            profileSharedContainer.classList.add('hidden');
            profileHiddenContainer.classList.remove('hidden');
            showNotification('Votre profil est désormais masqué pour les autres.');
        }
        
        // Refresh markers on the map
        renderCurrentMarkers();
    });
}
