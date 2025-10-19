let map;
let marker;
let selectedLocation = null;

// Variável do centro do mapa
const bhCenter = [-19.9167, -43.9345];

// Define os limites geográficos aproximados de Belo Horizonte
const bhBounds = L.latLngBounds(
    [-19.98, -44.10], // Sudoeste
    [-19.75, -43.80] // Nordeste
);

// Função de inicialização do mapa usando o Leaflet
function initMap() {
    // Criação do mapa usando o Leaflet 
    map = L.map('map', {
        center: bhCenter,
        zoom: 13,
        maxBounds: bhBounds,
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
    L.rectangle(bhBounds, {
        color: '#ce2828',
        weight: 2,
        fillColor: 'transparent',
        fillOpacity: 0,
        dashArray: '5, 5'
    }).addTo(map);


    // Adicionar evento de clique no mapa
    map.on('click', function (e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        // Verificar se o clique está dentro dos limites de BH
        if (bhBounds.contains([lat, lng])) {
            // Remover marcador anterior se existir
            if (marker) {
                map.removeLayer(marker);
            }

            // Criar novo marcador
            marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: `
                <div style="
                  background-color: #ce2828;
                  width: 30px;
                  height: 30px;
                  border-radius: 50%;
                  border: 2px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: 16px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">!</div>
              `,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                })
            }).addTo(map);

            selectedLocation = { lat: lat, lng: lng };
        } else {
            alert('Por favor, selecione uma localização dentro dos limites de Belo Horizonte.');
        }
    });
}
initMap();
