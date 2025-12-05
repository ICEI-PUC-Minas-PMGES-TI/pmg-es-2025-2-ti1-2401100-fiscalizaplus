// Renders the Occurrence Map on the dashboard using Leaflet and JSON Server data
(function () {
  const MAP_ID = 'occurrence-map-canvas';

  // Configuração do JSON Server (igual ao mapa_ocorrencias.js)
  const API_BASE_URL = 'http://localhost:3000';
  const DENUNCIAS_ENDPOINT = `${API_BASE_URL}/denuncias`;

  let map;
  let todasDenuncias = [];

  // --- Carregamento de Dados do JSON Server ---
  async function carregarDenuncias() {
    try {
      const response = await fetch(DENUNCIAS_ENDPOINT);

      if (!response.ok) {
        throw new Error(`Erro HTTP! Status: ${response.status}`);
      }

      todasDenuncias = await response.json();
      
      // Filtrar apenas ocorrências da última semana
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const denunciasSemanais = todasDenuncias.filter(denuncia => {
        const dataRegistro = new Date(denuncia.dataRegistro || denuncia.createdAt || 0);
        return dataRegistro >= oneWeekAgo;
      });
      
      console.log("Denúncias semanais carregadas:", denunciasSemanais.length, "de", todasDenuncias.length, "total");

      // Renderizar marcadores no mapa
      if (map) {
        renderizarMarcadores(denunciasSemanais);
        console.log("Marcadores semanais renderizados no mapa");
      } else {
        console.error("Mapa não está inicializado");
      }

    } catch (error) {
      console.error("Erro ao carregar denúncias:", error);
      // Em caso de erro, não renderiza nada
    }
  }

  // --- Inicialização do Mapa ---
  function initMap() {
    const container = document.getElementById(MAP_ID);
    if (!container) {
      console.error('Container do mapa não encontrado:', MAP_ID);
      return;
    }

    const bhCenter = [-19.9167, -43.9345];

    try {
      map = L.map(MAP_ID, {
        center: bhCenter,
        zoom: 12,
        minZoom: 10,
        maxZoom: 18,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        dragging: true,
        touchZoom: true,
      }).setView(bhCenter, 12);

      // Camada de tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 10,
        opacity: 1.0
      }).addTo(map);

      L.control.scale().addTo(map);
      
      console.log('Mapa inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar o mapa:', error);
    }
  }

  async function init() {
    initMap();
    
    // Aguardar um pouco para garantir que o mapa foi renderizado
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 300);
    
    await carregarDenuncias();
    
    // Ajustar tamanho novamente após carregar dados
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 500);
  }

  // Funções auxiliares para estilização dos marcadores (igual ao mapa_ocorrencias.js)
  function getMarkerClassByStatus(status) {
    if (!status) return 'marker-default';
    const statusNormalized = String(status).toLowerCase().replace(/\s/g, '-').replace(/ã/g, 'a').replace(/é/g, 'e');
    switch (statusNormalized) {
      case "pendente": return "marker-pending";
      case "em-andamento": return "marker-in-progress";
      case "concluido": case "concluída": case "resolvido": return "marker-completed";
      case "cancelado": return "marker-rejected";
      default: return "marker-default";
    }
  }

  function getBadgeClassByStatus(status) {
    if (!status) return 'bg-primary';
    const statusNormalized = String(status).toLowerCase().replace(/\s/g, '-').replace(/ã/g, 'a').replace(/é/g, 'e');
    switch (statusNormalized) {
      case "pendente": return "bg-danger";
      case "em-andamento": return "bg-warning text-dark";
      case "concluido": case "concluída": case "resolvido": return "bg-success";
      case "cancelado": return "bg-secondary";
      default: return "bg-primary";
    }
  }

  function getIconClassByTipo(tipoProblema) {
    if (!tipoProblema) return "bi-info-circle-fill";
    const tipoNormalized = String(tipoProblema).toLowerCase();
    if (tipoNormalized.includes("infraestrutura")) return "bi-tools";
    if (tipoNormalized.includes("iluminacao") || tipoNormalized.includes("iluminação")) return "bi-lightbulb-fill";
    if (tipoNormalized.includes("limpeza")) return "bi-trash-fill";
    if (tipoNormalized.includes("transito") || tipoNormalized.includes("trânsito")) return "bi-bus-front";
    if (tipoNormalized.includes("seguranca") || tipoNormalized.includes("segurança")) return "bi-shield-fill-exclamation";
    return "bi-info-circle-fill";
  }

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

  // --- Renderização dos Marcadores (igual ao mapa_ocorrencias.js) ---
  let currentMarkers = [];

  function renderizarMarcadores(denunciasParaExibir) {
    if (!map) {
      console.warn('Mapa não inicializado');
      return;
    }

    // Limpar marcadores existentes
    currentMarkers.forEach(marker => {
      map.removeLayer(marker);
    });
    currentMarkers = [];

    const latLngs = [];

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
            <h5 class="text-truncate" style="max-width: 250px;">${escapeHtml(denuncia.titulo || 'Ocorrência')}</h5>
            <p class="mb-1"><strong>Código:</strong> ${escapeHtml(denuncia.codigoOcorrencia || denuncia.id || 'N/A')}</p>
            <p class="mb-1"><strong>Tipo:</strong> ${escapeHtml(denuncia.tipoProblema || 'N/A')}</p>
            <p class="mb-1"><strong>Status:</strong> <span class="badge ${getBadgeClassByStatus(denuncia.statusAtual)}">${escapeHtml(denuncia.statusAtual || 'Pendente')}</span></p>
            <p class="mb-1"><strong>Endereço:</strong> ${escapeHtml(denuncia.endereco?.rua || 'Não informado')}</p>
            <p class="mb-2 small text-muted">Registro: ${formatarData(denuncia.dataRegistro || new Date().toISOString())}</p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        marker.addTo(map);
        currentMarkers.push(marker);
      }
    });

    // Ajustar zoom para mostrar todos os marcadores
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      if (latLngs.length === 1) {
        map.setView(bounds.getCenter(), 16);
      } else {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15
        });
      }
    } else {
      map.setView([-19.9167, -43.9345], 12); // Volta ao centro de BH se não houver denúncias
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  // Run - Aguardar DOM e Leaflet estarem prontos
  function startMap() {
    const container = document.getElementById(MAP_ID);
    if (!container) {
      console.warn('Container do mapa não encontrado:', MAP_ID);
      // Tentar novamente após um delay
      setTimeout(startMap, 200);
      return;
    }

    if (typeof L === 'undefined') {
      console.warn('Leaflet (L) não carregado. Aguardando...');
      // Tentar novamente após um delay
      setTimeout(startMap, 200);
      return;
    }

    console.log('Inicializando mapa...');
    // Aguardar um pouco mais para garantir que tudo está carregado
    setTimeout(() => {
      init().catch(err => console.error('Erro ao inicializar o mapa de ocorrências:', err));
    }, 100);
  }

  // Aguardar DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(startMap, 200);
    });
  } else {
    // DOM já está pronto, aguardar um pouco para garantir que scripts estão carregados
    setTimeout(startMap, 200);
  }
})();
