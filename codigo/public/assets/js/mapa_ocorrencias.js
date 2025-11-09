let map;
let bhBounds;
let todasDenuncias = []; 
let markers = L.markerClusterGroup();
let heatmapLayer = null; 
let currentFilters = { status: 'all', tipo: 'all', codigoOcorrencia: '' }; 
let selectedDenunciaId = null; 
let currentView = 'markers'; 

const API_BASE_URL = 'http://localhost:3000';
const DENUNCIAS_ENDPOINT = `${API_BASE_URL}/denuncias`;

function initMap() {
    bhBounds = L.latLngBounds(
        [-19.98, -44.10], // Sudoeste
        [-19.75, -43.80]  // Nordeste
    );

    map = L.map('map', {
        center: [-19.9167, -43.9345], // Centro de BH
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
    }).setView([-19.9167, -43.9345], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 10
    }).addTo(map);

    markers.addTo(map); // Adiciona o layer de agrupamento ao mapa
}

async function carregarDenuncias() {
    try {
        const response = await fetch(DENUNCIAS_ENDPOINT);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        
        todasDenuncias = await response.json();
        console.log("Denúncias carregadas para o mapa:", todasDenuncias);

        updateDashboardStats(todasDenuncias); 
        aplicarFiltros(); 

    } catch (error) {
        console.error("❌ Erro ao carregar denúncias para o mapa:", error);
        alert(`Falha ao carregar as denúncias para o mapa. Verifique se o json-server está rodando. Erro: ${error.message}`);
    }
}

function updateDashboardStats(denuncias) {
    document.getElementById('stat-total').textContent = denuncias.length;
    document.getElementById('stat-pendente').textContent = denuncias.filter(d => d.statusAtual === 'Pendente').length;
    document.getElementById('stat-em-andamento').textContent = denuncias.filter(d => d.statusAtual === 'Em Andamento').length;
    document.getElementById('stat-concluido').textContent = denuncias.filter(d => d.statusAtual === 'Concluido').length;
}

function aplicarFiltros() {
    let denunciasFiltradas = todasDenuncias;

    // Filtra por status
    if (currentFilters.status !== 'all') {
        denunciasFiltradas = denunciasFiltradas.filter(d => d.statusAtual === currentFilters.status);
    }

    // Filtra por tipo de problema 
    if (currentFilters.tipo !== 'all') {
        denunciasFiltradas = denunciasFiltradas.filter(d => d.tipoProblema.toLowerCase().includes(currentFilters.tipo.toLowerCase()));
    }

    // Filtra por Código de Ocorrência 
    if (currentFilters.codigoOcorrencia) {
        const searchTerm = currentFilters.codigoOcorrencia.toUpperCase(); 
        denunciasFiltradas = denunciasFiltradas.filter(d => 
            d.codigoOcorrencia && d.codigoOcorrencia.toUpperCase().includes(searchTerm)
        );
    }

    renderizarCamadaDoMapa(denunciasFiltradas);
}

// Função para renderizar a camada correta 
function renderizarCamadaDoMapa(denunciasParaExibir) {
    if (map.hasLayer(markers)) {
        map.removeLayer(markers);
    }
    if (heatmapLayer && map.hasLayer(heatmapLayer)) {
        map.removeLayer(heatmapLayer);
    }

    if (currentView === 'markers') {
        markers.clearLayers();
        const latLngs = []; 

        denunciasParaExibir.forEach(denuncia => {
            if (denuncia.endereco && denuncia.endereco.latitude && denuncia.endereco.longitude) {
                const lat = denuncia.endereco.latitude;
                const lng = denuncia.endereco.longitude;
                latLngs.push([lat, lng]); 

                const customIcon = L.divIcon({
                    className: `custom-div-icon ${getMarkerClassByStatus(denuncia.statusAtual)}`,
                    html: `<div class="marker-pin"></div><i class="bi ${getIconClassByTipo(denuncia.tipoProblema)}"></i>`,
                    iconSize: [30, 42],
                    iconAnchor: [15, 42]
                });

                const marker = L.marker([lat, lng], { icon: customIcon });

                const popupContent = `
                    <div class="popup-info">
                        <h5 class="text-truncate" style="max-width: 250px;">${denuncia.titulo}</h5>
                        <p class="mb-1"><strong>Código:</strong> ${denuncia.codigoOcorrencia || 'N/A'}</p> 
                        <p class="mb-1"><strong>Tipo:</strong> ${denuncia.tipoProblema}</p>
                        <p class="mb-1"><strong>Status:</strong> <span class="badge ${getBadgeClassByStatus(denuncia.statusAtual)}">${denuncia.statusAtual}</span></p>
                        <p class="mb-1"><strong>Endereço:</strong> ${denuncia.endereco.rua || 'Não informado'}</p>
                        <p class="mb-2 small text-muted">Registro: ${formatarData(denuncia.dataRegistro)}</p>
                        <button class="btn btn-sm btn-info ver-detalhes-btn" data-id="${denuncia.id}">Ver Detalhes</button>
                    </div>
                `;
                marker.bindPopup(popupContent);
                markers.addLayer(marker);
                
                marker.on('popupopen', function (e) {
                    const button = e.popup.getElement().querySelector('.ver-detalhes-btn');
                    if (button) {
                        button.removeEventListener('click', handleVerDetalhesClick); 
                        button.addEventListener('click', () => handleVerDetalhesClick(denuncia.id));
                    }
                });
            } else {
                console.warn(`Denúncia com ID ${denuncia.id} não possui coordenadas válidas.`);
            }
        });
        map.addLayer(markers); // Adiciona a camada de marcadores 

        // Lógica de zoom 
        if (latLngs.length > 0) {
            const bounds = L.latLngBounds(latLngs);
            if (latLngs.length === 1) {
                // Se houver apenas um marcador, centraliza nele com um zoom específico
                map.setView(bounds.getCenter(), 16); // Zoom mais fechado para um único ponto
            } else {
                // Se houver múltiplos marcadores, ajusta os limites
                map.fitBounds(bounds, {
                    padding: [50, 50], 
                    maxZoom: 15 
                });
            }
        } else {
            map.setView([-19.9167, -43.9345], 13);
        }

    } else if (currentView === 'heatmap') {
        const heatData = denunciasParaExibir
            .filter(d => d.endereco && d.endereco.latitude && d.endereco.longitude)
            .map(d => [d.endereco.latitude, d.endereco.longitude, getHeatIntensity(d.statusAtual)]); 

        if (heatmapLayer) { 
            heatmapLayer.setLatLngs(heatData);
        } else {
            heatmapLayer = L.heatLayer(heatData, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: {0.0: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red'}
            });
            map.addLayer(heatmapLayer); 
        }
        
        // Lógica de zoom para heatmap 
        if (heatData.length > 0) {
            const bounds = L.latLngBounds(heatData.map(d => [d[0], d[1]]));
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 14 
            });
        } else {
             map.setView([-19.9167, -43.9345], 13);
        }
    }
}


function getHeatIntensity(status) {
    switch (status) {
        case "Pendente": return 1.0; 
        case "Em Andamento": return 0.7;
        case "Concluido": return 0.3; 
        case "Cancelado": return 0.1; 
        default: return 0.5;
    }
}



function getMarkerClassByStatus(status) {
    const statusNormalized = status.toLowerCase().replace(/\s/g, '-').replace(/ã/g, 'a').replace(/é/g, 'e');
    switch (statusNormalized) {
        case "pendente": return "marker-pending";
        case "em-andamento": return "marker-in-progress";
        case "concluido": return "marker-completed";
        case "cancelado": return "marker-rejected";
        default: return "marker-default";
    }
}

function getBadgeClassByStatus(status) {
    const statusNormalized = status.toLowerCase().replace(/\s/g, '-').replace(/ã/g, 'a').replace(/é/g, 'e');
    switch (statusNormalized) {
        case "pendente": return "bg-warning text-dark"; // Amarelo para pendente
        case "em-andamento": return "bg-info"; // Azul claro para em andamento
        case "concluido": return "bg-success"; // Verde para concluído
        case "cancelado": return "bg-danger"; // Vermelho para cancelado
        default: return "bg-secondary"; // Cinza padrão
    }
}

// Helper para ícones dos tipos de problema 
function getIconClassByTipo(tipoProblema) {
    const tipoNormalized = tipoProblema.toLowerCase();
    if (tipoNormalized.includes("infraestrutura")) return "bi-tools";
    if (tipoNormalized.includes("iluminacao")) return "bi-lightbulb-fill";
    if (tipoNormalized.includes("limpeza")) return "bi-trash-fill";
    if (tipoNormalized.includes("transito")) return "bi-traffic-light-fill";
    if (tipoNormalized.includes("seguranca")) return "bi-shield-fill-exclamation";
    return "bi-info-circle-fill";
}

function ativarListenersFiltros() {
    const filterStatus = document.getElementById('filter-status');
    const filterTipo = document.getElementById('filter-tipo');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    // Campo de busca por Código de Ocorrência
    const searchCodigoOcorrenciaInput = document.getElementById('search-codigo-ocorrencia-input'); 
    const mapViewSelector = document.getElementById('map-view-selector'); 

    filterStatus.addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        aplicarFiltros();
    });

    filterTipo.addEventListener('change', (e) => {
        currentFilters.tipo = e.target.value;
        aplicarFiltros();
    });

    // Listener para a busca por Código de Ocorrência
    searchCodigoOcorrenciaInput.addEventListener('input', (e) => {
        currentFilters.codigoOcorrencia = e.target.value.trim();
        aplicarFiltros();
    });

    resetFiltersBtn.addEventListener('click', () => {
        // Reset do filtro de Código de Ocorrência
        currentFilters = { status: 'all', tipo: 'all', codigoOcorrencia: '' }; 
        filterStatus.value = 'all';
        filterTipo.value = 'all';
        searchCodigoOcorrenciaInput.value = ''; // Limpa o campo de busca
        aplicarFiltros();
    });

    //  Listener para o seletor de visualização do mapa
    mapViewSelector.addEventListener('change', (e) => {
        currentView = e.target.value;
        aplicarFiltros(); 
    });
}

// Handler para o clique no botão "Ver Detalhes"
function handleVerDetalhesClick(denunciaId) {
    // Fecha qualquer popup aberto
    map.closePopup(); 
    // Abre a sidebar com os detalhes da denúncia
    openSidebar(denunciaId);
}


function openSidebar(denunciaId = null) { 
    selectedDenunciaId = denunciaId;
    const initialContent = document.getElementById('initial-sidebar-content');
    const detailsContent = document.getElementById('denuncia-details-content');
    const sidebarTitleElement = document.getElementById('sidebar-title'); 


    if (denunciaId) {
        initialContent.style.display = 'none';
        detailsContent.style.display = 'block';
        sidebarTitleElement.textContent = 'Detalhes da Denúncia'; 
        populateSidebar(denunciaId);
    } else {
        initialContent.style.display = 'block';
        detailsContent.style.display = 'none';
        sidebarTitleElement.textContent = 'Aguardando Seleção'; 
    }
}

function closeSidebar() {
    selectedDenunciaId = null; 
    const initialContent = document.getElementById('initial-sidebar-content');
    const detailsContent = document.getElementById('denuncia-details-content');
    const sidebarTitleElement = document.getElementById('sidebar-title'); 
    initialContent.style.display = 'block'; 
    detailsContent.style.display = 'none';
    sidebarTitleElement.textContent = 'Aguardando Seleção'; 
}

function populateSidebar(denunciaId) {
    const denuncia = todasDenuncias.find(d => d.id === denunciaId);
    if (!denuncia) {
        console.error("Denúncia não encontrada:", denunciaId);
        openSidebar(null); 
        return;
    }

    document.getElementById('detail-titulo').textContent = denuncia.titulo;
    document.getElementById('detail-id').textContent = denuncia.codigoOcorrencia || 'N/A'; 
    document.getElementById('detail-tipo').textContent = denuncia.tipoProblema;

    const statusBadge = document.getElementById('detail-status');
    statusBadge.textContent = denuncia.statusAtual;
    statusBadge.className = `badge ${getBadgeClassByStatus(denuncia.statusAtual)}`;

    document.getElementById('detail-endereco').textContent = 
        `${denuncia.endereco.rua || 'Não informado'}, ${denuncia.endereco.numero || ''} - ${denuncia.endereco.bairro || 'Não informado'}, ${denuncia.endereco.cidade || 'Não informado'} - ${denuncia.endereco.estado || ''}`;
    document.getElementById('detail-descricao').textContent = denuncia.descricaoCompleta || 'Nenhuma descrição completa fornecida.'; 
    document.getElementById('detail-observacoes-cidadao').textContent = denuncia.informacoesAdicionaisCidadao || 'Nenhuma.';
    document.getElementById('detail-data-registro').textContent = formatarData(denuncia.dataRegistro);
    document.getElementById('detail-autor').textContent = denuncia.autorCidadao + (denuncia.isAnonimo ? ' (Anônimo)' : '');
    document.getElementById('detail-contato').textContent = denuncia.contatoCidadao || 'Não informado.';
    
    const notificacoesSpan = document.getElementById('detail-recebe-notificacoes');
    if (notificacoesSpan) { 
        notificacoesSpan.textContent = denuncia.recebeNotificacoes ? 'Sim' : 'Não';
    }

    document.getElementById('detail-prioridade-cidadao').textContent = denuncia.prioridadeCidadao || 'Não informada.'; 
    document.getElementById('detail-urgencia-cidadao').textContent = denuncia.urgenciaCidadao || 'Não informada.'; 
    document.getElementById('detail-impacto').textContent = denuncia.impactoComunidade || 'Não informado.'; 

    const imagensContainer = document.getElementById('detail-imagens');
    imagensContainer.innerHTML = '';
    if (denuncia.imagens && denuncia.imagens.length > 0) {
        denuncia.imagens.forEach(imgSrc => {
            const col = document.createElement('div');
            col.className = 'col-6';
            const finalImgSrc = imgSrc && imgSrc !== '' ? imgSrc : 'https://via.placeholder.com/150?text=Sem+Imagem'; 
            col.innerHTML = `<img src="${finalImgSrc}" alt="Imagem da Denúncia" class="img-fluid rounded shadow-sm" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#imageModal">`;
            imagensContainer.appendChild(col);
        });
    } else {
        imagensContainer.innerHTML = '<div class="col-12 text-muted small">Nenhuma imagem disponível.</div>';
    }
}

// Helper para formatar a data
function formatarData(dataISO) {
    try {
        const data = new Date(dataISO);
        if (isNaN(data.getTime())) {
            return "Data inválida";
        }
        return data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return "Data inválida";
    }
}

// Orquestração da inicialização
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    carregarDenuncias();
    ativarListenersFiltros();
    // Ao carregar a página, a sidebar deve mostrar o conteúdo inicial
    openSidebar(null); 
});