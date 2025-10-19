let map;
let marker;
let selectedLocation = null;

// Variável do centro do mapa
const bhCenter = [-19.9167, -43.9345];

// Define os limites geográficos aproximados de Belo Horizonte (Bounds é o Leaflet LatLngBounds)
const bhBounds = L.latLngBounds(
    [-19.98, -44.10], // Sudoeste (Lat menor, Lng menor)
    [-19.75, -43.80]  // Nordeste (Lat maior, Lng maior)
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

            // Criar novo marcador customizado
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

            // Atualizar campos de endereço com as coordenadas
            updateAdress(lat, lng);
        } else {
            alert('Por favor, selecione uma localização dentro dos limites de Belo Horizonte.');
        }
    });
}


// Função para atualizar o campo de endereço (chamada após um clique no mapa)
function updateAdress(lat, lng) {
    console.log(`Coordenadas selecionadas: ${lat}, ${lng}`);
    const enderecoField = document.querySelector("#endereco");
    enderecoField.value = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
}


// Função para buscar endereço (chamada pelo botão "Buscar")
function searchAdress() {
    const enderecoField = document.querySelector("#endereco");
    const endereco = enderecoField.value.trim();

    if (!endereco) {
        alert('Por favor, digite um endereço para buscar.');
        return;
    }

    // Adiciona Belo Horizonte ao final do endereço se não estiver presente
    let enderecoCompleto = endereco;
    if (!endereco.toLowerCase().includes('belo horizonte') && !endereco.toLowerCase().includes('bh')) {
        enderecoCompleto = endereco + ', Belo Horizonte, MG, Brasil';
    }

    const buscarBtn = document.querySelector('#buscar-btn');
    const originalText = buscarBtn.innerHTML;

    // Mostrar loading
    buscarBtn.innerHTML = '⏳ Buscando...';
    buscarBtn.disabled = true;

    // Utilização do Nominatim (OpenStreetMap) para geolocalização
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoCompleto)}&limit=1&countrycodes=br`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const resultado = data[0];
                const lat = parseFloat(resultado.lat);
                const lng = parseFloat(resultado.lon);

                if (bhBounds.contains([lat, lng])) {
                    // Mover o mapa para a localização encontrada
                    map.setView([lat, lng], 16);

                    // Preencher o campo de endereço com o nome completo
                    enderecoField.value = resultado.display_name || endereco;

                    // Remover marcador anterior e adicionar o novo no local da busca
                    if (marker) {
                        map.removeLayer(marker);
                    }
                    marker = L.marker([lat, lng]).addTo(map);

                    //Adiciona popup de confirmação
                    L.popup()
                        .setLatLng([lat, lng])
                        .setContent(`
                            <div style="text-align: center; padding: 10px;">
                                <h4 style="margin: 0 0 10px 0; color: #ce2828;">📍 Endereço Encontrado</h4>
                                <p style="margin: 0; font-size: 14px;">${resultado.display_name}</p>
                                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Clique no mapa para marcar a localização exata</p>
                            </div>
                        `)
                        .openOn(map);

                    // Se a busca foi bem-sucedida, atualize a localização selecionada
                    selectedLocation = { lat: lat, lng: lng };

                } else {
                    alert('O endereço encontrado está fora dos limites de Belo Horizonte. Por favor, tente um endereço dentro da cidade.');
                }
            } else {
                alert('Endereço não encontrado. Verifique se o endereço está correto e dentro de Belo Horizonte.');
            }
        })
        .catch(error => {
            console.error('Erro na busca:', error);
            alert('Erro ao buscar o endereço. Tente novamente.');
        })
        .finally(() => {
            buscarBtn.innerHTML = originalText;
            buscarBtn.disabled = false;
        });
}
// Inicializa o mapa ao carregar o script
initMap();

// Função para usar localização atual do usuário e marcar no mapa

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Verificar se a localização está dentro dos limites de BH
                const bhBounds = L.latLngBounds(
                    [-19.98, -44.10],
                    [-19.75, -43.80] 
                );

                if (bhBounds.contains([lat, lng])) {
                    // Mover o mapa para a localização atual
                    map.setView([lat, lng], 15);

                    // Remover marcador anterior se existir
                    if (marker) {
                        map.removeLayer(marker);
                    }

                    // Criar novo marcador na localização atual
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
                    updateAddressFromCoordinates(lat, lng);

                    alert('Localização atual encontrada em Belo Horizonte!');
                } else {
                    alert('Sua localização atual está fora dos limites de Belo Horizonte. Por favor, selecione uma localização dentro da cidade.');
                }
            },
            function (error) {
                alert('Erro ao obter localização: ' + error.message);
            }
        );
    } else {
        alert('Geolocalização não é suportada por este navegador.');
    }
}

// Função para resetar o mapa

function resetMap(){
    //Voltar para o centro de Belo Horizonte
    const bhCenter = [-19.9167, -43.9345];
    map.setView(bhCenter,13);

    // Remover o marcador
    if (marker){
        map.removeLayer(marker);
        marker = null;
    }

    selectedLocation = null;

    // Limpar o campo de endereço
    document.querySelector("#endereco"). value = '';
}