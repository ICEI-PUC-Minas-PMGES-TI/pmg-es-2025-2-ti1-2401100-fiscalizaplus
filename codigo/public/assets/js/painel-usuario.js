(function () {
  const API_BASE = 'http://localhost:3000';
  function getUsuarioCorrente() {
    try {
      // Tenta múltiplas chaves de sessão
      const keys = ['usuarioCorrente', 'fp_user', 'user'];
      for (const key of keys) {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.id || parsed.nome || parsed.email)) {
            return parsed;
          }
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  function getLocalDb() {
    return window.DB_DATA || {};
  }

  function normalizeText(str) {
    const base = String(str || '');
    const normalized = typeof base.normalize === 'function' ? base.normalize('NFD') : base;
    return normalized.replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function normalizeStatus(status) {
    const raw = normalizeText(status);
    if (!raw) return 'aberto';
    if (['aberto', 'novo', 'pendente', 'aguardando'].includes(raw)) return 'aberto';
    if (['em andamento', 'em_andamento', 'andamento', 'em analise', 'analise'].includes(raw)) return 'em_andamento';
  if (['resolvido', 'concluido', 'finalizado', 'resolvida', 'concluida', 'finalizada'].includes(raw)) return 'resolvido';
    return raw.replace(/\s+/g, '_');
  }

  function localFetch(url) {
    const data = getLocalDb();
    if (url.startsWith('/usuarios/') || url.startsWith('/cidadaos/')) {
      const id = parseInt(url.split('/')[2], 10);
      return (data.usuarios || data.cidadaos || []).find(u => u.id === id) || null;
    }
    if (url.startsWith('/bairros/')) {
      const id = parseInt(url.split('/')[2], 10);
      return (data.bairros || []).find(b => b.id === id) || null;
    }
    if (url.startsWith('/cidades/')) {
      const id = parseInt(url.split('/')[2], 10);
      return (data.cidades || []).find(c => c.id === id) || null;
    }
    if (url === '/bairros') {
      return (data.bairros || []).map(b => ({ ...b }));
    }
    if (url.startsWith('/ocorrencias')) {
      return fetchOcorrenciasFromLocal(url, data);
    }
    return data;
  }

  function fetchOcorrenciasFromLocal(url, data) {
    const params = new URLSearchParams(url.split('?')[1] || '');
    let result = Array.isArray(data.ocorrencias) ? data.ocorrencias.map(o => ({ ...o })) : [];

    if (params.get('cidadeId')) {
      const cidadeId = parseInt(params.get('cidadeId'), 10);
      result = result.filter(o => o.cidadeId === cidadeId);
    }

    if (params.get('usuarioId')) {
      const usuarioId = parseInt(params.get('usuarioId'), 10);
      result = result.filter(o => o.usuarioId === usuarioId);
    }

    if (params.get('status')) {
      const status = normalizeStatus(params.get('status'));
      result = result.filter(o => normalizeStatus(o.status) === status);
    }

    const sortField = params.get('_sort');
    if (sortField) {
      const order = (params.get('_order') || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      result.sort((a, b) => {
        const va = sortField.endsWith('At') ? new Date(a[sortField]).getTime() || 0 : a[sortField];
        const vb = sortField.endsWith('At') ? new Date(b[sortField]).getTime() || 0 : b[sortField];
        if (va < vb) return -1 * order;
        if (va > vb) return 1 * order;
        return 0;
      });
    }

    if (params.get('_limit')) {
      const limit = parseInt(params.get('_limit'), 10);
      if (!Number.isNaN(limit) && limit >= 0) {
        result = result.slice(0, limit);
      }
    }

    return result;
  }

  async function fetchOcorrenciasFromApi(path) {
    const data = getLocalDb();
    const idMatch = path.match(/^\/ocorrencias\/(\d+)/);
    if (idMatch) {
      const denuncia = await tryFetchFromApi(`/denuncias/${idMatch[1]}`);
      if (!denuncia || typeof denuncia !== 'object') return denuncia;
      return normalizeOcorrenciaFromApi(denuncia, data);
    }

    const denuncias = await tryFetchFromApi('/denuncias');
    if (!Array.isArray(denuncias)) return null;

    const query = path.split('?')[1] || '';
    const params = new URLSearchParams(query);
    const all = denuncias.map(d => normalizeOcorrenciaFromApi(d, data));
    let result = all;

    // Filtro por usuarioId: busca ocorrências onde o email bate
    if (params.get('usuarioId')) {
      const usuarioId = parseInt(params.get('usuarioId'), 10);
      if (!Number.isNaN(usuarioId)) {
        // Busca cidadãos da API primeiro
        let targetEmail = null;
        const cidadaosFromApi = await tryFetchFromApi('/cidadaos');
        if (Array.isArray(cidadaosFromApi)) {
          const targetUser = cidadaosFromApi.find(u => u.id === usuarioId);
          targetEmail = targetUser ? (targetUser.email || '').toLowerCase().trim() : null;
        }
        
        // Fallback para banco local se não encontrou na API
        if (!targetEmail) {
          const usuarios = data.usuarios || data.cidadaos || [];
          const targetUser = usuarios.find(u => u.id === usuarioId);
          targetEmail = targetUser ? (targetUser.email || '').toLowerCase().trim() : null;
        }
        
        if (targetEmail) {
          result = result.filter(o => {
            const oEmail = (o.usuarioEmail || '').toLowerCase().trim();
            return oEmail === targetEmail;
          });
        } else {
          // Se não encontrou email do usuário, retorna vazio
          result = [];
        }
      }
    }

    if (params.get('status')) {
      const status = normalizeStatus(params.get('status'));
      result = result.filter(o => normalizeStatus(o.status) === status);
    }

    if (params.get('cidadeId')) {
      const cidadeId = parseInt(params.get('cidadeId'), 10);
      if (!Number.isNaN(cidadeId)) {
        const cidadeObj = (data.cidades || []).find(c => c.id === cidadeId);
        const targetName = cidadeObj ? normalizeText(cidadeObj.nome) : null;
        result = result.filter(o => {
          if (typeof o.cidadeId === 'number') return o.cidadeId === cidadeId;
          if (!targetName) return false;
          return normalizeText(o.cidadeNome) === targetName;
        });
      }
    }

    const sortField = params.get('_sort');
    if (sortField) {
      const order = (params.get('_order') || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      const getValue = (item) => {
        const value = item[sortField];
        if (sortField.endsWith('At')) return new Date(value).getTime() || 0;
        if (typeof value === 'string') return value.toLowerCase();
        if (typeof value === 'number') return value;
        return 0;
      };
      result = result.slice().sort((a, b) => {
        const va = getValue(a);
        const vb = getValue(b);
        if (va < vb) return -1 * order;
        if (va > vb) return 1 * order;
        return 0;
      });
    }

    if (params.get('_limit')) {
      const limit = parseInt(params.get('_limit'), 10);
      if (!Number.isNaN(limit) && limit >= 0) {
        result = result.slice(0, limit);
      }
    }

    return result;
  }

  function normalizeOcorrenciaFromApi(denuncia, data) {
    const usuarios = data.usuarios || data.cidadaos || [];
    const cidades = data.cidades || [];
    const bairros = data.bairros || [];
    const autorNome = denuncia.autorCidadao || '';
    const autorEmail = (denuncia.contatoCidadao || '').toLowerCase().trim();
    
    // Match APENAS por email (mais confiável e único)
    const usuarioMatch = autorEmail 
      ? usuarios.find(u => {
          const uEmail = (u.email || '').toLowerCase().trim();
          return uEmail && uEmail === autorEmail;
        })
      : null;
    
    const cidadeNome = denuncia.endereco?.cidade || '';
    const cidadeMatch = cidades.find(c => normalizeText(c.nome) === normalizeText(cidadeNome));
    const bairroNome = denuncia.endereco?.bairro || '';
    const bairroMatch = bairros.find(b => {
      if (normalizeText(b.nome) !== normalizeText(bairroNome)) return false;
      if (!cidadeMatch) return true;
      return b.cidadeId === cidadeMatch.id;
    });

    const statusNormalized = normalizeStatus(denuncia.statusAtual);
    const latValueRaw = denuncia.endereco?.latitude ?? denuncia.lat ?? null;
    const lngValueRaw = denuncia.endereco?.longitude ?? denuncia.lng ?? null;
    const latValue = typeof latValueRaw === 'string' ? parseFloat(latValueRaw) : latValueRaw;
    const lngValue = typeof lngValueRaw === 'string' ? parseFloat(lngValueRaw) : lngValueRaw;
    const createdAt = denuncia.dataRegistro || denuncia.createdAt || null;
    const resolvedAt = statusNormalized === 'resolvido'
      ? (denuncia.dataConclusao || denuncia.dataUltimaAtualizacaoStatus || createdAt)
      : (denuncia.dataResolucao || null);
    const updatedAt = denuncia.dataUltimaAtualizacaoStatus || resolvedAt || createdAt;

    return {
      id: denuncia.id,
      titulo: denuncia.titulo,
      tipo: denuncia.tipoProblema || denuncia.tipo,
      tipoProblema: denuncia.tipoProblema || denuncia.tipo,
      descricao: denuncia.descricaoCompleta || denuncia.descricao,
      descricaoCompleta: denuncia.descricaoCompleta || denuncia.descricao,
      status: statusNormalized,
      statusOriginal: denuncia.statusAtual,
      createdAt,
      updatedAt,
      resolvedAt,
      lat: Number.isFinite(latValue) ? latValue : null,
      lng: Number.isFinite(lngValue) ? lngValue : null,
      cidadeId: cidadeMatch ? cidadeMatch.id : null,
      bairroId: bairroMatch ? bairroMatch.id : null,
      cidadeNome: cidadeMatch ? cidadeMatch.nome : cidadeNome,
      bairroNome: bairroMatch ? bairroMatch.nome : bairroNome,
      usuarioId: usuarioMatch ? usuarioMatch.id : null,
      usuarioNome: usuarioMatch ? (usuarioMatch.nome || usuarioMatch.nomeCompleto) : autorNome,
      usuarioEmail: autorEmail,
      endereco: denuncia.endereco || null,
      prioridadeCidadao: denuncia.prioridadeCidadao,
      urgenciaCidadao: denuncia.urgenciaCidadao,
      impactoComunidade: denuncia.impactoComunidade,
      observacoesInternasServidor: denuncia.observacoesInternasServidor,
      servidorResponsavelId: denuncia.servidorResponsavelId
    };
  }  async function fetchJson(url) {
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;

    // Para denúncias, tenta API primeiro
    if (normalizedUrl.startsWith('/denuncias')) {
      const apiResult = await tryFetchFromApi(normalizedUrl);
      if (apiResult !== null) return apiResult;
      // Fallback para dados locais se API falhar
      const localData = getLocalDb();
      if (localData.denuncias) {
        let denuncias = Array.isArray(localData.denuncias) ? localData.denuncias.map(d => ({ ...d })) : [];
        // Aplica filtros de query string se houver
        const params = new URLSearchParams(normalizedUrl.split('?')[1] || '');
        if (params.get('_sort')) {
          const sortField = params.get('_sort');
          const order = params.get('_order') === 'asc' ? 1 : -1;
          denuncias.sort((a, b) => {
            // Para campos de data, compara como Date
            if (sortField === 'dataRegistro' || sortField === 'dataUltimaAtualizacaoStatus') {
              const aVal = new Date(a[sortField] || 0).getTime();
              const bVal = new Date(b[sortField] || 0).getTime();
              return (bVal - aVal) * order;
            }
            // Para outros campos, compara como string
            const aVal = a[sortField] || '';
            const bVal = b[sortField] || '';
            if (aVal < bVal) return -1 * order;
            if (aVal > bVal) return 1 * order;
            return 0;
          });
        }
        if (params.get('_limit')) {
          const limit = parseInt(params.get('_limit'), 10);
          denuncias = denuncias.slice(0, limit);
        }
        return denuncias;
      }
      return [];
    }

    // Para ocorrências, sempre tenta API primeiro
    if (normalizedUrl.startsWith('/ocorrencias')) {
      const apiResult = await fetchOcorrenciasFromApi(normalizedUrl);
      if (apiResult !== null) return apiResult;
    }

    // Para /usuarios ou /cidadaos, tenta API
    if (normalizedUrl.startsWith('/usuarios') || normalizedUrl.startsWith('/cidadaos')) {
      const apiPath = normalizedUrl.replace('/usuarios', '/cidadaos');
      const apiFallback = await tryFetchFromApi(apiPath);
      if (apiFallback !== null) return apiFallback;
    }

    // Para outros endpoints, tenta API genérica
    const apiFallback = await tryFetchFromApi(normalizedUrl);
    if (apiFallback !== null) return apiFallback;

    return localFetch(normalizedUrl);
  }



  function formatDate(dateString) {
    if (!dateString) return 'Data não informada';
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return 'Data inválida';
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
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case 'aberto':
        return 'Aberto';
      case 'em_andamento':
        return 'Em andamento';
      case 'resolvido':
        return 'Resolvido';
      default:
        return status || 'Indefinido';
    }
  }

  function fmtDate(iso) {
    try {
      if (!iso) return '';
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
      // Se for dentro de 24h do dia atual, mostra "X horas atrás"
      if (hours < 24 && days === 0) {
        if (diff < 60) text = 'há poucos segundos';
        else if (minutes < 60) text = `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        else text = `há ${hours} hora${hours > 1 ? 's' : ''}`;
      } else {
        // Caso contrário, mostra só a data
        text = d.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
      }

      return { text, title: d.toLocaleString('pt-BR') };
    } catch {
      return { text: '', title: '' };
    }
  }

  function statusBadge(status) {
    const normalized = normalizeStatus(status);
    const color = (() => {
      switch (normalized) {
        case 'aberto':
          return 'warning';
        case 'em_andamento':
          return 'info';
        case 'resolvido':
          return 'success';
        default:
          return 'secondary';
      }
    })();
    return `<span class="badge text-bg-${color}">${getStatusLabel(status)}</span>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  async function populateRecentReports() {
    try {
      // Busca TODAS as denúncias primeiro (sem limite) para garantir que pegue as mais recentes
      const todasDenuncias = await fetchJson(`/denuncias?_sort=dataRegistro&_order=desc`);
      
      let recentes = Array.isArray(todasDenuncias) ? todasDenuncias : [];
      
      console.log('[Recentes] Total de denúncias encontradas:', recentes.length);
      
      // Garante que está ordenado do mais recente ao mais antigo (caso o sort não funcione)
      if (recentes.length > 0) {
        recentes.sort((a, b) => {
          const dateA = new Date(a.dataRegistro || a.dataUltimaAtualizacaoStatus || 0);
          const dateB = new Date(b.dataRegistro || b.dataUltimaAtualizacaoStatus || 0);
          return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
        });
        
        // Log das 3 mais recentes para debug
        console.log('[Recentes] 3 mais recentes:', recentes.slice(0, 3).map(d => ({
          id: d.id,
          codigo: d.codigoOcorrencia,
          titulo: d.titulo,
          dataRegistro: d.dataRegistro
        })));
      }

      // Limita a 10 denúncias APÓS ordenar (ou o máximo que couber no card)
      recentes = recentes.slice(0, 10);
      
      const ul = document.getElementById('recent-reports-list');
      if (ul) {
        if (!Array.isArray(recentes) || recentes.length === 0) {
          ul.innerHTML = '<li class="list-group-item">Nenhum relatório encontrado na sua cidade.</li>';
          return;
        }
        
        ul.innerHTML = '';
        recentes.forEach((d, index) => {
          const li = document.createElement('li');
          li.setAttribute('tabindex', '0');
          li.className = 'recent-item';

          const time = timeAgoPt(d.dataRegistro || '');
          const bairroNome = d.endereco ? d.endereco.bairro : '';
          const tipoDenuncia = d.tipoProblema || 'n/d';

          li.innerHTML = `
            <div class="recent-content">
              <h3 class="recent-title">${escapeHtml(d.titulo || 'Sem título')}</h3>
              <div class="recent-meta">
                <span class="meta-piece"><i class="fa-solid fa-map-pin"></i>${escapeHtml(bairroNome || 'Bairro não informado')}</span>
                <span class="meta-piece"><i class="fa-solid fa-circle-exclamation"></i>${escapeHtml(tipoDenuncia)}</span>
                <span class="time">${escapeHtml(time.text)}</span>
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

  function toDisplayDate(iso) {
    try {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d)) return '';
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return ''; }
  }

  async function tryFetchFromApi(path) {
    try {
      const res = await fetch(`${API_BASE}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      return null; // sinaliza falha para cair no fallback local
    }
  }

  async function ensureSeedOccorrenciasIfEmpty() {
    const snapshot = await fetchOcorrenciasFromApi('/ocorrencias');
    if (snapshot === null) return; // API indisponível
    if (Array.isArray(snapshot) && snapshot.length > 0) return; // já existe dado persistido

    const data = getLocalDb();
    const sample = Array.isArray(data.ocorrencias) ? data.ocorrencias.slice(0, 8) : [];
    if (sample.length === 0) return;

    const usuarios = data.usuarios || [];
    const cidades = data.cidades || [];
    const bairros = data.bairros || [];

    for (const oc of sample) {
      const usuario = usuarios.find(u => u.id === oc.usuarioId) || null;
      const cidade = cidades.find(c => c.id === oc.cidadeId) || null;
      const bairro = bairros.find(b => b.id === oc.bairroId) || null;
      const payload = {
        titulo: oc.titulo,
        tipoProblema: oc.tipo,
        descricaoCompleta: oc.descricao,
        informacoesAdicionaisCidadao: '',
        codigoOcorrencia: `LEGACY-${oc.id}`,
        endereco: {
          rua: '',
          numero: '',
          bairro: bairro ? bairro.nome : '',
          cidade: cidade ? cidade.nome : '',
          estado: cidade ? (cidade.uf || '') : '',
          cep: '',
          latitude: oc.lat ?? null,
          longitude: oc.lng ?? null
        },
        imagens: [],
        prioridadeCidadao: 'media',
        urgenciaCidadao: 'media',
        impactoComunidade: 'local',
        dataRegistro: oc.createdAt || new Date().toISOString(),
        autorCidadao: usuario ? usuario.nome : 'Usuário FiscalizaPlus',
        isAnonimo: !usuario,
        statusAtual: getStatusLabel(oc.status || oc.statusOriginal),
        dataUltimaAtualizacaoStatus: oc.resolvedAt || oc.updatedAt || oc.createdAt || new Date().toISOString(),
        prioridadeInterna: null,
        observacoesInternasServidor: '',
        servidorResponsavelId: null,
        contatoCidadao: usuario ? (usuario.email || '') : '',
        recebeNotificacoes: Boolean(usuario)
      };
      try {
        await fetch(`${API_BASE}/denuncias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (_) {
        // Ignora erros de seed
      }
    }
  }

  function createImpactModalIfNeeded() {
    if (document.getElementById('impact-detail-modal')) return;
    const modalHtml = `
      <div class="modal fade" id="impact-detail-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="impact-detail-title">Detalhes da ocorrência</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2"><span class="badge rounded-pill bg-success" id="impact-detail-status">Resolvido</span></div>
              <div class="small text-muted mb-2" id="impact-detail-dates"></div>
              <div class="mb-1 fw-semibold">Tipo</div>
              <div class="mb-3" id="impact-detail-type">-</div>
              <div class="mb-1 fw-semibold">Descrição</div>
              <div id="impact-detail-desc">-</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function openImpactModal(oc) {
    createImpactModalIfNeeded();
    const title = document.getElementById('impact-detail-title');
    const status = document.getElementById('impact-detail-status');
    const dates = document.getElementById('impact-detail-dates');
    const type = document.getElementById('impact-detail-type');
    const desc = document.getElementById('impact-detail-desc');
    // Extra fields ensure richer details
    let extraContainer = document.getElementById('impact-detail-extra');
    if (!extraContainer) {
      const body = document.querySelector('#impact-detail-modal .modal-body');
      if (body) {
        extraContainer = document.createElement('div');
        extraContainer.id = 'impact-detail-extra';
        body.appendChild(document.createElement('hr'));
        body.appendChild(extraContainer);
      }
    }

    if (title) title.textContent = oc.titulo || 'Ocorrência';
    const normalizedStatus = normalizeStatus(oc.status || oc.statusOriginal);
    const color = (() => {
      if (normalizedStatus === 'resolvido') return 'bg-success';
      if (normalizedStatus === 'em_andamento') return 'bg-info';
      if (normalizedStatus === 'aberto') return 'bg-warning text-dark';
      return 'bg-secondary';
    })();
    if (status) {
      status.className = `badge rounded-pill ${color}`;
      status.textContent = getStatusLabel(oc.status || oc.statusOriginal);
    }
    if (dates) {
      const aberto = toDisplayDate(oc.createdAt);
      const resolvido = toDisplayDate(oc.resolvedAt);
      const atualizado = toDisplayDate(oc.updatedAt);
      dates.innerHTML = `
        <span class="me-2"><i class="fa-regular fa-clock"></i> Criado: <strong>${aberto||'n/d'}</strong></span>
        <span class="me-2"><i class="fa-solid fa-arrow-rotate-right"></i> Atualizado: <strong>${atualizado||'-'}</strong></span>
        <span><i class="fa-solid fa-flag-checkered"></i> Resolvido: <strong>${resolvido||'-'}</strong></span>
      `;
    }
    if (type) type.textContent = oc.tipo || oc.tipoProblema || '—';
    if (desc) desc.textContent = oc.descricao || oc.descricaoCompleta || '-';
    if (extraContainer) {
      // Resolve friendly names
      Promise.all([
        oc.bairroId ? fetchJson(`/bairros/${oc.bairroId}`) : Promise.resolve(null),
        oc.cidadeId ? fetchJson(`/cidades/${oc.cidadeId}`) : Promise.resolve(null),
        oc.usuarioId ? fetchJson(`/usuarios/${oc.usuarioId}`) : Promise.resolve(null)
      ]).then(([bairroObj, cidadeObj, usuarioObj]) => {
        const bairroNome = bairroObj ? bairroObj.nome : (oc.bairroNome || (oc.endereco ? oc.endereco.bairro : ''));
        const cidadeNome = cidadeObj ? cidadeObj.nome : (oc.cidadeNome || (oc.endereco ? oc.endereco.cidade : ''));
        const usuarioNome = usuarioObj ? usuarioObj.nome : (oc.usuarioNome || '');
        const latValue = typeof oc.lat === 'string' ? parseFloat(oc.lat) : oc.lat;
        const lngValue = typeof oc.lng === 'string' ? parseFloat(oc.lng) : oc.lng;
        const hasCoords = Number.isFinite(latValue) && Number.isFinite(lngValue);
        extraContainer.innerHTML = `
          <div class="small text-muted mb-2">Localização e autor</div>
          <ul class="list-unstyled mb-3 small">
            ${bairroNome?`<li><i class="fa-solid fa-location-dot"></i> Bairro: <strong>${bairroNome}</strong></li>`:''}
            ${cidadeNome?`<li><i class="fa-regular fa-building"></i> Cidade: <strong>${cidadeNome}</strong></li>`:''}
            ${usuarioNome?`<li><i class="fa-solid fa-user"></i> Usuário: <strong>${usuarioNome}</strong></li>`:''}
          </ul>
          ${hasCoords ? '<div id=\"impact-detail-map\" class=\"impact-map mt-2\"></div>' : '<p class=\"text-muted small\">Localização não disponível.</p>'}
        `;

        // Renderiza mini-mapa interativo (Leaflet) quando temos coordenadas
        if (hasCoords && typeof L !== 'undefined') {
          const mapEl = document.getElementById('impact-detail-map');
          if (mapEl) {
            // Garante container limpo a cada abertura
            mapEl.innerHTML = '';
            const map = L.map(mapEl, { attributionControl:false, zoomControl:false });
            map.setView([latValue, lngValue], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
            L.marker([latValue, lngValue]).addTo(map);
            // Ajusta tamanho após animação do modal
            setTimeout(() => { try { map.invalidateSize(); } catch(_){} }, 250);
          }
        }
      }).catch(() => {
        extraContainer.innerHTML = '<p class="text-muted small">Não foi possível carregar localização.</p>';
      });
    }

    const modal = new bootstrap.Modal(document.getElementById('impact-detail-modal'));
    modal.show();
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

      console.log('[Seu Impacto] Usuário logado:', user);

      await ensureSeedOccorrenciasIfEmpty();
      const fetched = await fetchJson(`/ocorrencias?usuarioId=${user.id}&status=resolvido&_sort=resolvedAt&_order=desc&_limit=10`);
      
      console.log('[Seu Impacto] Denúncias resolvidas encontradas:', fetched);
      
      const resolvidasDoUsuario = Array.isArray(fetched)
        ? fetched.map(o => ({
            ...o,
            _resolvedAt: o.resolvedAt
              ? new Date(o.resolvedAt)
              : (o.updatedAt ? new Date(o.updatedAt) : (o.createdAt ? new Date(o.createdAt) : new Date(0)))
          }))
        : [];

      const total = resolvidasDoUsuario.length;
      
      console.log('[Seu Impacto] Total de problemas resolvidos:', total);

      // Monta o HTML do cartão
      const header = `
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="fa-solid fa-star text-warning"></i>
          <span class="fw-semibold">Você já ajudou a resolver ${total} problema${total === 1 ? '' : 's'}!</span>
        </div>`;

      if (total === 0) {
        container.innerHTML = header + '<p class="text-muted small mb-0">Quando uma denúncia sua for concluída, ela aparecerá aqui.</p>';
        return;
      }

      const ultimos = resolvidasDoUsuario.slice(0, 6);
      const itens = ultimos.map(o => {
        const when = toDisplayDate(o.resolvedAt || o.updatedAt || o.createdAt);
        const safeTitle = escapeHtml(o.titulo || 'Ocorrência resolvida');
        const safeTipo = escapeHtml(o.tipo || o.tipoProblema || 'Tipo');
        const badge = `<span class="badge bg-success rounded-pill ms-auto">${when}</span>`;
        return `
          <button type="button" class="list-group-item list-group-item-action d-flex align-items-center gap-3 py-2 impact-item" data-oc='${JSON.stringify(o).replace(/'/g, "&#39;")}'>
            <span class="impact-icon d-inline-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-25 text-success" style="width:34px;height:34px;"><i class="fa-solid fa-check"></i></span>
            <div class="flex-grow-1 text-start">
              <div class="fw-semibold mb-1">${safeTitle}</div>
              <div class="text-muted small d-flex flex-wrap gap-2 align-items-center">
                <span><i class="fa-solid fa-layer-group"></i> ${safeTipo}</span>
                <span><i class="fa-solid fa-calendar-check"></i> Resolvido: ${when}</span>
              </div>
            </div>
            ${badge}
          </button>`;
      }).join('');

      container.innerHTML = header + `
        <div class="impact-scroll impact-list list-group list-group-flush border-0">${itens}</div>
      `;

      // Eventos de clique para abrir modal
      container.querySelectorAll('.impact-item').forEach(btn => {
        btn.addEventListener('click', () => {
          try {
            const oc = JSON.parse(btn.getAttribute('data-oc').replace(/&#39;/g, "'"));
            openImpactModal(oc);
          } catch (e) {
            console.warn('Falha ao abrir detalhes:', e);
          }
        });
      });
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
          const safeTitulo = escapeHtml(denuncia.titulo || 'Ocorrência');
          const safeStatus = escapeHtml(getStatusLabel(denuncia.status || denuncia.statusOriginal));
          const safeTipo = escapeHtml(denuncia.tipo || denuncia.tipoProblema || 'Tipo');
          const safeData = escapeHtml(formatDate(denuncia.createdAt || denuncia.dataRegistro));
          denunciaDiv.innerHTML = `
            <div class="denuncia-titulo">${index + 1}. ${safeTitulo}</div>
            <div class="denuncia-meta">
              ${safeStatus} • ${safeTipo} • ${safeData}
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

    // Inicia atualização automática a cada 30 segundos
    startAutoRefresh();
  }

  // Variável para armazenar o intervalo de atualização
  let refreshInterval = null;

  function startAutoRefresh() {
    // Limpa intervalo anterior se existir
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    // Atualiza a lista de denúncias recentes a cada 30 segundos
    refreshInterval = setInterval(async () => {
      try {
        console.log('[Auto-refresh] Atualizando lista de denúncias recentes...');
        await populateRecentReports();
      } catch (error) {
        console.error('Erro ao atualizar denúncias recentes:', error);
      }
    }, 30000); // 30 segundos
  }

  // Limpa o intervalo quando a página é fechada ou recarregada
  window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(err => console.error('Erro ao preencher painel do usuário:', err));
  });
})();
