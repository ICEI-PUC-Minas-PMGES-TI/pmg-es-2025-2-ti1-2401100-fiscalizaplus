let map;
let marker;
let selectedLocation = null;
let imageInput = null;
let selectedFilesList = [];
let selectedFileDataUrls = [];

// Variável do centro do mapa
const bhCenter = [-19.9167, -43.9345];

// Define os limites geográficos aproximados de Belo Horizonte
const bhBounds = L.latLngBounds(
    [-19.98, -44.10], // Sudoeste
    [-19.75, -43.80]  // Nordeste
);

// Função de inicialização do mapa usando o Leaflet
function initMap() {
    // Criação do mapa e configuração inicial
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

    // Adição de camada de tiles do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 10
    }).addTo(map);

    // Adicão de retângulo de limite visual
    L.rectangle(bhBounds, {
        color: '#ce2828',
        weight: 2,
        fillColor: 'transparent',
        fillOpacity: 0,
        dashArray: '5, 5'
    }).addTo(map);

    // Adicionar evento de clique no mapa para marcar a localização
    map.on('click', function (e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        // Verificar se o clique está dentro dos limites de BH
        if (bhBounds.contains([lat, lng])) {
            // Remove marcador anterior se existir
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

            // Atualiza o campo de endereço com as coordenadas
            updateAdress(lat, lng);
        } else {
            alert('Por favor, selecione uma localização dentro dos limites de Belo Horizonte.');
        }
    });
}


// Função para atualizar o campo de endereço com as coordenadas
function updateAdress(lat, lng) {
    console.log(`Coordenadas selecionadas: ${lat}, ${lng}`);
    const enderecoField = document.querySelector("#endereco");
    enderecoField.value = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
}


// Função para buscar endereço (geocoding) usando Nominatim
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

    // Estado de loading do botão
    buscarBtn.innerHTML = '⏳ Buscando...';
    buscarBtn.disabled = true;

    // Utilização do Nominatim para geolocalização
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoCompleto)}&limit=1&countrycodes=br`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const resultado = data[0];
                const lat = parseFloat(resultado.lat);
                const lng = parseFloat(resultado.lon);

                if (bhBounds.contains([lat, lng])) {
                    // Move o mapa para a localização encontrada
                    map.setView([lat, lng], 16);

                    // Preenche o campo de endereço com o nome completo
                    enderecoField.value = resultado.display_name || endereco;

                    // Remove marcador anterior e adiciona o novo no local da busca
                    if (marker) {
                        map.removeLayer(marker);
                    }
                    marker = L.marker([lat, lng]).addTo(map);

                    // Adiciona popup de confirmação
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

                    // Atualiza a localização selecionada
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
            // Restaura o estado do botão
            buscarBtn.innerHTML = originalText;
            buscarBtn.disabled = false;
        });
}

// Função para usar localização atual do usuário e marcar no mapa
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                const currentLatLng = L.latLng(lat, lng);

                if (bhBounds.contains(currentLatLng)) {
                    // Move o mapa para a localização atual
                    map.setView([lat, lng], 15);

                    // Remove marcador anterior
                    if (marker) {
                        map.removeLayer(marker);
                    }

                    // Cria novo marcador na localização atual
                    marker = L.marker([lat, lng]).addTo(map);

                    selectedLocation = { lat: lat, lng: lng };
                    updateAdress(lat, lng);

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
function resetMap() {
    // Volta para o centro de Belo Horizonte
    map.setView(bhCenter, 13);

    // Remove o marcador e limpa a localização
    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }

    selectedLocation = null;

    // Limpa o campo de endereço
    document.querySelector("#endereco").value = '';
}

// ======================================================================
// FUNÇÕES DE GERENCIAMENTO DE IMAGEM
// ======================================================================

function renderPreview() {
    const previewContainer = document.getElementById('imagePreview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    // Renderiza cada imagem na ordem exata
    selectedFileDataUrls.forEach((dataUrl, index) => {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'image-preview-item';
        imageDiv.innerHTML = `
            <img src="${dataUrl}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" onclick="removeImage(${index})">×</button>
        `;
        previewContainer.appendChild(imageDiv);
    });
}

function readFileAsDataURL(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = function (e) {
            resolve(e.target.result);
        };
        reader.onerror = () => resolve(null); 
        reader.readAsDataURL(file);
    });
}

// Usa async/await para garantir que a leitura de arquivos e a pré-visualização sejam feitas na ordem
async function previewImages(input) {
    imageInput = input || document.querySelector("#imagens");
    if (!imageInput || !imageInput.files) return;

    const maxFiles = 5;
    
    const newFilesToAdd = Array.from(input.files).filter(f => f && f.type && f.type.startsWith('image/'));
    
    imageInput.value = ''; 

    // Acumula os novos arquivos, respeitando o limite
    for (let i = 0; i < newFilesToAdd.length && selectedFilesList.length < maxFiles; i++) {
        selectedFilesList.push(newFilesToAdd[i]);
    }
    
    // Converte todos os arquivos acumulados para Data URLs
    const dataUrlPromises = selectedFilesList.map(file => readFileAsDataURL(file));
    const loadedDataUrls = await Promise.all(dataUrlPromises);
    
    selectedFileDataUrls = loadedDataUrls.filter(url => url !== null);

    renderPreview();
}

function removeImage(index){
    // Remove o item da lista de arquivos e da lista de Data URLs
    selectedFilesList = selectedFilesList.filter((_, i) => i !== index);
    selectedFileDataUrls = selectedFileDataUrls.filter((_, i) => i !== index);

    renderPreview();
}

// ======================================================================
// FUNÇÃO DE SUBMISSÃO E ARMAZENAMENTO LOCAL
// ======================================================================

const STORAGE_KEY = 'relatosFiscalizaPlus';

function handleSubmit(event) {
    event.preventDefault();

    // Validação de localização
    if (!selectedLocation) {
        alert("Por favor, selecione a localização exata do problema no mapa antes de enviar.");
        return;
    }
}


// Inicializa o mapa ao carregar o script
initMap();

// Anexa os listeners
const form = document.getElementById('reportForm');
if (form) {
    form.addEventListener('submit', handleSubmit);
}

const fileInput = document.querySelector("#imagens");
if (fileInput) {
    fileInput.addEventListener('change', (e) => previewImages(e.target));
}