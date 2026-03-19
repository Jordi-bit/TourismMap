document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentTown = null;
    let towns = [];
    let map = null;
    let markers = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true
    });
    let favorites = [];
    let currentTab = 'images';
    let is3D = false;
    let isGeo = false;
    let isRoadsVisible = false;
    let isRiversVisible = false;
    let isMarkersVisible = false;
    let map3d = null;
    const months = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    let map3dMarkers = [];
    let roadsLayer2D = null;
    let riversLayer2D = null;
    let geoLayer2D = null;

    function updateMapLayers() {
        if (!map3d) return;
        const buildingLayers = ['3d-buildings'];
        const roadLayers = ['road-casing-major', 'road-casing-minor', 'road-motorway', 'road-major', 'road-names', 'place-labels'];
        const riverLayers = ['water', 'waterway'];
        
        buildingLayers.forEach(l => {
            if (map3d.getLayer(l)) {
                map3d.setLayoutProperty(l, 'visibility', 'none');
            }
        });

        roadLayers.forEach(l => {
            if (map3d.getLayer(l)) {
                map3d.setLayoutProperty(l, 'visibility', isRoadsVisible ? 'visible' : 'none');
            }
        });

        riverLayers.forEach(l => {
            if (map3d.getLayer(l)) {
                map3d.setPaintProperty(l, 'visibility', isRiversVisible ? 'visible' : 'none');
            }
        });
    }

    // UI Elements
    const sidebar = document.getElementById('info-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const townNameElem = document.getElementById('town-name');
    const townProvinceElem = document.getElementById('town-province');
    const townDescElem = document.getElementById('town-description');
    const favBtn = document.getElementById('fav-btn');
    const galleryGrid = document.getElementById('gallery-grid');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const searchInput = document.getElementById('town-search');
    const searchResults = document.getElementById('search-results');
    const imageUpload = document.getElementById('upload-image');
    const videoUpload = document.getElementById('upload-video');
    const imageModal = document.getElementById('image-modal');
    const videoModal = document.getElementById('video-modal');
    const addTownBtn = document.getElementById('add-town-btn');
    const editTownBtn = document.getElementById('edit-town-btn');
    const addTownSidebar = document.getElementById('add-town-sidebar');
    const closeFormBtn = document.getElementById('close-form-btn');
    const addTownForm = document.getElementById('add-town-form');
    const formTitle = document.querySelector('.form-sidebar h2');
    const toggle3dBtn = document.getElementById('toggle-3d');
    const toggleGeoBtn = document.getElementById('toggle-geo');
    const toggleRoadsBtn = document.getElementById('toggle-roads');
    const toggleRiversBtn = document.getElementById('toggle-rivers');
    const toggleMarkersBtn = document.getElementById('toggle-markers');
    const mapContainer2d = document.getElementById('map');
    const mapContainer3d = document.getElementById('map3d');
    
    let isPickingMode = false;
    let editMode = false;
    let townToEdit = null;
    let tempMarker = null;
    let galleryItems = [];

    // Media Map State
    let isMediaPickingMode = false;
    let mediaToEdit = null;
    let mediaMarkers2d = [];
    let mediaMarkers3d = [];

    // --- INITIALIZATION ---

    function setupDateSelectors() {
        const yearSelect = document.getElementById('upload-year');
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // Populate years 2000 to current
        for (let y = currentYear; y >= 2000; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.innerText = y;
            yearSelect.appendChild(opt);
        }

        document.getElementById('upload-month').value = currentMonth;
        yearSelect.value = currentYear;
    }

    function initMap() {
        // Center initial: 41.8, 1.5, Zoom: 8
        map = L.map('map').setView([41.8, 1.5], 8);

        // ESRI World Imagery (Satellite)
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }).addTo(map);

        // ESRI Labels Overlay
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Labels &copy; Esri',
            pane: 'markerPane', // Ensure labels are above the map but potentially under markers
            zIndex: 10
        }).addTo(map);

        // ESRI World Transportation (Roads)
        roadsLayer2D = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            pane: 'overlayPane'
        });
        
        if (isRoadsVisible) {
            roadsLayer2D.addTo(map);
        }

        // Geopolitical layer for 2D (lightweight alternative)
        fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
            .then(response => response.json())
            .then(geojson => {
                geoLayer2D = L.geoJSON(geojson, {
                    style: (feature) => ({
                        fillColor: getCountryColor(feature.properties.mapcolor7),
                        fillOpacity: 0.5,
                        color: '#ffffff',
                        weight: 1,
                        opacity: 0.8
                    }),
                    onEachFeature: (feature, layer) => {
                        if (feature.properties.name) {
                            layer.bindTooltip(feature.properties.name, {
                                permanent: false,
                                direction: 'center',
                                className: 'geo-tooltip'
                            });
                        }
                    }
                });
                if (isGeo) geoLayer2D.addTo(map);
            })
            .catch(err => console.log('Could not load geopolitical layer:', err));

        function getCountryColor(num) {
            const colors = ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69'];
            return colors[(num || 1) - 1] || '#d9d9d9';
        }

        // Wait. Wait... Actually, MapLibre GL Leaflet uses L.maplibreGL
        riversLayer2D = L.maplibreGL({
            style: {
                version: 8,
                sources: {
                    'openmaptiles': {
                        type: 'vector',
                        url: 'https://tiles.openfreemap.org/planet'
                    }
                },
                layers: [
                    {
                        'id': 'water',
                        'type': 'fill',
                        'source': 'openmaptiles',
                        'source-layer': 'water',
                        'paint': {
                            'fill-color': '#35659d',
                            'fill-opacity': 0.6
                        }
                    },
                    {
                        'id': 'waterway',
                        'type': 'line',
                        'source': 'openmaptiles',
                        'source-layer': 'waterway',
                        'paint': {
                            'line-color': '#35659d',
                            'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 8, 1, 20, 8],
                            'line-opacity': 0.8
                        }
                    }
                ]
            },
            pane: 'overlayPane',
            interactive: false
        });

        if (isRiversVisible) {
            riversLayer2D.addTo(map);
        }

        map.addLayer(markers);
        loadTowns();
        loadFavorites();

        // Initial 3D map setup (inactive)
        initMap3d();

        // Map Click for Picking Mode
        map.on('click', (e) => {
            if (isPickingMode) {
                const { lat, lng } = e.latlng;
                document.getElementById('new-town-lat').value = lat.toFixed(6);
                document.getElementById('new-town-lng').value = lng.toFixed(6);
                
                if (tempMarker) map.removeLayer(tempMarker);
                tempMarker = L.marker([lat, lng]).addTo(map);
                
                addTownSidebar.classList.add('show');
                isPickingMode = false;
                document.body.classList.remove('picking-mode');
                addTownBtn.style.color = 'white';
            } else if (isMediaPickingMode && mediaToEdit) {
                const { lat, lng } = e.latlng;
                saveMediaLocation(lat, lng);
            }
        });
    }

    function initMap3d() {
        if (map3d) return;

        map3d = new maplibregl.Map({
            container: 'map3d',
            style: {
                version: 8,
                glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
                sources: {
                    'satellite': {
                        type: 'raster',
                        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                        tileSize: 256,
                        attribution: 'Esri Satellite'
                    },
                    'labels': {
                        type: 'raster',
                        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
                        tileSize: 256,
                        attribution: 'Esri Labels'
                    },
                    'openmaptiles': {
                        type: 'vector',
                        url: 'https://tiles.openfreemap.org/planet'
                    },
                    'terrain-source': {
                        type: 'raster-dem',
                        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        encoding: 'terrarium'
                    },
                    'towns-source': {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: []
                        }
                    },
                    'countries': {
                        type: 'geojson',
                        data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson'
                    }
                },
                layers: [
                    { id: 'background', type: 'background', paint: { 'background-color': '#000000' } },
                    { id: 'satellite', type: 'raster', source: 'satellite' },
                    // Water
                    {
                        'id': 'water',
                        'type': 'fill',
                        'source': 'openmaptiles',
                        'source-layer': 'water',
                        'paint': {
                            'fill-color': '#35659d',
                            'fill-opacity': 0.6
                        }
                    },
                    {
                        'id': 'waterway',
                        'type': 'line',
                        'source': 'openmaptiles',
                        'source-layer': 'waterway',
                        'paint': {
                            'line-color': '#35659d',
                            'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 8, 1, 20, 8],
                            'line-opacity': 0.8
                        }
                    },
                    { 
                        'id': '3d-buildings',
                        'source': 'openmaptiles',
                        'source-layer': 'building',
                        'type': 'fill-extrusion',
                        'minzoom': 13,
                        'paint': {
                            'fill-extrusion-color': '#e0e0e0',
                            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 20],
                            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
                            'fill-extrusion-opacity': 0.8
                        }
                    },
                    // Roads - Casing
                    {
                        'id': 'road-casing-major',
                        'type': 'line',
                        'source': 'openmaptiles',
                        'source-layer': 'transportation',
                        'filter': ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false],
                        'layout': { 'line-cap': 'round', 'line-join': 'round' },
                        'paint': {
                            'line-color': '#e9ac77',
                            'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 5, 0.4, 12, 2, 20, 22]
                        }
                    },
                    {
                        'id': 'road-casing-minor',
                        'type': 'line',
                        'source': 'openmaptiles',
                        'source-layer': 'transportation',
                        'filter': ['match', ['get', 'class'], ['secondary', 'tertiary', 'minor'], true, false],
                        'layout': { 'line-cap': 'round', 'line-join': 'round' },
                        'paint': {
                            'line-color': '#cfcdca',
                            'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 12, 0.5, 20, 15]
                        }
                    },
                    // Roads - Core
                    {
                        'id': 'road-motorway',
                        'type': 'line',
                        'source': 'openmaptiles',
                        'source-layer': 'transportation',
                        'filter': ['==', ['get', 'class'], 'motorway'],
                        'layout': { 'line-cap': 'round', 'line-join': 'round' },
                        'paint': {
                            'line-color': '#fc8',
                            'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 5, 0, 12, 1.2, 20, 18]
                        }
                    },
                    {
                        'id': 'road-major',
                        'type': 'line',
                        'source': 'openmaptiles',
                        'source-layer': 'transportation',
                        'filter': ['match', ['get', 'class'], ['trunk', 'primary', 'secondary'], true, false],
                        'layout': { 'line-cap': 'round', 'line-join': 'round' },
                        'paint': {
                            'line-color': '#fff',
                            'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 6, 0.2, 12, 1, 20, 12]
                        }
                    },
                    // Road Labels
                    {
                        'id': 'road-names',
                        'type': 'symbol',
                        'source': 'openmaptiles',
                        'source-layer': 'transportation_name',
                        'minzoom': 13,
                        'layout': {
                            'symbol-placement': 'line',
                            'text-field': ['coalesce', ['get', 'name:es'], ['get', 'name:en'], ['get', 'name']],
                            'text-font': ['Noto Sans Regular'],
                            'text-size': 12,
                            'text-rotation-alignment': 'map'
                        },
                        'paint': {
                            'text-color': '#444',
                            'text-halo-color': 'rgba(255, 255, 255, 0.8)',
                            'text-halo-width': 1
                        }
                    },
                    {
                        'id': 'place-labels',
                        'type': 'symbol',
                        'source': 'openmaptiles',
                        'source-layer': 'place',
                        'layout': {
                            'text-field': ['coalesce', ['get', 'name:es'], ['get', 'name:en'], ['get', 'name']],
                            'text-font': ['Noto Sans Regular'],
                            'text-size': [
                                'interpolate', ['exponential', 1.2], ['zoom'],
                                4, 11,
                                7, 13,
                                11, 18
                            ],
                            'text-pitch-alignment': 'viewport',
                            'text-rotation-alignment': 'map',
                            'text-variable-anchor': ['center', 'top', 'bottom'],
                            'text-padding': 10
                        },
                        'paint': {
                            'text-color': '#ffffff',
                            'text-halo-color': 'rgba(0,0,0,0.8)',
                            'text-halo-width': 1.5
                        }
                    },
                    {
                        id: 'town-labels',
                        type: 'symbol',
                        source: 'towns-source',
                        layout: {
                            'text-field': ['get', 'name'],
                            'text-font': ['Noto Sans Regular'],
                            'text-size': 16,
                            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                            'text-radial-offset': 0.5,
                            'text-justify': 'auto',
                            'text-pitch-alignment': 'viewport',
                            'text-rotation-alignment': 'map'
                        },
                        paint: {
                            'text-color': '#ffffff',
                            'text-halo-color': 'rgba(0, 0, 0, 0.8)',
                            'text-halo-width': 2
                        }
                    },
                    // Geopolitical Layers
                    {
                        'id': 'country-fills',
                        'type': 'fill',
                        'source': 'countries',
                        'layout': { 'visibility': 'none' },
                        'paint': {
                            'fill-color': [
                                'match',
                                ['get', 'mapcolor7'],
                                1, '#8dd3c7',
                                2, '#ffffb3',
                                3, '#bebada',
                                4, '#fb8072',
                                5, '#80b1d3',
                                6, '#fdb462',
                                7, '#b3de69',
                                '#d9d9d9'
                            ],
                            'fill-opacity': 0.7
                        }
                    },
                    {
                        'id': 'country-borders',
                        'type': 'line',
                        'source': 'countries',
                        'layout': { 'visibility': 'none' },
                        'paint': {
                            'line-color': '#ffffff',
                            'line-width': 1
                        }
                    },
                    {
                        'id': 'country-labels',
                        'type': 'symbol',
                        'source': 'countries',
                        'layout': {
                            'visibility': 'none',
                            'text-field': ['get', 'name'],
                            'text-font': ['Noto Sans Regular'],
                            'text-size': 14
                        },
                        'paint': {
                            'text-color': '#333',
                            'text-halo-color': 'rgba(255,255,255,0.8)',
                            'text-halo-width': 1
                        }
                    }
                ],
                terrain: { source: 'terrain-source', exaggeration: 2.0 }
            },
            center: [1.5, 41.8],
            zoom: 8,
            pitch: 60,
            bearing: -10,
            antialias: true
        });

        map3d.addControl(new maplibregl.NavigationControl());
        
        map3d.on('load', () => {
            // Re-force terrain to ensure it loads
            map3d.setTerrain({ source: 'terrain-source', exaggeration: 2.0 });
            if (towns.length > 0) update3DMarkers();
            if (currentTown) renderMediaMarkers();
        });

        map3d.on('click', (e) => {
            if (isMediaPickingMode && mediaToEdit) {
                const { lng, lat } = e.lngLat;
                saveMediaLocation(lat, lng);
            }
        });
    }

    function update3DMarkers() {
        if (!map3d || !map3d.isStyleLoaded()) return;

        // Update GeoJSON source for labels
        const geojson = {
            type: 'FeatureCollection',
            features: towns.map(town => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [town.longitude, town.latitude]
                },
                properties: {
                    name: town.name
                }
            }))
        };
        
        const source = map3d.getSource('towns-source');
        if (source) {
            source.setData(geojson);
        }

        // Clear existing markers
        map3dMarkers.forEach(m => m.remove());
        map3dMarkers = [];

        towns.forEach(town => {
            const el = document.createElement('div');
            el.className = 'custom-div-icon';
            el.innerHTML = `<div class="marker-pin ${favorites.includes(town.name) ? 'isfav' : ''}"><i class="fas fa-camera"></i></div>`;
            el.style.width = '30px';
            el.style.height = '30px';
            
            // Respect marker visibility toggle
            if (!isMarkersVisible) {
                el.style.display = 'none';
            }

            const marker = new maplibregl.Marker(el)
                .setLngLat([town.longitude, town.latitude])
                .addTo(map3d);
            
            el.addEventListener('click', () => {
                openSidebar(town);
            });

            map3dMarkers.push(marker);
        });
    }

    const btn2d = document.getElementById('btn-2d-label');
    const btn3dElement = document.getElementById('btn-3d-label');

    toggle3dBtn.addEventListener('click', () => {
        is3D = !is3D;
        
        if (is3D) {
            const center = map.getCenter();
            const zoom = map.getZoom();
            
            mapContainer2d.classList.add('hidden');
            mapContainer3d.classList.remove('hidden');
            
            btn2d.classList.remove('active');
            btn3dElement.classList.add('active');
            toggle3dBtn.title = 'Cambiar a Vista 2D';
            
            // Disable geo, roads and rivers buttons in 3D
            toggleGeoBtn.style.opacity = '0.4';
            toggleGeoBtn.style.pointerEvents = 'none';
            toggleRoadsBtn.style.opacity = '0.4';
            toggleRoadsBtn.style.pointerEvents = 'none';
            toggleRiversBtn.style.opacity = '0.4';
            toggleRiversBtn.style.pointerEvents = 'none';
            
            // Remove 2D geopolitical layer
            if (geoLayer2D) geoLayer2D.remove();
            
            map3d.setCenter([center.lng, center.lat]);
            map3d.setZoom(zoom); 
            map3d.resize();
            
            if (map3d.isStyleLoaded()) {
                updateMapLayers();
            } else {
                map3d.once('idle', updateMapLayers);
            }

            update3DMarkers();
        } else {
            const center = map3d.getCenter();
            const zoom = map3d.getZoom();
            
            mapContainer3d.classList.add('hidden');
            mapContainer2d.classList.remove('hidden');
            
            btn2d.classList.add('active');
            btn3dElement.classList.remove('active');
            toggle3dBtn.title = 'Cambiar a Vista 3D';
            
            // Enable geo, roads and rivers buttons in 2D
            toggleGeoBtn.style.opacity = '1';
            toggleGeoBtn.style.pointerEvents = 'auto';
            toggleRoadsBtn.style.opacity = '1';
            toggleRoadsBtn.style.pointerEvents = 'auto';
            toggleRiversBtn.style.opacity = '1';
            toggleRiversBtn.style.pointerEvents = 'auto';
            
            // Add 2D geopolitical layer if active
            if (geoLayer2D && isGeo) geoLayer2D.addTo(map);
            
            map.setView([center.lat, center.lng], zoom);
            map.invalidateSize();
            renderMarkers();
        }
    });

    toggleGeoBtn.addEventListener('click', () => {
        if (is3D) {
            showMapNotice('Disponible solo en modo 2D');
            return;
        }
        isGeo = !isGeo;
        toggleGeoBtn.classList.toggle('active', isGeo);
        
        // 2D Map geopolitical layer only
        if (geoLayer2D) {
            if (isGeo) {
                geoLayer2D.addTo(map);
            } else {
                geoLayer2D.remove();
            }
        }
    });

    toggleRoadsBtn.addEventListener('click', () => {
        if (is3D) {
            showMapNotice('Disponible solo en modo 2D');
            return;
        }
        isRoadsVisible = !isRoadsVisible;
        toggleRoadsBtn.classList.toggle('active', isRoadsVisible);
        
        // 2D Map
        if (map && roadsLayer2D) {
            if (isRoadsVisible) {
                map.addLayer(roadsLayer2D);
            } else {
                map.removeLayer(roadsLayer2D);
            }
        }
    });

    toggleRiversBtn.addEventListener('click', () => {
        if (is3D) {
            showMapNotice('Disponible solo en modo 2D');
            return;
        }
        isRiversVisible = !isRiversVisible;
        toggleRiversBtn.classList.toggle('active', isRiversVisible);
        
        // 2D Map
        if (map && riversLayer2D) {
            if (isRiversVisible) {
                map.addLayer(riversLayer2D);
            } else {
                map.removeLayer(riversLayer2D);
            }
        }
    });

    toggleMarkersBtn.addEventListener('click', () => {
        isMarkersVisible = !isMarkersVisible;
        toggleMarkersBtn.classList.toggle('active', isMarkersVisible);
        
        // 2D Map markers (towns)
        if (map && markers) {
            if (isMarkersVisible) {
                map.addLayer(markers);
            } else {
                map.removeLayer(markers);
            }
        }
        
        // 3D Map markers (towns)
        if (map3d) {
            map3dMarkers.forEach(m => {
                m.getElement().style.display = isMarkersVisible ? '' : 'none';
            });
        }
        
        // Preview markers (only exist on 2D map)
        if (!isMarkersVisible) {
            Object.values(monthPreviewMarkers || {}).forEach(markers => {
                markers.forEach(m => map.removeLayer(m));
            });
        }
        
        // Update media markers visibility
        updateMediaMarkersVisibility();
    });

    // --- API CALLS ---

    async function loadFavorites() {
        try {
            const response = await fetch('/api/favorites');
            favorites = await response.json();
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }

    async function loadTowns() {
        try {
            const response = await fetch('/api/towns');
            towns = await response.json();
            renderMarkers();
            if (map3d) update3DMarkers();
        } catch (error) {
            console.error('Error loading towns:', error);
        }
    }

    function renderMarkers() {
        markers.clearLayers();
        towns.forEach(town => {
            const isFav = favorites.includes(town.name);
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="marker-pin ${isFav ? 'isfav' : ''}"></div><i class="fas ${isFav ? 'fa-heart' : 'fa-map-marker-alt'}"></i>`,
                iconSize: [30, 42],
                iconAnchor: [15, 42]
            });

            const marker = L.marker([town.latitude, town.longitude], { icon: customIcon });
            marker.on('click', () => openSidebar(town));
            marker.bindPopup(`<b>${town.name}</b><br>${town.province}`);
            
            // Permanent Label (Google Maps style)
            marker.bindTooltip(town.name, {
                permanent: true,
                direction: 'top',
                offset: [0, -35],
                className: 'town-label'
            });
            
            markers.addLayer(marker);
        });
    }

    async function loadMedia(townName) {
        try {
            const response = await fetch(`/api/media/${encodeURIComponent(townName)}`);
            const media = await response.json();
            
            // Clear all preview markers from map before rendering
            Object.values(monthPreviewMarkers).forEach(markers => {
                if (markers) {
                    markers.forEach(m => map.removeLayer(m));
                }
            });
            monthPreviewMarkers = {};
            
            renderGallery(media);
            renderMediaMarkers();
            
            // Restore previews for the current tab only
            const currentMediaType = currentTab === 'images' ? 'image' : 'video';
            const activeMonths = previewActiveMonths[currentTab];
            Object.keys(activeMonths).forEach(monthKey => {
                const monthItems = media.filter(item => 
                    item.type === currentMediaType && 
                    `${item.year}-${item.month}` === monthKey
                );
                if (monthItems.length > 0) {
                    toggleMonthPreview(monthKey, monthItems, true);
                }
            });
            
        } catch (error) {
            console.error('Error loading media:', error);
        }
    }

    // --- UI ACTIONS ---

    function openSidebar(town) {
        currentTown = town;
        townNameElem.innerText = town.name;
        townProvinceElem.innerText = town.province;
        townDescElem.innerText = town.description;
        
        // Update favorite button state
        const isFav = favorites.includes(town.name);
        favBtn.innerHTML = isFav ? '<i class="fas fa-heart"></i> Favorito' : '<i class="far fa-heart"></i> Favorito';
        favBtn.classList.toggle('active', isFav);

        addTownSidebar.classList.remove('show');
        sidebar.classList.add('show');
        loadMedia(town.name);
        
        // Auto-zoom to town
        if (is3D) {
            map3d.flyTo({
                center: [town.longitude, town.latitude],
                zoom: 17,
                pitch: 65,
                essential: true
            });
        } else {
            map.flyTo([town.latitude, town.longitude], 13, {
                animate: true,
                duration: 1.5
            });
        }
    }

    // --- GALLERY ACTIONS ---

    window.deleteMedia = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este archivo?')) return;
        try {
            await fetch(`/api/media/${id}`, { method: 'DELETE' });
            loadMedia(currentTown.name);
        } catch (error) {
            console.error('Error deleting media:', error);
        }
    };

    window.generateThumbnail = async (id, filePath) => {
        try {
            const response = await fetch(`/api/media/${id}/generate-thumbnail`, { method: 'POST' });
            const data = await response.json();
            if (data.thumbnail_path) {
                // Reload media to get updated thumbnail path
                loadMedia(currentTown.name);
            }
        } catch (error) {
            console.error('Error generating thumbnail:', error);
        }
    };

    // --- UPLOAD HANDLERS ---

    imageUpload.addEventListener('change', async (e) => {
        if (!e.target.files.length || !currentTown) return;
        
        const month = document.getElementById('upload-month').value;
        const year = document.getElementById('upload-year').value;
        
        for (const file of e.target.files) {
            const formData = new FormData();
            formData.append('town', currentTown.name);
            formData.append('month', month);
            formData.append('year', year);
            formData.append('image', file);

            try {
                await fetch('/api/upload/image', {
                    method: 'POST',
                    body: formData
                });
            } catch (error) {
                console.error('Error uploading image:', error);
            }
        }
        
        e.target.value = ''; // Reset input
        loadMedia(currentTown.name);
    });

    videoUpload.addEventListener('change', async (e) => {
        if (!e.target.files.length || !currentTown) return;
        
        const month = document.getElementById('upload-month').value;
        const year = document.getElementById('upload-year').value;
        
        for (const file of e.target.files) {
            const formData = new FormData();
            formData.append('town', currentTown.name);
            formData.append('month', month);
            formData.append('year', year);
            formData.append('video', file);

            try {
                await fetch('/api/upload/video', {
                    method: 'POST',
                    body: formData
                });
            } catch (error) {
                console.error('Error uploading video:', error);
            }
        }
        
        e.target.value = ''; // Reset input
        loadMedia(currentTown.name);
    });

    // --- SEARCH ---

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (!query) {
            searchResults.classList.add('hidden');
            return;
        }

        const matches = towns.filter(t => t.name.toLowerCase().includes(query) || t.province.toLowerCase().includes(query));
        renderSearchResults(matches);
    });

    function renderSearchResults(matches) {
        searchResults.innerHTML = '';
        if (matches.length === 0) {
            searchResults.classList.add('hidden');
            return;
        }

        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerText = `${match.name} (${match.province})`;
            div.onclick = () => {
                openSidebar(match);
                searchResults.classList.add('hidden');
                searchInput.value = match.name;
            };
            searchResults.appendChild(div);
        });
        searchResults.classList.remove('hidden');
    }

    // --- MODALS & GALLERY ---

    let currentMediaIndex = 0;

    function showImageModal(index) {
        currentMediaIndex = index;
        const item = galleryItems[index];
        
        // Open with Windows Photos (allows navigation between images)
        if (window.electronAPI && window.electronAPI.openWithPhotos) {
            window.electronAPI.openWithPhotos(item.file_path);
        } else if (window.electronAPI && window.electronAPI.openExternalFile) {
            window.electronAPI.openExternalFile(item.file_path);
        } else {
            showImageInModal(item);
        }
        
        updateNavButtons();
    }
    
    function showImageInModal(item) {
        const modalImg = document.getElementById('modal-img');
        modalImg.src = item.file_path;
        
        // Reset styles first
        modalImg.style.width = 'auto';
        modalImg.style.height = 'auto';
        modalImg.style.maxWidth = '85vw';
        modalImg.style.maxHeight = '85vh';
        
        modalImg.onload = function() {
            // Calculate proper size to fit in viewport while maintaining aspect ratio
            const viewportWidth = window.innerWidth * 0.85;
            const viewportHeight = window.innerHeight * 0.85;
            const imgWidth = this.naturalWidth;
            const imgHeight = this.naturalHeight;
            
            const widthRatio = viewportWidth / imgWidth;
            const heightRatio = viewportHeight / imgHeight;
            const ratio = Math.min(widthRatio, heightRatio, 1); // Never scale up, only down
            
            if (ratio < 1) {
                modalImg.style.width = (imgWidth * ratio) + 'px';
                modalImg.style.height = (imgHeight * ratio) + 'px';
            }
        };
        
        imageModal.classList.remove('hidden');
    }

    // State for date group markers visibility
    let yearVisibility = {};
    let monthVisibility = {};
    let monthPreviewMarkers = {}; // Track preview markers by month key
    let previewActiveMonths = { images: {}, videos: {} }; // Track which months have preview active per media type

    function renderGallery(media) {
        galleryGrid.innerHTML = '';
        
        // Filter by current tab
        const filteredMedia = media.filter(item => item.type === (currentTab === 'images' ? 'image' : 'video'));

        if (filteredMedia.length === 0) {
            galleryGrid.innerHTML = `<p class="empty-msg">No hay ${currentTab === 'images' ? 'fotos' : 'vídeos'} aún.</p>`;
            return;
        }

        // Sort media chronologically (newest first)
        filteredMedia.sort((a, b) => {
            const dateA = (a.year || 0) * 100 + (a.month || 0);
            const dateB = (b.year || 0) * 100 + (b.month || 0);
            return dateB - dateA;
        });

        galleryItems = filteredMedia;

        // Group by year first (galleryItems is already filtered by current media type)
        const years = {};
        galleryItems.forEach(item => {
            const year = item.year || 0;
            if (!years[year]) years[year] = [];
            years[year].push(item);
        });

        // Sort years descending
        const sortedYears = Object.keys(years).sort((a, b) => b - a);

        sortedYears.forEach(year => {
            const yearNum = parseInt(year);
            
            // Initialize year visibility if not set (default: closed)
            if (yearVisibility[year] === undefined) {
                yearVisibility[year] = false;
            }

            // Create year section (collapsed by default)
            const isFirstYear = sortedYears.indexOf(year) === 0;
            const isExpanded = yearVisibility[year] === true;

            const yearSection = document.createElement('div');
            yearSection.className = 'gallery-year-section';
            
            const yearHeader = document.createElement('div');
            yearHeader.className = 'gallery-year-header';
            yearHeader.style.cursor = 'pointer';
            
            const yearTitleWrapper = document.createElement('div');
            yearTitleWrapper.style.display = 'flex';
            yearTitleWrapper.style.alignItems = 'center';
            yearTitleWrapper.style.gap = '10px';
            
            const expandIcon = document.createElement('i');
            expandIcon.className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
            expandIcon.style.fontSize = '0.8rem';
            expandIcon.style.color = '#888';
            yearTitleWrapper.appendChild(expandIcon);
            
            const yearTitle = document.createElement('span');
            yearTitle.className = 'year-title';
            yearTitle.innerText = yearNum;
            yearTitleWrapper.appendChild(yearTitle);
            
            // Count items in this year
            const itemCount = years[year].length;
            const countBadge = document.createElement('span');
            countBadge.className = 'year-count-badge';
            countBadge.innerText = `(${itemCount})`;
            countBadge.style.color = '#666';
            countBadge.style.fontSize = '0.8rem';
            yearTitleWrapper.appendChild(countBadge);
            
            yearHeader.appendChild(yearTitleWrapper);

            const yearActions = document.createElement('div');
            yearActions.style.display = 'flex';
            yearActions.style.gap = '5px';
            
            const yearEditBtn = document.createElement('button');
            yearEditBtn.className = 'btn-edit-year';
            yearEditBtn.title = 'Editar fecha de este año';
            yearEditBtn.innerHTML = '<i class="fas fa-edit"></i>';
            yearEditBtn.onclick = (e) => {
                e.stopPropagation();
                openEditYearModal(yearNum, years[year]);
            };
            yearActions.appendChild(yearEditBtn);
            
            yearHeader.appendChild(yearActions);
            
            yearSection.appendChild(yearHeader);

            // Click on header to expand/collapse
            yearHeader.onclick = () => {
                yearVisibility[year] = !yearVisibility[year];
                expandIcon.className = yearVisibility[year] ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
                
                const monthSections = yearSection.querySelectorAll('.gallery-month-section');
                monthSections.forEach(ms => {
                    ms.style.display = yearVisibility[year] ? '' : 'none';
                });
            };
            
            // Get months for this year and sort descending
            const yearItems = years[year].sort((a, b) => {
                const dateA = (a.year || 0) * 100 + (a.month || 0);
                const dateB = (b.year || 0) * 100 + (b.month || 0);
                return dateB - dateA;
            });

            const monthsInYear = {};
            yearItems.forEach(item => {
                const monthKey = item.month || 0;
                if (!monthsInYear[monthKey]) monthsInYear[monthKey] = [];
                monthsInYear[monthKey].push(item);
            });

            const sortedMonths = Object.keys(monthsInYear).sort((a, b) => b - a);

            sortedMonths.forEach(month => {
                const monthKey = `${year}-${month}`;
                const monthNum = parseInt(month);
                const groupKey = `${months[monthNum]} ${year}`;
                
                // Initialize month visibility if not set
                if (monthVisibility[monthKey] === undefined) {
                    monthVisibility[monthKey] = true;
                }

                const monthSection = document.createElement('div');
                monthSection.className = 'gallery-month-section';
                monthSection.dataset.monthKey = monthKey;
                monthSection.style.display = isExpanded ? '' : 'none';
                
                const monthHeader = document.createElement('div');
                monthHeader.className = 'gallery-date-header';
                monthHeader.style.cursor = 'pointer';
                
                // Expand/collapse icon for month
                const monthExpandIcon = document.createElement('i');
                monthExpandIcon.className = 'fas fa-chevron-down';
                monthExpandIcon.style.fontSize = '0.7rem';
                monthExpandIcon.style.color = '#888';
                monthExpandIcon.style.marginRight = '8px';
                monthHeader.appendChild(monthExpandIcon);
                
                const monthTitle = document.createElement('span');
                monthTitle.innerText = groupKey;
                monthTitle.style.flex = '1';
                monthHeader.appendChild(monthTitle);
                
                // Count items in this month
                const monthItemCount = monthsInYear[month].length;
                const monthCountBadge = document.createElement('span');
                monthCountBadge.style.color = '#666';
                monthCountBadge.style.fontSize = '0.75rem';
                monthCountBadge.style.marginRight = '10px';
                monthCountBadge.innerText = `(${monthItemCount})`;
                monthHeader.appendChild(monthCountBadge);
                
                const monthActions = document.createElement('div');
                monthActions.style.display = 'flex';
                monthActions.style.gap = '5px';
                
                const mediaType = currentTab === 'images' ? 'images' : 'videos';
                const isPreviewActive = previewActiveMonths[mediaType][monthKey] || false;
                
                const monthToggleBtn = document.createElement('button');
                monthToggleBtn.className = 'btn-toggle-markers ' + (isPreviewActive ? 'active' : '');
                monthToggleBtn.title = 'Ver previsualización';
                monthToggleBtn.innerHTML = '<i class="fas fa-images"></i>';
                monthToggleBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const isShowingPreview = await toggleMonthPreview(monthKey, monthsInYear[month]);
                    monthToggleBtn.classList.toggle('active', isShowingPreview);
                    
                    // Save state in previewActiveMonths
                    const mediaType = currentTab === 'images' ? 'images' : 'videos';
                    if (isShowingPreview) {
                        previewActiveMonths[mediaType][monthKey] = true;
                    } else {
                        delete previewActiveMonths[mediaType][monthKey];
                    }
                    
                    updateMediaMarkersVisibility();
                };
                monthActions.appendChild(monthToggleBtn);

                const monthEditBtn = document.createElement('button');
                monthEditBtn.className = 'btn-edit-year';
                monthEditBtn.title = 'Editar fecha';
                monthEditBtn.innerHTML = '<i class="fas fa-edit"></i>';
                monthEditBtn.onclick = (e) => {
                    e.stopPropagation();
                    openEditDateModal(yearNum, monthsInYear[month]);
                };
                monthActions.appendChild(monthEditBtn);

                const monthDeleteBtn = document.createElement('button');
                monthDeleteBtn.className = 'btn-delete-group';
                monthDeleteBtn.style.color = '#ff4d4d';
                monthDeleteBtn.style.background = 'none';
                monthDeleteBtn.style.border = 'none';
                monthDeleteBtn.style.cursor = 'pointer';
                monthDeleteBtn.style.padding = '2px 5px';
                monthDeleteBtn.title = 'Eliminar todo este mes';
                monthDeleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                monthDeleteBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm(`¿Estás seguro de que quieres eliminar TODAS las imágenes/vídeos de ${groupKey}?`)) return;
                    
                    // Clean up preview markers for this month before deletion
                    const monthKeyToDelete = `${year}-${monthNum}`;
                    if (monthPreviewMarkers[monthKeyToDelete]) {
                        monthPreviewMarkers[monthKeyToDelete].forEach(m => map.removeLayer(m));
                        delete monthPreviewMarkers[monthKeyToDelete];
                    }
                    
                    // Clean up visibility state for this month
                    delete monthVisibility[monthKeyToDelete];
                    
                    // Clean up previewActiveMonths for this month
                    const mediaType = currentTab === 'images' ? 'images' : 'videos';
                    delete previewActiveMonths[mediaType][monthKeyToDelete];
                    
                    try {
                        const response = await fetch(`/api/media/town/${encodeURIComponent(currentTown.name)}/year/${year}/month/${monthNum}`, {
                            method: 'DELETE'
                        });
                        if (response.ok) {
                            loadMedia(currentTown.name);
                        } else {
                            alert('Error al eliminar el contenido del mes.');
                        }
                    } catch (err) {
                        console.error('Error deleting month media:', err);
                    }
                };
                monthActions.appendChild(monthDeleteBtn);

                monthHeader.appendChild(monthActions);
                
                // Click on header to expand/collapse month
                monthHeader.onclick = () => {
                    const isMonthExpanded = monthContainer.style.display !== 'none';
                    monthContainer.style.display = isMonthExpanded ? 'none' : '';
                    monthExpandIcon.className = isMonthExpanded ? 'fas fa-chevron-right' : 'fas fa-chevron-down';
                };
                
                monthSection.appendChild(monthHeader);
                
                const monthContainer = document.createElement('div');
                monthContainer.className = 'gallery-group';
                monthContainer.style.display = '';
                
                monthsInYear[month].forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'gallery-item';
                    
                    let htmlInner = `
                        <button class="btn-delete" title="Eliminar archivo" onclick="deleteMedia(${item.id})"><i class="fas fa-trash"></i></button>
                        <button class="btn-location ${isMediaPickingMode && mediaToEdit?.id === item.id ? 'active' : ''}" title="Editar ubicación" onclick="editMediaLocation(${item.id}, event)"><i class="fas fa-map-marker-alt"></i></button>
                    `;
                    if (item.latitude && item.longitude) {
                        htmlInner += `<button class="btn-location-delete" title="Borrar ubicación" onclick="deleteMediaLocation(${item.id})"><i class="fas fa-times-circle"></i></button>`;
                    }

                    if (item.type === 'image') {
                        div.innerHTML = `
                            <img src="${item.file_path}" alt="${item.town}">
                            ${htmlInner}
                        `;
                        div.onclick = (e) => {
                            if (e.target.closest('button')) return;
                            showImageModal(galleryItems.indexOf(item));
                        };
                    } else {
                        div.innerHTML = `
                            <div class="video-thumbnail">
                                <i class="fas fa-play"></i>
                            </div>
                            <div class="video-overlay"><i class="fas fa-play"></i></div>
                            ${htmlInner}
                        `;
                        div.onclick = (e) => {
                            if (e.target.closest('button')) return;
                            showVideoModal(galleryItems.indexOf(item));
                        };
                    }
                    
                    div.onmouseenter = () => highlightMediaMarker(item.id, true);
                    div.onmouseleave = () => highlightMediaMarker(item.id, false);

                    monthContainer.appendChild(div);
                });
                
                monthSection.appendChild(monthContainer);
                yearSection.appendChild(monthSection);
            });

            galleryGrid.appendChild(yearSection);
        });
    }

    function showVideoModal(index) {
        currentMediaIndex = index;
        const item = galleryItems[index];
        
        // Open video with system default player
        if (window.electronAPI && window.electronAPI.openExternalFile) {
            window.electronAPI.openExternalFile(item.file_path).then(result => {
                if (!result.success) {
                    console.error('Error opening video:', result.error);
                    alert('No se pudo abrir el video. Error: ' + result.error);
                }
            });
        } else {
            // Fallback for browser testing - show modal
            const modalVid = document.getElementById('modal-video');
            modalVid.src = item.file_path;
            videoModal.classList.remove('hidden');
            modalVid.play();
        }
        
        updateNavButtons();
    }

    function updateNavButtons() {
        const hasMultiple = galleryItems.length > 1;
        document.querySelectorAll('.modal-nav').forEach(btn => {
            btn.style.display = hasMultiple ? 'flex' : 'none';
        });
    }

    function navigateModal(step) {
        if (galleryItems.length <= 1) return;
        
        currentMediaIndex = (currentMediaIndex + step + galleryItems.length) % galleryItems.length;
        const item = galleryItems[currentMediaIndex];
        
        if (item.type === 'image') {
            document.getElementById('modal-img').src = item.file_path;
            imageModal.classList.remove('hidden');
            videoModal.classList.add('hidden');
            document.getElementById('modal-video').pause();
        } else {
            const modalVid = document.getElementById('modal-video');
            modalVid.src = item.file_path;
            videoModal.classList.remove('hidden');
            imageModal.classList.add('hidden');
            modalVid.play();
        }
    }

    // Nav Click Events
    document.getElementById('prev-btn').onclick = (e) => { e.stopPropagation(); navigateModal(-1); };
    document.getElementById('next-btn').onclick = (e) => { e.stopPropagation(); navigateModal(1); };
    document.getElementById('v-prev-btn').onclick = (e) => { e.stopPropagation(); navigateModal(-1); };
    document.getElementById('v-next-btn').onclick = (e) => { e.stopPropagation(); navigateModal(1); };

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (imageModal.classList.contains('hidden') && videoModal.classList.contains('hidden')) return;
        
        if (e.key === 'ArrowLeft') navigateModal(-1);
        if (e.key === 'ArrowRight') navigateModal(1);
        if (e.key === 'Escape') closeModal();
    });

    function closeModal() {
        imageModal.classList.add('hidden');
        videoModal.classList.add('hidden');
        document.getElementById('modal-video').pause();
    }

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.onclick = closeModal;
    });

    // Close on background click
    [imageModal, videoModal].forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    });

    // --- EVENTS ---

    closeSidebarBtn.onclick = () => {
        sidebar.classList.remove('show');
        clearMediaMarkers();
        // Clear all preview markers
        Object.values(monthPreviewMarkers || {}).forEach(markers => {
            markers.forEach(m => map.removeLayer(m));
        });
        monthPreviewMarkers = {};
        previewActiveMonths = { images: {}, videos: {} };
        isMediaPickingMode = false;
        mediaToEdit = null;
        document.body.classList.remove('picking-mode');
    };

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const previousTab = currentTab;
            currentTab = btn.dataset.tab;
            // Save previews from current tab before switching
            if (previousTab && previousTab !== currentTab) {
                const previousMediaType = previousTab === 'images' ? 'images' : 'videos';
                Object.keys(monthPreviewMarkers).forEach(monthKey => {
                    if (monthPreviewMarkers[monthKey] && monthPreviewMarkers[monthKey].length > 0) {
                        previewActiveMonths[previousMediaType][monthKey] = true;
                    }
                });
            }
            // Don't clear preview markers when switching tabs - restore them instead
            if (currentTown) loadMedia(currentTown.name);
        });
    });

    favBtn.addEventListener('click', async () => {
        if (!currentTown) return;
        try {
            const response = await fetch('/api/favorites/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ town: currentTown.name })
            });
            const data = await response.json();
            
            if (data.favorite) {
                favorites.push(currentTown.name);
            } else {
                favorites = favorites.filter(f => f !== currentTown.name);
            }
            
            favBtn.innerHTML = data.favorite ? '<i class="fas fa-heart"></i> Favorito' : '<i class="far fa-heart"></i> Favorito';
            favBtn.classList.toggle('active', data.favorite);
            renderMarkers(); // Update icon on map
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    });

    // --- ADD/EDIT TOWN LOGIC ---

        addTownBtn.onclick = () => {
        editMode = false;
        townToEdit = null;
        formTitle.innerText = 'Añadir Nueva Imagen';
        addTownForm.reset();
        
        // Close other sidebar
        sidebar.classList.remove('show');
        
        isPickingMode = !isPickingMode;
        document.body.classList.toggle('picking-mode', isPickingMode);
        
        if (isPickingMode) {
            addTownBtn.style.color = 'var(--primary-color)';
            // alert('Haz clic en el mapa para situar el nuevo pueblo.');
        } else {
            addTownBtn.style.color = 'white';
            if (tempMarker) map.removeLayer(tempMarker);
            addTownSidebar.classList.remove('show');
        }
    };

    editTownBtn.onclick = () => {
        if (!currentTown) return;
        
        editMode = true;
        townToEdit = currentTown;
        isPickingMode = false;
        document.body.classList.remove('picking-mode');
        addTownBtn.style.color = 'white';

        // Close details sidebar
        sidebar.classList.remove('show');

        // Populate form
        document.getElementById('new-town-name').value = townToEdit.name;
        document.getElementById('new-town-province').value = townToEdit.province.trim();
        document.getElementById('new-town-lat').value = townToEdit.latitude;
        document.getElementById('new-town-lng').value = townToEdit.longitude;
        document.getElementById('new-town-desc').value = townToEdit.description;

        formTitle.innerText = `Editar ${townToEdit.name}`;
        addTownSidebar.classList.add('show');
    };

    closeFormBtn.onclick = () => {
        addTownSidebar.classList.remove('show');
        if (tempMarker) map.removeLayer(tempMarker);
        isPickingMode = false;
        document.body.classList.remove('picking-mode');
        addTownBtn.style.color = 'white';
        editMode = false;
        townToEdit = null;
    };

    addTownForm.onsubmit = async (e) => {
        e.preventDefault();
        const townData = {
            name: document.getElementById('new-town-name').value,
            province: document.getElementById('new-town-province').value,
            latitude: parseFloat(document.getElementById('new-town-lat').value),
            longitude: parseFloat(document.getElementById('new-town-lng').value),
            description: document.getElementById('new-town-desc').value
        };

        const url = editMode ? `/api/towns/${encodeURIComponent(townToEdit.name)}` : '/api/towns';
        const method = editMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(townData)
            });

            if (response.ok) {
                // alert(editMode ? 'Ubicación actualizada correctamente!' : 'Ubicación añadida correctamente!');
                addTownSidebar.classList.remove('show');
                addTownForm.reset();
                if (tempMarker) map.removeLayer(tempMarker);
                
                if (editMode && currentTown && currentTown.name === townToEdit.name) {
                    // Update current sidebar if we edited the active town
                    currentTown = { ...townData };
                    townNameElem.innerText = currentTown.name;
                    townProvinceElem.innerText = currentTown.province;
                    townDescElem.innerText = currentTown.description;
                }

                editMode = false;
                townToEdit = null;
                loadTowns(); 
            } else {
                const err = await response.json();
                alert('Error: ' + err.error);
            }
        } catch (error) {
            console.error('Error saving town:', error);
            alert('Hubo un problema al conectar con el servidor.');
        }
    };

    // Town Deletion
    document.getElementById('delete-town-btn').onclick = async () => {
        if (!currentTown) return;
        if (!confirm(`¿Estás seguro de que quieres eliminar esta ubicación y todas sus fotos/vídeos permanentemente?`)) return;
        
        // Clear all preview markers before deletion
        Object.values(monthPreviewMarkers || {}).forEach(markers => {
            markers.forEach(m => map.removeLayer(m));
        });
        monthPreviewMarkers = {};
        
        // Clear media markers
        clearMediaMarkers();
        
        // Clear visibility states
        yearVisibility = {};
        monthVisibility = {};
        
        try {
            const response = await fetch(`/api/towns/${encodeURIComponent(currentTown.name)}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // alert('Ubicación eliminada correctamente.');
                sidebar.classList.remove('show');
                currentTown = null;
                loadTowns(); // Refresh map
            } else {
                const err = await response.json();
                alert('Error al eliminar: ' + err.error);
            }
        } catch (error) {
            console.error('Error deleting town:', error);
            alert('Hubo un problema al conectar con el servidor.');
        }
    };

    // --- MEDIA LOCATIONS ---
    
    function getGroupKey(item) {
        return item.year && item.month ? `${item.year}-${item.month}` : "sin-fecha";
    }
    
    function clearMediaMarkers() {
        mediaMarkers2d.forEach(m => map.removeLayer(m));
        mediaMarkers2d = [];
        mediaMarkers3d.forEach(m => m.remove());
        mediaMarkers3d = [];
    }

    function toggleMonthPreview(monthKey, items, forceShow = null) {
        // Determine if we should show or hide based on forceShow or current state
        const isCurrentlyShowing = monthPreviewMarkers[monthKey] && monthPreviewMarkers[monthKey].length > 0;
        const shouldShow = forceShow !== null ? forceShow : !isCurrentlyShowing;
        
        // If forcing show but already showing, don't do anything
        if (forceShow === true && isCurrentlyShowing) {
            return true;
        }
        
        // If forcing hide or toggling off, remove existing markers
        if (!shouldShow && monthPreviewMarkers[monthKey]) {
            monthPreviewMarkers[monthKey].forEach(m => map.removeLayer(m));
            delete monthPreviewMarkers[monthKey];
            return false;
        }
        
        // Get items with location
        const itemsWithLocation = items.filter(item => item.latitude && item.longitude);
        
        if (itemsWithLocation.length === 0) {
            if (!forceShow) { // Only alert when manually triggered
                alert('No hay imágenes con ubicación en este mes');
            }
            return false;
        }
        
        // Show ALL items (no limit)
        
        // Create preview markers
        const previewMarkers = [];
        
        itemsWithLocation.forEach(item => {
            let previewContent;
            if (item.type === 'video') {
                // Show video icon in preview
                previewContent = `<div class="preview-marker-video"><i class="fas fa-video"></i></div>`;
            } else {
                previewContent = `<img src="${item.file_path}" alt="preview">`;
            }
            
            const previewIcon = L.divIcon({
                className: 'preview-marker-icon',
                html: `<div class="preview-marker">${previewContent}</div>`,
                iconSize: [60, 60],
                iconAnchor: [30, 30]
            });
            
            const marker = L.marker([item.latitude, item.longitude], { icon: previewIcon });
            marker.itemId = item.id;
            marker.bindPopup(`<b>${item.town}</b><br>${item.month}/${item.year}`);
            map.addLayer(marker);
            previewMarkers.push(marker);
        });
        
        monthPreviewMarkers[monthKey] = previewMarkers;
        return true;
    }

    function renderMediaMarkers() {
        clearMediaMarkers();
        if (!currentTown) return;

        galleryItems.forEach(item => {
            if (item.latitude && item.longitude) {
                const groupKey = getGroupKey(item);
                
                // 2D Marker
                const customIcon2d = L.divIcon({
                    className: 'custom-media-icon',
                    html: `<div class="media-marker-pin" id="marker-2d-${item.id}" data-group="${groupKey}"></div><i class="fas ${item.type === 'image' ? 'fa-camera' : 'fa-video'}"></i>`,
                    iconSize: [20, 30],
                    iconAnchor: [10, 30]
                });

                const marker2d = L.marker([item.latitude, item.longitude], { icon: customIcon2d });
                marker2d.bindPopup(`<b>${item.town}</b><br>${item.month ? item.month + '/' : ''}${item.year || ''}`);
                marker2d.groupKey = groupKey;
                map.addLayer(marker2d);
                mediaMarkers2d.push(marker2d);

                // 3D Marker
                if (map3d && map3d.isStyleLoaded()) {
                    const el = document.createElement('div');
                    el.className = 'custom-media-icon';
                    el.dataset.group = groupKey;
                    el.innerHTML = `<div class="media-marker-pin" id="marker-3d-${item.id}"></div><i class="fas ${item.type === 'image' ? 'fa-camera' : 'fa-video'}"></i>`;
                    el.style.width = '20px';
                    el.style.height = '20px';

                    const marker3d = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                        .setLngLat([item.longitude, item.latitude])
                        .addTo(map3d);

                    mediaMarkers3d.push(marker3d);
                }
            }
        });
        
        updateMediaMarkersVisibility();
    }
    
    function updateMediaMarkersVisibility() {
        if (!isMarkersVisible) {
            // Hide all media markers when main toggle is off
            mediaMarkers2d.forEach(marker => {
                if (map.hasLayer(marker)) map.removeLayer(marker);
            });
            mediaMarkers3d.forEach(marker => {
                marker.getElement().style.display = 'none';
            });
            // Hide preview markers too
            Object.values(monthPreviewMarkers || {}).forEach(markers => {
                markers.forEach(m => map.removeLayer(m));
            });
            return;
        }
        
        // 2D media markers
        mediaMarkers2d.forEach((marker) => {
            const groupKey = marker.groupKey; // format: "year-month"
            const [year, month] = groupKey.split('-');
            const isYearVisible = yearVisibility[year] === true;
            const isMonthVisible = monthVisibility[groupKey] === true;
            const isGroupVisible = isYearVisible && isMonthVisible;
            
            if (isGroupVisible) {
                if (!map.hasLayer(marker)) {
                    map.addLayer(marker);
                }
            } else {
                if (map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            }
        });
        
        // 3D media markers
        mediaMarkers3d.forEach((marker) => {
            const el = marker.getElement();
            if (el) {
                const groupKey = el.dataset.group;
                const [year, month] = groupKey.split('-');
                const isYearVisible = yearVisibility[year] === true;
                const isMonthVisible = monthVisibility[groupKey] === true;
                el.style.display = (isYearVisible && isMonthVisible) ? '' : 'none';
            }
        });
    }

    window.editMediaLocation = (id, event) => {
        if (event) event.stopPropagation();
        
        // If already in picking mode for this item, cancel it
        if (isMediaPickingMode && mediaToEdit?.id === id) {
            isMediaPickingMode = false;
            mediaToEdit = null;
            document.body.classList.remove('picking-mode');
            renderGallery(galleryItems);
            return;
        }
        
        // Start picking mode for this item
        isMediaPickingMode = true;
        mediaToEdit = galleryItems.find(i => i.id === id);
        document.body.classList.add('picking-mode');
        alert('Haz clic en el mapa para marcar la ubicación de este elemento.');
        renderGallery(galleryItems);
    };

    window.deleteMediaLocation = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar la ubicación de esta foto/vídeo?')) return;
        try {
            await fetch(`/api/media/${id}/location`, { method: 'DELETE' });
            loadMedia(currentTown.name); // Reloads media and markers
        } catch (error) {
            console.error('Error deleting media location:', error);
        }
    };

    window.saveMediaLocation = async (lat, lng) => {
        try {
            await fetch(`/api/media/${mediaToEdit.id}/location`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude: lat, longitude: lng })
            });
            isMediaPickingMode = false;
            mediaToEdit = null;
            document.body.classList.remove('picking-mode');
            loadMedia(currentTown.name); // Reloads media and markers
        } catch (error) {
            console.error('Error saving media location:', error);
        }
    };

    window.highlightMediaMarker = (id, highlight) => {
        // Regular media markers (2D)
        const marker2d = document.getElementById(`marker-2d-${id}`);
        if (marker2d) {
            if (highlight) marker2d.classList.add('highlighted');
            else marker2d.classList.remove('highlighted');
        }
        
        // Regular media markers (3D)
        const marker3d = document.getElementById(`marker-3d-${id}`);
        if (marker3d) {
            if (highlight) marker3d.classList.add('highlighted');
            else marker3d.classList.remove('highlighted');
        }
        
        // Preview markers (turn green)
        const previewMarker = document.getElementById(`preview-${id}`);
        if (previewMarker) {
            if (highlight) previewMarker.classList.add('highlighted');
            else previewMarker.classList.remove('highlighted');
        }
    };

    let editYearItems = [];

    function openEditYearModal(year, items) {
        editYearItems = items;
        
        const modal = document.getElementById('edit-year-modal');
        const info = document.getElementById('edit-year-info');
        const yearSelect = document.getElementById('edit-year-new');
        
        info.innerText = `${items.length} elemento(s) en ${year}`;
        
        yearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 2000; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.innerText = y;
            if (y === year) opt.selected = true;
            yearSelect.appendChild(opt);
        }
        
        modal.classList.remove('hidden');
    }

    let mapNoticeTimeout;
    function showMapNotice(message) {
        let notice = document.getElementById('map-notice');
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'map-notice';
            notice.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:10px 20px;border-radius:8px;font-size:0.9rem;z-index:10000;opacity:0;transition:opacity 0.3s;';
            document.body.appendChild(notice);
        }
        notice.innerText = message;
        notice.style.opacity = '1';
        clearTimeout(mapNoticeTimeout);
        mapNoticeTimeout = setTimeout(() => {
            notice.style.opacity = '0';
        }, 2500);
    }

    function openEditDateModal(year, items) {
        editYearItems = items;
        
        const modal = document.getElementById('edit-date-modal');
        const info = document.getElementById('edit-date-info');
        const monthSelect = document.getElementById('edit-date-month');
        const yearSelect = document.getElementById('edit-date-year');
        
        const firstItem = items[0];
        info.innerText = `${items.length} elemento(s) en ${year}`;
        
        monthSelect.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.innerText = months[i];
            if (firstItem && i === firstItem.month) opt.selected = true;
            monthSelect.appendChild(opt);
        }
        
        yearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 2000; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.innerText = y;
            if (y === year) opt.selected = true;
            yearSelect.appendChild(opt);
        }
        
        modal.classList.remove('hidden');
    }

    document.getElementById('save-year-edit').addEventListener('click', async () => {
        const newYear = parseInt(document.getElementById('edit-year-new').value);
        
        try {
            for (const item of editYearItems) {
                const res = await fetch(`/api/media/${item.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ year: newYear })
                });
                if (!res.ok) throw new Error('Error updating media');
                item.year = newYear;
            }
            
            document.getElementById('edit-year-modal').classList.add('hidden');
            loadMedia(currentTown);
        } catch (err) {
            console.error('Error saving:', err);
            alert('Error al guardar los cambios');
        }
    });

    document.getElementById('save-date-edit').addEventListener('click', async () => {
        const newMonth = parseInt(document.getElementById('edit-date-month').value);
        const newYear = parseInt(document.getElementById('edit-date-year').value);
        
        try {
            for (const item of editYearItems) {
                const res = await fetch(`/api/media/${item.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ month: newMonth, year: newYear })
                });
                if (!res.ok) throw new Error('Error updating media');
                item.month = newMonth;
                item.year = newYear;
            }
            
            document.getElementById('edit-date-modal').classList.add('hidden');
            loadMedia(currentTown);
        } catch (err) {
            console.error('Error saving:', err);
            alert('Error al guardar los cambios');
        }
    });

    document.querySelector('.edit-modal-close').addEventListener('click', () => {
        document.getElementById('edit-year-modal').classList.add('hidden');
    });

    document.getElementById('edit-year-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-year-modal') {
            document.getElementById('edit-year-modal').classList.add('hidden');
        }
    });

    document.querySelector('.edit-date-modal-close').addEventListener('click', () => {
        document.getElementById('edit-date-modal').classList.add('hidden');
    });

    document.getElementById('edit-date-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-date-modal') {
            document.getElementById('edit-date-modal').classList.add('hidden');
        }
    });

    setupDateSelectors();
    initMap();
    
    // Initialize 2D/3D button state (2D active by default)
    if (btn2d) btn2d.classList.add('active');
    if (btn3dElement) btn3dElement.classList.remove('active');
});
