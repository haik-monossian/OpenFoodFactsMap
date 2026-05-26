// Helper function to cluster items based on their screen-space pixel coordinates
function getScreenSpaceClusters(items, minPixelDistance = 50) {
    const clusters = [];
    
    items.forEach(item => {
        // Convert geographical coords [lng, lat] to screen point {x, y}
        const pixelPos = map.project(item.coords);
        
        let addedToCluster = false;
        for (const cluster of clusters) {
            const clusterPixelPos = map.project(cluster.centerCoords);
            const dx = pixelPos.x - clusterPixelPos.x;
            const dy = pixelPos.y - clusterPixelPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minPixelDistance) {
                cluster.items.push(item);
                // Update average coordinates
                cluster.centerCoords = [
                    (cluster.centerCoords[0] * (cluster.items.length - 1) + item.coords[0]) / cluster.items.length,
                    (cluster.centerCoords[1] * (cluster.items.length - 1) + item.coords[1]) / cluster.items.length
                ];
                addedToCluster = true;
                break;
            }
        }
        
        if (!addedToCluster) {
            clusters.push({
                centerCoords: [...item.coords],
                items: [item]
            });
        }
    });
    
    return clusters;
}

// Clear all active markers from the map
function clearMarkers() {
    activeMarkers.forEach(item => {
        if (item && item.marker) {
            item.marker.remove();
        } else if (item && item.remove) {
            item.remove();
        }
    });
    activeMarkers = [];
}

// Render markers based on the current active mode
function renderCurrentMarkers() {
    clearMarkers();
    if (mockUsers.length === 0 && localScannedProducts.length === 0) return;

    if (currentMode === 'users') {
        // Filter users to include/exclude "Me"
        const activeUsers = mockUsers.filter(user => showMyProfile || user.id !== 'me');
        
        // Group mock users based on screen space overlap
        const clusters = getScreenSpaceClusters(activeUsers, 50);

        // Render each user cluster
        clusters.forEach(cluster => {
            const count = cluster.items.length;
            if (count > 1) {
                const el = document.createElement('div');
                el.className = 'user-marker cluster-marker';
                el.style.backgroundImage = `url('${cluster.items[0].avatar}')`;
                
                // Orange count badge
                el.innerHTML = `<span class="marker-cluster-badge">${count}</span>`;
                
                // Info popup listing some contributors
                const namesList = cluster.items.map(u => u.id === 'me' ? 'Moi (Vous)' : u.name).slice(0, 3).join(', ');
                const extraText = count > 3 ? ` et ${count - 3} autres` : '';
                
                const popupHTML = `
                    <div class="user-popup">
                        <div class="user-popup-header">
                            <div class="user-popup-meta">
                                <h3 class="user-popup-name" style="color: var(--accent-color); font-size: 13px; font-weight: 700;">Groupe de contributeurs</h3>
                                <p class="user-popup-city" style="margin-top: 4px; font-size: 11px;"><i class="fa-solid fa-users"></i> ${count} membres dans cette zone</p>
                            </div>
                        </div>
                        <div class="user-popup-body">
                            <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 8px;">
                                Contributeurs : <strong>${namesList}${extraText}</strong>
                            </p>
                            <p style="font-size: 10px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
                                <i class="fa-solid fa-arrow-pointer"></i> Cliquer pour zoomer et dissocier.
                            </p>
                        </div>
                    </div>
                `;
                const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupHTML);
                
                const marker = new maplibregl.Marker({ element: el, opacityWhenCovered: 0 })
                    .setLngLat(cluster.centerCoords)
                    .setPopup(popup)
                    .addTo(map);
                    
                el.addEventListener('click', () => {
                    flyToCoordinates(cluster.centerCoords[0], cluster.centerCoords[1], map.getZoom() + 2.2);
                });
                
                activeMarkers.push({ id: 'cluster', marker: marker, type: 'user-cluster', coords: cluster.centerCoords });
            } else {
                // Render single user marker
                const user = cluster.items[0];
                const el = document.createElement('div');
                el.className = user.id === 'me' ? 'user-marker me' : 'user-marker';
                el.style.backgroundImage = `url('${user.avatar}')`;
                
                const isFollowing = followedUsers.has(user.id);
                const followText = isFollowing ? "Suivi ✓" : "Suivre";
                const followClass = isFollowing ? "follow-btn following" : "follow-btn";

                const popupHTML = `
                    <div class="user-popup">
                        <div class="user-popup-header">
                            <img class="user-popup-avatar" src="${user.avatar}" alt="${user.name}">
                            <div class="user-popup-meta">
                                <h3 class="user-popup-name">${user.name}</h3>
                                <p class="user-popup-city"><i class="fa-solid fa-location-dot"></i> ${user.city}</p>
                            </div>
                            ${user.id !== 'me' ? `<button class="${followClass}" data-id="${user.id}">${followText}</button>` : '<span style="font-size:10px; color:#85bb2f; font-weight:700; align-self:center; border:1px solid #85bb2f; padding:4px 8px; border-radius:6px; background:rgba(133,187,47,0.08);">Vous</span>'}
                        </div>
                        <div class="user-popup-body">
                            <p class="user-popup-bio">${user.description || "Aucune description disponible."}</p>
                            <h4>Produits scannés :</h4>
                            <ul class="user-popup-scans-list">
                                ${user.products && user.products.length > 0 
                                    ? user.products.map(p => `<li><i class="fa-solid fa-barcode"></i> ${p}</li>`).join('') 
                                    : "<li>Aucun produit scanné</li>"
                                }
                            </ul>
                        </div>
                    </div>
                `;
                const popup = new maplibregl.Popup({ offset: 15, closeButton: true }).setHTML(popupHTML);
                
                const marker = new maplibregl.Marker({ element: el, opacityWhenCovered: 0 })
                    .setLngLat(user.coords)
                    .setPopup(popup)
                    .addTo(map);
                    
                activeMarkers.push({ id: user.id, marker: marker, type: 'user' });
            }
        });
    } else {
        // Mode Scans / Observation: Implement Screen-Space Clustering
        const clusters = getScreenSpaceClusters(localScannedProducts, 50);

        clusters.forEach(cluster => {
            const count = cluster.items.length;
            if (count > 1) {
                const el = document.createElement('div');
                el.className = 'product-marker cluster-marker';
                
                if (cluster.items[0].image) {
                    el.style.backgroundImage = `url('${cluster.items[0].image}')`;
                }
                
                el.innerHTML = `<span class="marker-cluster-badge">${count}</span>`;
                
                const popupHTML = `
                    <div class="product-popup">
                        <h3 class="product-popup-name" style="color: var(--accent-color); font-size: 13px; font-weight: 700;">Groupe de scans</h3>
                        <p class="product-popup-brand" style="margin-top: 4px; font-size: 11px;">Vous avez <strong>${count} scans</strong> enregistrés ici.</p>
                        <p class="product-popup-date" style="margin-top: 8px; font-size: 10px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-arrow-pointer"></i> Cliquer pour zoomer et dissocier.</p>
                    </div>
                `;
                const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(popupHTML);
                
                const marker = new maplibregl.Marker({ element: el, opacityWhenCovered: 0 })
                    .setLngLat(cluster.centerCoords)
                    .setPopup(popup)
                    .addTo(map);
                    
                el.addEventListener('click', () => {
                    flyToCoordinates(cluster.centerCoords[0], cluster.centerCoords[1], map.getZoom() + 2.5);
                });
                
                activeMarkers.push({ id: 'cluster', marker: marker, type: 'product-cluster', coords: cluster.centerCoords });
            } else {
                // Render single product marker
                const product = cluster.items[0];
                const el = document.createElement('div');
                el.className = `product-marker nutri-${product.nutriscore.toLowerCase()}`;
                if (product.image) {
                    el.style.backgroundImage = `url('${product.image}')`;
                }
                el.innerHTML = `<span class="marker-nutri-badge nutri-${product.nutriscore.toLowerCase()}">${product.nutriscore}</span>`;
                
                const popupHTML = `
                    <div class="product-popup">
                        <div class="product-popup-header">
                            <span class="product-popup-badge nutri-${product.nutriscore.toLowerCase()}">${product.nutriscore}</span>
                            <div>
                                <h3 class="product-popup-name">${product.name}</h3>
                                <p class="product-popup-brand">${product.brand}</p>
                            </div>
                        </div>
                        <div class="product-popup-body">
                            ${product.image ? `<img class="product-popup-image" src="${product.image}" alt="${product.name}">` : ''}
                            <p class="product-popup-date"><i class="fa-solid fa-calendar-day"></i> Scanné le : ${product.date}</p>
                            <span class="product-local-tag"><i class="fa-solid fa-lock"></i> Données locales (privées)</span>
                        </div>
                    </div>
                `;
                const popup = new maplibregl.Popup({ offset: 12, closeButton: true }).setHTML(popupHTML);
                
                const marker = new maplibregl.Marker({ element: el, opacityWhenCovered: 0 })
                    .setLngLat(product.coords)
                    .setPopup(popup)
                    .addTo(map);
                    
                activeMarkers.push({ id: product.id, marker: marker, type: 'product' });
            }
        });
    }
}

// Global click event listener for follow buttons inside dynamically created popups
document.addEventListener('click', (e) => {
    const targetBtn = e.target.closest('.follow-btn');
    if (targetBtn) {
        const userId = parseInt(targetBtn.getAttribute('data-id'), 10);
        if (followedUsers.has(userId)) {
            followedUsers.delete(userId);
            targetBtn.textContent = "Suivre";
            targetBtn.classList.remove('following');
            if (typeof showNotification === 'function') {
                showNotification(`Vous ne suivez plus cet utilisateur.`);
            }
        } else {
            followedUsers.add(userId);
            targetBtn.textContent = "Suivi ✓";
            targetBtn.classList.add('following');
            if (typeof showNotification === 'function') {
                showNotification(`Vous suivez désormais cet utilisateur !`);
            }
        }
    }
});

// React on Zoom updates in both modes to toggle clustering
map.on('zoom', () => {
    renderCurrentMarkers();
});
