// Renders the Occurrence Map on the dashboard using Leaflet and JSON Server data
(function () {
  const MAP_ID = 'occurrence-map-canvas';
  const container = document.getElementById(MAP_ID);
  if (!container) return;

  // Helper to get current logged user from sessionStorage (set by login.js)
  function getUsuarioCorrente() {
    try {
      const raw = sessionStorage.getItem('usuarioCorrente');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao carregar ' + url);
    return res.json();
  }

  async function init() {
    // Create map centered on BH as default
    const map = L.map(MAP_ID);
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Default view if we don't know user/city yet
    map.setView([-19.9191, -43.9386], 12);

    const user = getUsuarioCorrente();
    if (!user) {
      // Anonymous: just show BH area, try to load some occurrences city 1 if available
      try {
        const ocorrencias = await fetchJson('/ocorrencias?cidadeId=1');
        addMarkers(map, ocorrencias);
      } catch (e) {
        console.warn(e);
      }
      return;
    }

    // Ensure we have fresh user data (in case session has minimal fields)
    const usuario = await fetchJson(`/usuarios/${user.id}`);
    const { cidadeId, bairroId } = usuario;

    // Load neighborhood to draw circle and recenter
    const bairro = await fetchJson(`/bairros/${bairroId}`);
    const cidade = await fetchJson(`/cidades/${cidadeId}`);

    // City-wide occurrences
    const ocorrencias = await fetchJson(`/ocorrencias?cidadeId=${cidadeId}`);

    // Fit map to either bairro circle or city center
    const center = [bairro.lat, bairro.lng];
    const circle = L.circle(center, { radius: bairro.raio || 800, color: '#0d6efd', fillColor: '#0d6efd', fillOpacity: 0.08 });
    circle.addTo(map);
    map.setView(center, 14);

    addMarkers(map, ocorrencias);
  }

  function addMarkers(map, ocorrencias) {
    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      shadowSize: [41, 41]
    });

    ocorrencias.forEach(o => {
      if (typeof o.lat !== 'number' || typeof o.lng !== 'number') return;
      const marker = L.marker([o.lat, o.lng], { icon }).addTo(map);
      const statusBadge = `<span class="badge text-bg-${statusToColor(o.status)}">${o.status}</span>`;
      marker.bindPopup(`
        <div>
          <strong>${escapeHtml(o.titulo || 'Ocorrência')}</strong><br/>
          <small>Tipo: ${escapeHtml(o.tipo || 'n/d')} · ${statusBadge}</small><br/>
          <small>Bairro ID: ${o.bairroId ?? 'n/d'}</small>
        </div>
      `);
    });
  }

  function statusToColor(status) {
    switch (String(status || '').toLowerCase()) {
      case 'aberto': return 'warning';
      case 'em_andamento': return 'info';
      case 'resolvido': return 'success';
      default: return 'secondary';
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  // Run
  if (typeof L !== 'undefined') {
    init().catch(err => console.error('Erro ao inicializar o mapa de ocorrências:', err));
  } else {
    console.error('Leaflet (L) não carregado');
  }
})();
