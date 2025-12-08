let map;
let bhBounds;
let todasDenuncias = [];
let currentMarkers = []; 
let heatmapLayer = null; 
let tileLayer = null;
let currentFilters = { status: 'all', tipo: 'all', codigoOcorrencia: '' };
let selectedDenunciaId = null;
let currentView = 'markers';

const API_BASE_URL = 'http://localhost:3000';
const DENUNCIAS_ENDPOINT = `${API_BASE_URL}/denuncias`;

// Funções Auxiliares de Estilização
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
        case "pendente": return "bg-danger";
        case "em-andamento": return "bg-warning text-dark";
        case "concluido": return "bg-success";
        case "cancelado": return "bg-secondary";
        default: return "bg-primary";
    }
}

function getIconClassByTipo(tipoProblema) {
    const tipoNormalized = tipoProblema.toLowerCase();
    if (tipoNormalized.includes("infraestrutura")) return "bi-tools";
    if (tipoNormalized.includes("iluminacao")) return "bi-lightbulb-fill";
    if (tipoNormalized.includes("limpeza")) return "bi-trash-fill";
    if (tipoNormalized.includes("transito")) return "bi-bus-front";
    if (tipoNormalized.includes("seguranca")) return "bi-shield-fill-exclamation";
    return "bi-info-circle-fill";
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
        console.error("Erro ao formatar data:", e);
        return "Data inválida";
    }
}

// --- Funções Específicas do Mapa de Calor ---
function getHeatIntensity(status) {
    switch (status) {
        case "Pendente": return 1.0; 	// Mais quente (intensidade total para o heatmap)
        case "Em Andamento": return 1.0; // Médio
        case "Concluido": return 1.0; 	// Mais frio
        case "Cancelado": return 0.1; 	// Quase invisível
        default: return 0.5; 			// Default
    }
}

// Função para obter o gradiente dinâmico com base no filtro de status
function getDynamicHeatmapGradient(filterStatus) {
    console.log("Aplicando gradiente para status:", filterStatus);
    switch (filterStatus) {
        case 'Pendente':
            return {
                0.0: 'red', // Vermelho vivo
                0.5: 'red',
                1.0: 'red'
            };
        case 'Em Andamento':
            return {
                0.0: 'yellow', // Amarelo vivo
                0.5: 'yellow',
                1.0: 'yellow'
            };
        case 'Concluido':
            return {
                0.0: 'lime', // Verde vivo
                0.5: 'green',
                1.0: 'darkgreen'
            };
        case 'Cancelado':
            return {
                0.0: 'lightgray', // Tons de cinza para cancelado
                0.5: 'gray',
                1.0: 'darkslategray'
            };
        case 'all': // Gradiente geral para "Todos" os status
        default:
            return {
                0.0: 'green', 	// Baixa intensidade (cancelado, concluído)
                0.3: 'lime', 	// Média intensidade (em andamento)
                0.6: 'yellow', // Intensidade mais alta
                1.0: 'red' 	// Intensidade máxima (pendente)
            };
    }
}

// --- Inicialização do Mapa ---
function initMap() {
  
    bhCenter = [-19.9167, -43.9345];

    map = L.map('map', {
        center: bhCenter, // Centro de BH
        zoom: 12,
        minZoom: 10, // Adicionado para limitar o zoom out
        maxZoom: 18, // Zoom máximo
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        dragging: true,
        touchZoom: true,
    }).setView(bhCenter, 12);

    // Armazenar a camada de tiles na variável global `tileLayer`
    tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 10,
        opacity: 1.0 // Garante que a opacidade inicial seja 1.0
    }).addTo(map);

    L.control.scale().addTo(map); // Adiciona controle de escala
}

// --- Carregamento e Atualização de Dados ---
async function carregarDenuncias() {
    try {
        const response = await fetch(DENUNCIAS_ENDPOINT);

        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }

        todasDenuncias = await response.json();
        console.log("Denúncias carregadas com sucesso:", todasDenuncias);

        // Ordenar denúncias por data (mais recente primeiro)
        todasDenuncias.sort((a, b) => {
            const dataA = new Date(a.dataRegistro || 0);
            const dataB = new Date(b.dataRegistro || 0);
            return dataB - dataA; // Ordem decrescente (mais recente primeiro)
        });

        updateDashboardStats(todasDenuncias);
        aplicarFiltros();

    } catch (error) {
        console.error("Erro ao carregar denúncias:", error);
    }
}

function updateDashboardStats(denuncias) {
    const statTotal = document.getElementById('stat-total');
    if (statTotal) statTotal.textContent = denuncias.length;

    const statPendente = document.getElementById('stat-pendente');
    if (statPendente) statPendente.textContent = denuncias.filter(d => d.statusAtual === 'Pendente').length;

    const statEmAndamento = document.getElementById('stat-em-andamento');
    if (statEmAndamento) statEmAndamento.textContent = denuncias.filter(d => d.statusAtual === 'Em Andamento').length;

    const statConcluido = document.getElementById('stat-concluido');
    if (statConcluido) statConcluido.textContent = denuncias.filter(d => d.statusAtual === 'Concluido').length;
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

    // Ordenar denúncias filtradas por data (mais recente primeiro)
    denunciasFiltradas.sort((a, b) => {
        const dataA = new Date(a.dataRegistro || 0);
        const dataB = new Date(b.dataRegistro || 0);
        return dataB - dataA; // Ordem decrescente (mais recente primeiro)
    });

    renderizarCamadaDoMapa(denunciasFiltradas);
}

// --- Renderização da Camada do Mapa (Marcadores ou Mapa de Calor) ---
function renderizarCamadaDoMapa(denunciasParaExibir) {

    // 1. Limpeza de Camadas existentes
    // Remove todos os marcadores atuais do mapa
    currentMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    currentMarkers = []; 

    if (heatmapLayer && map.hasLayer(heatmapLayer)) {
        map.removeLayer(heatmapLayer);
        heatmapLayer = null;
    }

    if (currentView === 'markers') {
        if (tileLayer) {
            tileLayer.setOpacity(1.0);
        }

        const latLngs = []; // Para coletar todas as coordenadas dos marcadores

        denunciasParaExibir.forEach(denuncia => {
            if (denuncia.endereco && typeof denuncia.endereco.latitude === 'number' && typeof denuncia.endereco.longitude === 'number') {
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
                marker.addTo(map); 
                currentMarkers.push(marker);

                marker.on('popupopen', function (e) {
                    const button = e.popup.getElement().querySelector('.ver-detalhes-btn');
                    if (button) {
                        button.removeEventListener('click', handleVerDetalhesClick); 
                        button.addEventListener('click', () => handleVerDetalhesClick(denuncia.id));
                    }
                });
            } 
        });

        // Lógica de zoom aprimorada para marcadores
        if (latLngs.length > 0) {
            const bounds = L.latLngBounds(latLngs);
            if (latLngs.length === 1) {
                map.setView(bounds.getCenter(), 16);
                console.log("Mapa ajustado para um único marcador.");
            } else {
                map.fitBounds(bounds, {
                    padding: [50, 50],
                    maxZoom: 15
                });
            }
        } else {
            map.setView([-19.9167, -43.9345], 13); // Volta ao centro de BH se não houver denúncias
        }

    } else if (currentView === 'heatmap') {
        if (tileLayer) {
            tileLayer.setOpacity(0.3); 
        }

        const heatData = denunciasParaExibir
            .filter(d => d.endereco && typeof d.endereco.latitude === 'number' && typeof d.endereco.longitude === 'number')
            .map(d => {
                const intensity = getHeatIntensity(d.statusAtual);
                return [d.endereco.latitude, d.endereco.longitude, intensity];
            });

        if (heatData.length === 0) {
            map.setView([-19.9167, -43.9345], 13); // Volta para a visão padrão se não houver dados
            return;
        }

        const dynamicGradient = getDynamicHeatmapGradient(currentFilters.status);

        heatmapLayer = L.heatLayer(heatData, {
            radius: 25, // borda do HeatMap
            blur: 15, 	// blur do HeatMap
            maxZoom: 15, // zoom do HeatMap
            gradient: dynamicGradient,
            minOpacity: 0.3 // Garante que mesmo os pontos de baixa intensidade sejam um pouco visíveis
        }).addTo(map);
        console.log("Camada de mapa de calor adicionada ao mapa com sucesso.");

        // Lógica de zoom para heatmap
        if (heatData.length > 0) {
            const bounds = L.latLngBounds(heatData.map(d => [d[0], d[1]]));
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 12
            });
        } else {
            map.setView([-19.9167, -43.9345], 13); // Volta ao centro de BH se não houver denúncias
            console.log("Nenhum dado para o mapa de calor. Mapa centralizado em BH.");
        }
    }
}

// --- Listeners para Interação do Usuário ---
function ativarListenersFiltros() {
    console.log("Ativando listeners para filtros.");
    const filterStatus = document.getElementById('filter-status');
    const filterTipo = document.getElementById('filter-tipo');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const searchCodigoOcorrenciaInput = document.getElementById('search-codigo-ocorrencia-input');
    const mapViewSelector = document.getElementById('map-view-selector');

    if (filterStatus) {
        filterStatus.addEventListener('change', (e) => {
            currentFilters.status = e.target.value;
            console.log(`Filtro de status alterado para: ${currentFilters.status}`);
            aplicarFiltros();
        });
    }

    if (filterTipo) {
        filterTipo.addEventListener('change', (e) => {
            currentFilters.tipo = e.target.value;
            console.log(`Filtro de tipo alterado para: ${currentFilters.tipo}`);
            aplicarFiltros();
        });
    }

    if (searchCodigoOcorrenciaInput) {
        searchCodigoOcorrenciaInput.addEventListener('input', (e) => {
            currentFilters.codigoOcorrencia = e.target.value.trim();
            console.log(`Busca por código de ocorrência: ${currentFilters.codigoOcorrencia}`);
            aplicarFiltros();
        });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            currentFilters = { status: 'all', tipo: 'all', codigoOcorrencia: '' };
            if (filterStatus) filterStatus.value = 'all';
            if (filterTipo) filterTipo.value = 'all';
            if (searchCodigoOcorrenciaInput) searchCodigoOcorrenciaInput.value = '';
            console.log("Filtros resetados.");
            aplicarFiltros();
        });
    }

    if (mapViewSelector) {
        mapViewSelector.addEventListener('change', (e) => {
            currentView = e.target.value;
            console.log(`Modo de visualização do mapa alterado para: ${currentView}`);
            aplicarFiltros();
        });
    }
}

// Handler para o clique no botão "Ver Detalhes"
function handleVerDetalhesClick(denunciaId) {
    if (map.closePopup) map.closePopup();
    console.log(`Botão "Ver Detalhes" clicado para Denúncia ID: ${denunciaId}`);
    openSidebar(denunciaId); // Abre a sidebar com os detalhes
}

// --- Funções da Sidebar ---
function openSidebar(denunciaId = null) {
    selectedDenunciaId = denunciaId;
    const initialContent = document.getElementById('initial-sidebar-content');
    const detailsContent = document.getElementById('denuncia-details-content');
    const sidebarTitleElement = document.getElementById('sidebar-title');
    const sidebarHeaderElement = document.getElementById('sidebar-header');

    if (initialContent && detailsContent && sidebarTitleElement && sidebarHeaderElement) {
        if (denunciaId) {
            initialContent.style.display = 'none';
            detailsContent.style.display = 'block';
            sidebarTitleElement.textContent = 'Detalhes da Denúncia';
            populateSidebar(denunciaId);
        } else {
            initialContent.style.display = 'block';
            detailsContent.style.display = 'none';
            sidebarTitleElement.textContent = 'Aguardando Seleção';
            sidebarHeaderElement.className = 'card-header bg-primary text-white'; // Default
        }
        console.log(`Sidebar aberta com Denúncia ID: ${denunciaId || 'Nenhuma'}.`);
    } else {
        console.error("Elementos da sidebar não encontrados no DOM.");
    }
}

function closeSidebar() {
    selectedDenunciaId = null;
    const initialContent = document.getElementById('initial-sidebar-content');
    const detailsContent = document.getElementById('denuncia-details-content');
    const sidebarTitleElement = document.getElementById('sidebar-title');
    const sidebarHeaderElement = document.getElementById('sidebar-header');

    if (initialContent && detailsContent && sidebarTitleElement && sidebarHeaderElement) {
        initialContent.style.display = 'block';
        detailsContent.style.display = 'none';
        sidebarTitleElement.textContent = 'Aguardando Seleção';
        sidebarHeaderElement.className = 'card-header bg-primary text-white'; // Volta para a cor padrão
        console.log("Sidebar de detalhes fechada.");
    } else {
        console.error("Elementos da sidebar não encontrados no DOM.");
    }
}

function populateSidebar(denunciaId) {
    const denuncia = todasDenuncias.find(d => d.id === denunciaId);
    if (!denuncia) {
        console.warn(`Denúncia com ID ${denunciaId} não encontrada para popular a sidebar.`);
        openSidebar(null);
        return;
    }
    console.log("Preenchendo sidebar com detalhes da denúncia:", denuncia);

    // Atualiza a cor do cabeçalho da sidebar com base no status da denúncia
    const sidebarHeaderElement = document.getElementById('sidebar-header');
    if (sidebarHeaderElement) {
        sidebarHeaderElement.className = `card-header ${getBadgeClassByStatus(denuncia.statusAtual)} text-white`;
    }

    const detailTitulo = document.getElementById('detail-titulo');
    if (detailTitulo) detailTitulo.textContent = denuncia.titulo;

    const detailId = document.getElementById('detail-id');
    if (detailId) detailId.textContent = denuncia.codigoOcorrencia || 'N/A';

    const detailTipo = document.getElementById('detail-tipo');
    if (detailTipo) detailTipo.textContent = denuncia.tipoProblema;

    const statusBadge = document.getElementById('detail-status');
    if (statusBadge) {
        statusBadge.textContent = denuncia.statusAtual;
        statusBadge.className = `badge ${getBadgeClassByStatus(denuncia.statusAtual)}`;
    }

    const detailEndereco = document.getElementById('detail-endereco');
    if (detailEndereco) detailEndereco.textContent =
        `${denuncia.endereco.rua || 'Não informado'}, ${denuncia.endereco.numero || ''} - ${denuncia.endereco.bairro || 'Não informado'}, ${denuncia.endereco.cidade || 'Não informado'} - ${denuncia.endereco.estado || ''}`;

    const detailDescricao = document.getElementById('detail-descricao');
    if (detailDescricao) detailDescricao.textContent = denuncia.descricaoCompleta || 'Nenhuma descrição completa fornecida.';

    const detailObservacoesCidadao = document.getElementById('detail-observacoes-cidadao');
    if (detailObservacoesCidadao) detailObservacoesCidadao.textContent = denuncia.informacoesAdicionaisCidadao || 'Nenhuma.';

    const detailDataRegistro = document.getElementById('detail-data-registro');
    if (detailDataRegistro) detailDataRegistro.textContent = formatarData(denuncia.dataRegistro);

    const detailAutor = document.getElementById('detail-autor');
    if (detailAutor) detailAutor.textContent = denuncia.autorCidadao + (denuncia.isAnonimo ? ' (Anônimo)' : '');

    const detailContato = document.getElementById('detail-contato');
    if (detailContato) detailContato.textContent = denuncia.contatoCidadao || 'Não informado.';

    const notificacoesSpan = document.getElementById('detail-recebe-notificacoes');
    if (notificacoesSpan) {
        notificacoesSpan.textContent = denuncia.recebeNotificacoes ? 'Sim' : 'Não';
    }

    const detailPrioridadeCidadao = document.getElementById('detail-prioridade-cidadao');
    if (detailPrioridadeCidadao) detailPrioridadeCidadao.textContent = denuncia.prioridadeCidadao || 'Não informada.';

    const detailUrgenciaCidadao = document.getElementById('detail-urgencia-cidadao');
    if (detailUrgenciaCidadao) detailUrgenciaCidadao.textContent = denuncia.urgenciaCidadao || 'Não informada.';

    const detailImpacto = document.getElementById('detail-impacto');
    if (detailImpacto) detailImpacto.textContent = denuncia.impactoComunidade || 'Não informado.';

    const imagensContainer = document.getElementById('detail-imagens');
    if (imagensContainer) {
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
}

// --- Orquestração da Inicialização ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM totalmente carregado. Iniciando script...");
    initMap();
    carregarDenuncias();
    ativarListenersFiltros();
    // Ao carregar a página, a sidebar deve mostrar o conteúdo inicial
    openSidebar(null);
});