let map;

// Variável do centro do mapa
const bhCenter = [-19.9167, -43.9345]; 

// Define os limites geográficos aproximados de Belo Horizonte
const bhLimits = L.latLngBounds(
    [-19.98, -44.10], // Sudoeste
    [-19.75, -43.80] // Nordeste
);

// Função de inicialização do mapa usando o Leaflet
function initMap() {
    // Criação do mapa usando o Leaflet 
    map = L.map('map', {
        center: bhCenter, 
        zoom: 13,
        maxBounds: bhLimits, 
        maxBoundsViscosity: 1.0, 
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        dragging: true,
        touchZoom: true,
    }).setView(bhCenter, 13);

    // Adição de camada de tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 10
    }).addTo(map);

    // Adicão de retângulo para mostrar os limites da cidade
    L.rectangle(bhLimits, { 
        color: '#ce2828',
        weight: 2,
        fillColor: 'transparent',
        fillOpacity: 0,
        dashArray: '5, 5'
    }).addTo(map);
}
initMap();