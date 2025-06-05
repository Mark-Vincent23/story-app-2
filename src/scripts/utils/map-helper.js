class MapHelper {
  static initMap(elementId, options = {}) {
    // Default options
    const defaultOptions = {
      center: [-2.5489, 118.0149], // Center of Indonesia
      zoom: 5,
      defaultLayer: 'openStreetMap'
    };
    
    // Merge options
    const mapOptions = { ...defaultOptions, ...options };
    
    // Check if Leaflet is available
    if (!window.L) {
      console.error('Leaflet library is not loaded');
      return null;
    }
    
    // Get map element
    const mapElement = document.getElementById(elementId);
    if (!mapElement) {
      console.error(`Element with id "${elementId}" not found`);
      return null;
    }
    
    // Create map
    const map = L.map(elementId).setView(mapOptions.center, mapOptions.zoom);
    
    // Add default tile layer
    this.addTileLayer(map, mapOptions.defaultLayer);
    
    return map;
  }
  
  static addTileLayer(map, layerType = 'openStreetMap') {
    const layers = {
      openStreetMap: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      },
      stamenWatercolor: {
        url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    };
    
    const selectedLayer = layers[layerType] || layers.openStreetMap;
    
    L.tileLayer(selectedLayer.url, {
      attribution: selectedLayer.attribution,
      maxZoom: 18
    }).addTo(map);
    
    return map;
  }
  
  static createCustomIcon(iconUrl, options = {}) {
    const defaultOptions = {
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    };
    
    const iconOptions = { ...defaultOptions, ...options };
    
    return L.icon({
      iconUrl: iconUrl,
      ...iconOptions
    });
  }
  
  static addMarker(map, lat, lon, options = {}) {
    if (!map) return null;
    
    const marker = L.marker([lat, lon], {
      icon: options.icon || L.Icon.Default()
    }).addTo(map);
    
    if (options.popup) {
      marker.bindPopup(options.popup);
    }
    
    return marker;
  }
  
  static createClusterGroup(map, markers) {
    if (!map || !markers || !markers.length) return [];
    
    // Check if MarkerClusterGroup is available
    if (!L.MarkerClusterGroup) {
      console.warn('Leaflet.markercluster plugin is not loaded, using regular markers');
      return markers;
    }
    
    const clusterGroup = L.markerClusterGroup();
    
    markers.forEach(marker => {
      clusterGroup.addLayer(marker);
    });
    
    map.addLayer(clusterGroup);
    
    return clusterGroup;
  }
}

export default MapHelper;
