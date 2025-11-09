let map;
let marker;
let selectedLocation = null;
let imageInput = null;
let selectedFilesList = []; 
let selectedFileDataUrls = []; 
let currentUser = null; 

// --- CONFIGURAÇÃO DA API ---
const API_BASE_URL = 'http://localhost:3000'; 
const DENUNCIAS_ENDPOINT = `${API_BASE_URL}/denuncias`;
const CIDADAOS_ENDPOINT = `${API_BASE_URL}/cidadaos`; 

// Função para carregar dados do usuário do json-server
async function loadUserData() {
    try {
        const response = await fetch(CIDADAOS_ENDPOINT);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            currentUser = data[0]; 
            console.log("Usuário carregado com sucesso:", currentUser.nomeCompleto);

            const nomeUsuarioNav = document.getElementById('nomeUsuarioNav');
            if (nomeUsuarioNav) {
                nomeUsuarioNav.textContent = `Olá, ${currentUser.nomeCompleto.split(' ')[0]}`;
            }
        } else {
            console.error("Nenhum cidadão encontrado no json-server. Defininindo usuário de fallback.");
            currentUser = { nomeCompleto: "Usuário de Teste (Fallback)" };
        }
        
    } catch (error) {
        console.error("Erro ao carregar dados do usuário do json-server:", error);
        currentUser = { nomeCompleto: "Usuário de Teste (Fallback)" };
    }
}

// Variável do centro do mapa
const bhCenter = [-19.9167, -43.9345];

// Define os limites geográficos aproximados de Belo Horizonte
const bhBounds = L.latLngBounds(
    [-19.98, -44.10], // Sudoeste
    [-19.75, -43.80]  // Nordeste
);

// Função de inicialização do mapa usando o Leaflet
function initMap() {
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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 10
    }).addTo(map);

    L.rectangle(bhBounds, {
        color: '#ce2828',
        weight: 2,
        fillColor: 'transparent',
        fillOpacity: 0,
        dashArray: '5, 5'
    }).addTo(map);

    map.on('click', function (e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        if (bhBounds.contains([lat, lng])) {
            if (marker) {
                map.removeLayer(marker);
            }
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
            updateAdress(lat, lng);
        } else {
            alert('Por favor, selecione uma localização dentro dos limites de Belo Horizonte.');
        }
    });
}

function updateAdress(lat, lng) {
    console.log(`Coordenadas selecionadas: ${lat}, ${lng}`);
    const enderecoField = document.querySelector("#endereco");
    enderecoField.value = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
}

function searchAdress() {
    const enderecoField = document.querySelector("#endereco");
    const endereco = enderecoField.value.trim();

    if (!endereco) {
        alert('Por favor, digite um endereço para buscar.');
        return;
    }

    let enderecoCompleto = endereco;
    if (!endereco.toLowerCase().includes('belo horizonte') && !endereco.toLowerCase().includes('bh')) {
        enderecoCompleto = endereco + ', Belo Horizonte, MG, Brasil';
    }

    const buscarBtn = document.querySelector('#buscar-btn');
    const originalText = buscarBtn.innerHTML;

    buscarBtn.innerHTML = '⏳ Buscando...';
    buscarBtn.disabled = true;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoCompleto)}&limit=1&countrycodes=br`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const resultado = data[0];
                const lat = parseFloat(resultado.lat);
                const lng = parseFloat(resultado.lon);

                if (bhBounds.contains([lat, lng])) {
                    map.setView([lat, lng], 16);
                    enderecoField.value = resultado.display_name || endereco;

                    if (marker) {
                        map.removeLayer(marker);
                    }
                    marker = L.marker([lat, lng]).addTo(map);

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

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                const currentLatLng = L.latLng(lat, lng);

                if (bhBounds.contains(currentLatLng)) {
                    map.setView([lat, lng], 15);

                    if (marker) {
                        map.removeLayer(marker);
                    }

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

function resetMap() {
    map.setView(bhCenter, 13);

    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }

    selectedLocation = null;
    document.querySelector("#endereco").value = '';
}

// FUNÇÕES DE GERENCIAMENTO DE IMAGEM 

function renderPreview() {
    const previewContainer = document.getElementById('imagePreview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

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

async function previewImages(input) {
    imageInput = input || document.querySelector("#imagens");
    if (!imageInput || !imageInput.files) return;

    const maxFiles = 5;
    
    const newFilesToAdd = Array.from(input.files).filter(f => f && f.type && f.type.startsWith('image/'));
    
    imageInput.value = ''; 

    for (let i = 0; i < newFilesToAdd.length && selectedFilesList.length < maxFiles; i++) {
        selectedFilesList.push(newFilesToAdd[i]);
    }
    
    // Converte SOMENTE para Data URLs para a pré-visualização.
    const dataUrlPromises = selectedFilesList.map(file => readFileAsDataURL(file));
    const loadedDataUrls = await Promise.all(dataUrlPromises);
    
    selectedFileDataUrls = loadedDataUrls.filter(url => url !== null);

    renderPreview();
}

function removeImage(index){
    selectedFilesList = selectedFilesList.filter((_, i) => i !== index);
    selectedFileDataUrls = selectedFileDataUrls.filter((_, i) => i !== index);

    renderPreview();
}

// FUNÇÃO DE ENVIO DO FORMULÁRIO 

async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedLocation) {
        alert("Por favor, selecione a localização exata do problema no mapa antes de enviar.");
        return;
    }

    const isAnonimo = document.getElementById('anonimo').checked;
    const nomeReal = currentUser?.nomeCompleto || 'Usuário Desconhecido';
    const autorCidadao = isAnonimo ? 'Anônimo' : nomeReal;
    const recebeNotificacoes = document.getElementById('notificacoes').checked;


    const uploadedImageUrls = selectedFilesList.map((file, index) => {
        const fileName = file.name.split('.').pop(); 
        return `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/400/300.${fileName}`; 
    });

    const reportData = {
        titulo: document.getElementById('titulo').value,
        tipoProblema: document.getElementById('categoria').value,
        descricaoCompleta: document.getElementById('descricao').value,
        informacoesAdicionaisCidadao: document.getElementById('observacoes').value,
        
        endereco: {
            rua: document.getElementById('endereco').value, 
            numero: '', 
            bairro: '',
            cidade: 'Belo Horizonte', 
            estado: 'MG', 
            cep: '',
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng
        },
        imagens: uploadedImageUrls, 
        prioridadeCidadao: document.getElementById('prioridade').value,
        urgenciaCidadao: document.getElementById('urgencia').value,
        impactoComunidade: document.getElementById('impacto').value,
        dataRegistro: new Date().toISOString(),
        autorCidadao: autorCidadao,
        isAnonimo: isAnonimo,
        statusAtual: 'Pendente', 
        dataUltimaAtualizacaoStatus: new Date().toISOString(),
        prioridadeInterna: null,
        observacoesInternasServidor: '',
        servidorResponsavelId: null,
        
        contatoCidadao: document.getElementById('contato').value,
        recebeNotificacoes: recebeNotificacoes
    };

    console.log("Dados do relatório para envio (com URLs de imagens):", reportData);

    try {
        const response = await fetch(DENUNCIAS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro ao enviar relatório: ${response.status} - ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        console.log("Relato enviado com sucesso para o json-server:", result);
        alert("Relato enviado com sucesso, obrigado por denunciar!");
        
        document.getElementById('reportForm').reset();
        resetMap(); 
        
        selectedFilesList = [];
        selectedFileDataUrls = []; 
        renderPreview();

    } catch (error) {
        console.error("Erro ao enviar relatório:", error);
        alert("Ocorreu um erro ao enviar o relatório. Por favor, tente novamente.");
    }
}

// ORQUESTRAÇÃO DE INICIALIZAÇÃO

async function initializeApp() {
    await loadUserData(); 
    initMap();

    const form = document.getElementById('reportForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    const fileInput = document.querySelector("#imagens");
    if (fileInput) {
        fileInput.addEventListener('change', (e) => previewImages(e.target));
    }

    const nomeUsuarioNav = document.querySelector('.navbar-user .name-user');
    if (nomeUsuarioNav && !nomeUsuarioNav.id) {
        nomeUsuarioNav.id = 'nomeUsuarioNav';
    }
}
initializeApp();