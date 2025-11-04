(function () {
  function getUsuarioCorrente() {
    try {
      const raw = sessionStorage.getItem('usuarioCorrente');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function fetchJson(url) {
    // Usar dados locais (sem requisições)
    const data = window.DB_DATA;
    
    // Simular consultas da API localmente
    if (url.startsWith('/usuarios/')) {
      const id = parseInt(url.split('/')[2]);
      return Promise.resolve(data.usuarios.find(u => u.id === id));
    }
    
    if (url === '/bairros') {
      return Promise.resolve(data.bairros);
    }
    
    if (url.startsWith('/ocorrencias')) {
      const params = new URLSearchParams(url.split('?')[1] || '');
      let result = data.ocorrencias || [];
      
      // Filtrar por cidadeId
      if (params.get('cidadeId')) {
        const cidadeId = parseInt(params.get('cidadeId'));
        result = result.filter(o => o.cidadeId === cidadeId);
      }
      
      // Filtrar por usuarioId
      if (params.get('usuarioId')) {
        const usuarioId = parseInt(params.get('usuarioId'));
        result = result.filter(o => o.usuarioId === usuarioId);
      }
      
      // Ordenar por data
      if (params.get('_sort') === 'createdAt' && params.get('_order') === 'desc') {
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      
      // Limitar resultados
      if (params.get('_limit')) {
        const limit = parseInt(params.get('_limit'));
        result = result.slice(0, limit);
      }
      
      return Promise.resolve(result);
    }
    
    return Promise.resolve(data);
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

  function timeAgoPt(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d)) return { text: '', title: '' };
      const now = new Date();
      const diff = Math.floor((now - d) / 1000); // seconds

      const minutes = Math.floor(diff / 60);
      const hours = Math.floor(diff / 3600);
      const days = Math.floor(diff / 86400);

      let text;
      if (diff < 60) text = 'há poucos segundos';
      else if (minutes < 60) text = `há ${minutes}m`;
      else if (hours < 24) text = `há ${hours}h`;
      else if (days === 1) text = `Ontem ${d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
      else if (days < 7) text = `há ${days}d`;
      else text = d.toLocaleDateString('pt-BR');

      return { text, title: d.toLocaleString() };
    } catch { return { text: '', title: '' }; }
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
  const recentes = await fetchJson(`/ocorrencias?cidadeId=${usuario.cidadeId}&_sort=createdAt&_order=desc&_limit=7`);
      const ul = document.getElementById('recent-reports-list');
      if (ul) {
        if (recentes.length === 0) {
          ul.innerHTML = '<li class="list-group-item">Nenhum relatório encontrado na sua cidade.</li>';
          return;
        }
        
        ul.innerHTML = '';
        recentes.forEach((o, index) => {
          const li = document.createElement('li');
          li.setAttribute('tabindex', '0');
          li.className = 'recent-item';
          li.setAttribute('data-status', o.status || '');

          const time = timeAgoPt(o.createdAt || o.data || '');

          const statusLabel = getStatusLabel(o.status);
          const statusClass = o.status === 'aberto' ? 'status-aberto' : (o.status === 'em_andamento' ? 'status-em_andamento' : 'status-resolvido');

          const tipoHtml = `<span class="meta-piece"><i class="fa-solid fa-circle-exclamation"></i>${escapeHtml(o.tipo || 'n/d')}</span>`;
          const bairroHtml = `<span class="meta-piece"><i class="fa-solid fa-map-pin"></i>${escapeHtml(bairrosMap[o.bairroId] || `Bairro ${o.bairroId}`)}</span>`;

          li.innerHTML = `
            <div class="index-badge" aria-hidden>${index + 1}</div>
            <div class="recent-content">
              <h3 class="recent-title">${escapeHtml(o.titulo)}</h3>
              <div class="recent-meta">
                <span class="status-pill ${statusClass}"><span class="dot"></span><span class="pill-text">${escapeHtml(statusLabel)}</span></span>
                ${tipoHtml}
                ${bairroHtml}
                <span class="time" title="${fmtDate(o.createdAt)}">${escapeHtml(time.text)}</span>
              </div>
            </div>
          `;

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

  async function populateUserImpact() {
    try {
      const container = document.getElementById('user-impact-body') || document.querySelector('.user-impact');
      if (!container) return;

      const user = getUsuarioCorrente();
      if (!user) {
        container.innerHTML = '<p class="text-muted small">Faça login para ver seu impacto.</p>';
        return;
      }

      // Usar dados locais
      const data = window.DB_DATA || {};
      const ocorrencias = Array.isArray(data.ocorrencias) ? data.ocorrencias : [];

      // Filtra as denúncias do usuário que foram resolvidas
      const resolvidasDoUsuario = ocorrencias
        .filter(o => o && o.usuarioId === user.id && String(o.status).toLowerCase() === 'resolvido')
        .map(o => ({
          ...o,
          _resolvedAt: o.resolvedAt ? new Date(o.resolvedAt) : (o.updatedAt ? new Date(o.updatedAt) : (o.createdAt ? new Date(o.createdAt) : new Date(0)))
        }))
        .sort((a, b) => b._resolvedAt - a._resolvedAt);

      const total = resolvidasDoUsuario.length;

      // Monta o HTML do cartão
      const header = `
        <div class="d-flex align-items-center gap-2 mb-2">
          <i class="fa-solid fa-star text-warning"></i>
          <span class="fw-semibold">Você já ajudou a resolver ${total} problema${total === 1 ? '' : 's'}!</span>
        </div>`;

      if (total === 0) {
        container.innerHTML = header + '<p class="text-muted small mb-0">Quando uma denúncia sua for concluída, ela aparecerá aqui.</p>';
        return;
      }

      const ultimos = resolvidasDoUsuario.slice(0, 4);
      const itens = ultimos.map(o => {
        const when = timeAgoPt(o.resolvedAt || o.updatedAt || o.createdAt);
        return `
          <li class="list-group-item d-flex align-items-start gap-2 py-2">
            <span class="mt-1" aria-hidden><i class="fa-solid fa-check-circle text-success"></i></span>
            <div>
              <div class="fw-semibold">${escapeHtml(o.titulo || 'Ocorrência resolvida')}</div>
              <div class="text-muted small">${escapeHtml(o.tipo || 'Tipo')} • <span title="${fmtDate(o.resolvedAt || o.updatedAt || o.createdAt)}">${escapeHtml(when.text)}</span></div>
            </div>
          </li>`;
      }).join('');

      container.innerHTML = header + `
        <ul class="list-group list-group-flush">${itens}</ul>
      `;
    } catch (e) {
      console.error('Erro ao preencher impacto do usuário:', e);
      const container = document.getElementById('user-impact-body') || document.querySelector('.user-impact');
      if (container) container.innerHTML = '<p class="text-danger small">Não foi possível carregar seu impacto.</p>';
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

    // Populate recent reports e impacto do usuário
    await Promise.all([
      populateRecentReports(),
      populateUserImpact()
    ]);
  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(err => console.error('Erro ao preencher painel do usuário:', err));
  });
})();
