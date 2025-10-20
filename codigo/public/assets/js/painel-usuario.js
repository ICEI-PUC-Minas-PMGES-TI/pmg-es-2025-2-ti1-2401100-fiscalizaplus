(function () {
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



  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return 'Data inválida';
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'aberto': return 'Aberto';
      case 'em_andamento': return 'Em andamento';
      case 'resolvido': return 'Resolvido';
      default: return 'Indefinido';
    }
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d)) return '';
      return d.toLocaleString();
    } catch { return ''; }
  }

  function statusBadge(status) {
    const color = (() => {
      switch (String(status || '').toLowerCase()) {
        case 'aberto': return 'warning';
        case 'em_andamento': return 'info';
        case 'resolvido': return 'success';
        default: return 'secondary';
      }
    })();
    return `<span class="badge text-bg-${color}">${status || 'n/d'}</span>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  // Function to populate recent reports
  async function populateRecentReports() {
    try {
      const user = getUsuarioCorrente();
      if (!user) return;
      
      const usuario = await fetchJson(`/usuarios/${user.id}`);
      
      // Buscar bairros para obter os nomes
      const bairros = await fetchJson('/bairros');
      const bairrosMap = {};
      bairros.forEach(b => {
        bairrosMap[b.id] = b.nome;
      });
      
      // Recentes na cidade
      const recentes = await fetchJson(`/ocorrencias?cidadeId=${usuario.cidadeId}&_sort=createdAt&_order=desc&_limit=5`);
      const ul = document.getElementById('recent-reports-list');
      if (ul) {
        if (recentes.length === 0) {
          ul.innerHTML = '<li class="list-group-item">Nenhum relatório encontrado na sua cidade.</li>';
          return;
        }
        
        ul.innerHTML = '';
        recentes.forEach((o, index) => {
          const li = document.createElement('li');
          li.className = 'list-group-item d-flex justify-content-between align-items-start';
          li.innerHTML = `
            <div class="flex-grow-1">
              <div><strong>${escapeHtml(o.titulo)}</strong> ${statusBadge(o.status)}</div>
              <div class="text-muted small">${escapeHtml(o.tipo || 'n/d')} · ${fmtDate(o.createdAt)}</div>
              <div class="text-muted small">📍 ${bairrosMap[o.bairroId] || `Bairro ${o.bairroId}`}</div>
            </div>
            <span class="badge bg-secondary ms-2">#${index + 1}</span>`;
          ul.appendChild(li);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios recentes:', error);
      const ul = document.getElementById('recent-reports-list');
      if (ul) {
        ul.innerHTML = '<li class="list-group-item text-danger">Erro ao carregar relatórios recentes.</li>';
      }
    }
  }

  async function init() {
    const user = getUsuarioCorrente();
    if (!user) return;
    const usuario = await fetchJson(`/usuarios/${user.id}`);

    const ultimasDenuncias = await fetchJson(`/ocorrencias?usuarioId=${usuario.id}&_sort=createdAt&_order=desc&_limit=2`);
    const ultimasDenunciasContainer = document.getElementById('ultimas-denuncias');
    
    if (ultimasDenunciasContainer) {
      if (ultimasDenuncias.length === 0) {
        ultimasDenunciasContainer.innerHTML = '<p class="text-muted small">Nenhuma denúncia encontrada.</p>';
      } else {
        ultimasDenunciasContainer.innerHTML = '';
        ultimasDenuncias.forEach((denuncia, index) => {
          const denunciaDiv = document.createElement('div');
          denunciaDiv.className = `denuncia-item status-${denuncia.status}`;
          denunciaDiv.innerHTML = `
            <div class="denuncia-titulo">${index + 1}. ${denuncia.titulo}</div>
            <div class="denuncia-meta">
              ${getStatusLabel(denuncia.status)} • ${denuncia.tipo} • ${formatDate(denuncia.createdAt)}
            </div>
          `;
          ultimasDenunciasContainer.appendChild(denunciaDiv);
        });
      }
    }

    // Populate recent reports
    await populateRecentReports();
  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(err => console.error('Erro ao preencher painel do usuário:', err));
  });
})();
