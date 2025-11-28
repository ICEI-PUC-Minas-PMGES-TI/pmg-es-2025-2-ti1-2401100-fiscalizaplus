
(function () {
  const API_BASE = 'http://localhost:3000';
  function getUsuarioCorrente() {
    try {
      // Verifica se é visitante (entrou sem login)
      const isGuest = sessionStorage.getItem('isGuest') === 'true';
      if (isGuest) {
        return null; // Retorna null para visitante
      }
      
      // Tenta múltiplas chaves de sessão
      const keys = ['usuarioCorrente', 'fp_user', 'user'];
      for (const key of keys) {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Verifica se tem ID válido (não aceita dados sem ID)
          if (parsed && parsed.id && (parsed.id !== 'admin' && parsed.id !== 'administrador')) {
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

    // Busca todas as denúncias primeiro
    const denuncias = await tryFetchFromApi('/denuncias');
    if (!Array.isArray(denuncias)) return null;

    const query = path.split('?')[1] || '';
    const params = new URLSearchParams(query);
    const all = denuncias.map(d => normalizeOcorrenciaFromApi(d, data));
    let result = all;
    
    console.log('[fetchOcorrenciasFromApi] Total de denúncias carregadas:', all.length);

    // Filtro por usuarioId: busca ocorrências por cidadaoId ou email
    if (params.get('usuarioId')) {
      const usuarioIdParam = params.get('usuarioId');
      const usuarioId = parseInt(usuarioIdParam, 10);
      const usuarioIdString = String(usuarioIdParam);
      
      if (!Number.isNaN(usuarioId)) {
        console.log('[Filtro] Buscando denúncias para usuário ID:', usuarioId, 'ou string:', usuarioIdString);
        
        // Filtra diretamente no array já carregado (mais confiável que buscar na API)
        // pois o json-server pode não filtrar corretamente strings
        result = all.filter(o => {
            const oCidadaoId = o.cidadaoId;
            const oUsuarioId = o.usuarioId;
            
            // Verifica cidadaoId (aceita string ou número)
            if (oCidadaoId) {
              const oCidadaoIdNum = parseInt(oCidadaoId, 10);
              const oCidadaoIdStr = String(oCidadaoId);
              
              if ((!Number.isNaN(oCidadaoIdNum) && oCidadaoIdNum === usuarioId) || 
                  (oCidadaoIdStr === usuarioIdString) ||
                  (String(oCidadaoId) === String(usuarioIdParam))) {
                console.log('[Filtro] Match encontrado por cidadaoId:', oCidadaoId, 'com usuário:', usuarioIdParam);
                return true;
              }
            }
            
            // Verifica usuarioId (aceita string ou número)
            if (oUsuarioId) {
              const oUsuarioIdNum = parseInt(oUsuarioId, 10);
              const oUsuarioIdStr = String(oUsuarioId);
              
              if ((!Number.isNaN(oUsuarioIdNum) && oUsuarioIdNum === usuarioId) || 
                  (oUsuarioIdStr === usuarioIdString) ||
                  (String(oUsuarioId) === String(usuarioIdParam))) {
                console.log('[Filtro] Match encontrado por usuarioId:', oUsuarioId, 'com usuário:', usuarioIdParam);
                return true;
              }
            }
            
            return false;
          });
          
          console.log('[Filtro] Após filtro local, encontradas', result.length, 'denúncias');
          
          // Se não encontrou nada, tenta buscar diretamente na API como fallback
          if (result.length === 0) {
            let denunciasComCidadaoId = await tryFetchFromApi(`/denuncias?cidadaoId=${usuarioId}`);
            if (!Array.isArray(denunciasComCidadaoId) || denunciasComCidadaoId.length === 0) {
              denunciasComCidadaoId = await tryFetchFromApi(`/denuncias?cidadaoId=${usuarioIdString}`);
            }
            
            if (Array.isArray(denunciasComCidadaoId) && denunciasComCidadaoId.length > 0) {
              console.log('[Filtro] Encontradas', denunciasComCidadaoId.length, 'denúncias via API (fallback)');
              result = denunciasComCidadaoId.map(d => normalizeOcorrenciaFromApi(d, data));
            }
          }
          
          // Se ainda não encontrou, tenta por email (compatibilidade com dados antigos)
          if (result.length === 0) {
            let targetEmail = null;
            const cidadaosFromApi = await tryFetchFromApi('/cidadaos');
            if (Array.isArray(cidadaosFromApi)) {
              const targetUser = cidadaosFromApi.find(u => {
                const uId = parseInt(u.id, 10);
                const uIdStr = String(u.id);
                return (uId === usuarioId) || (uIdStr === usuarioIdString);
              });
              targetEmail = targetUser ? (targetUser.email || '').toLowerCase().trim() : null;
            }
            
            if (targetEmail) {
              result = all.filter(o => {
                const oEmail = (o.usuarioEmail || o.contatoCidadao || '').toLowerCase().trim();
                return oEmail === targetEmail;
              });
              console.log('[Filtro] Encontradas', result.length, 'denúncias por email');
            }
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

    // Prioriza cidadaoId direto da denúncia, depois tenta pelo match de email
    const cidadaoId = denuncia.cidadaoId 
      ? parseInt(denuncia.cidadaoId) 
      : (usuarioMatch ? usuarioMatch.id : null);

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
      usuarioId: cidadaoId || (usuarioMatch ? usuarioMatch.id : null),
      cidadaoId: cidadaoId, // Campo direto do cidadão que reportou
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

          // Garante que os dados estão disponíveis
          const dataRegistro = d.dataRegistro || d.createdAt || '';
          const time = timeAgoPt(dataRegistro);
          const bairroNome = (d.endereco && d.endereco.bairro) ? d.endereco.bairro : 'Bairro não informado';
          const tipoDenuncia = d.tipoProblema || d.tipo || 'Tipo não informado';
          const dataFormatada = formatDate(dataRegistro);
          const timeText = (time && time.text) ? time.text : dataFormatada;

          // Debug log
          console.log('[Relatos Recentes] Denúncia:', {
            titulo: d.titulo,
            bairro: bairroNome,
            tipo: tipoDenuncia,
            data: dataFormatada,
            timeText: timeText,
            endereco: d.endereco
          });

          li.innerHTML = `
            <div class="recent-content">
              <h3 class="recent-title">${escapeHtml(d.titulo || 'Sem título')}</h3>
              <div class="recent-meta">
                <span class="meta-piece"><i class="fa-solid fa-map-pin"></i>${escapeHtml(bairroNome)}</span>
                <span class="meta-piece"><i class="fa-solid fa-circle-exclamation"></i>${escapeHtml(tipoDenuncia)}</span>
                <span class="time" title="${escapeHtml(dataFormatada)}">${escapeHtml(timeText)}</span>
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

      // Busca denúncias do usuário, filtrando por cidadaoId e excluindo denúncias LEGACY/simuladas
      const fetched = await fetchJson(`/ocorrencias?usuarioId=${user.id}&status=resolvido&_sort=resolvedAt&_order=desc&_limit=10`);
      
      console.log('[Seu Impacto] Denúncias resolvidas encontradas:', fetched);
      
      // Filtra apenas denúncias reais do usuário (com cidadaoId correto e sem código LEGACY)
      const resolvidasDoUsuario = Array.isArray(fetched)
        ? fetched
            .filter(o => {
              // Exclui denúncias LEGACY/simuladas
              if (o.codigoOcorrencia && o.codigoOcorrencia.startsWith('LEGACY-')) {
                return false;
              }
              // Garante que a denúncia pertence ao usuário atual
              const cidadaoId = o.cidadaoId ? parseInt(o.cidadaoId) : null;
              const usuarioId = o.usuarioId ? parseInt(o.usuarioId) : null;
              return (cidadaoId === parseInt(user.id)) || (usuarioId === parseInt(user.id));
            })
            .map(o => ({
              ...o,
              _resolvedAt: o.resolvedAt
                ? new Date(o.resolvedAt)
                : (o.updatedAt ? new Date(o.updatedAt) : (o.createdAt ? new Date(o.createdAt) : new Date(0)))
            }))
        : [];

      const total = resolvidasDoUsuario.length;
      
      console.log('[Seu Impacto] Total de problemas resolvidos (após filtro):', total);

      if (total === 0) {
        // Se não houver denúncias resolvidas, mostra mensagem apropriada
        container.innerHTML = '<p class="text-muted small mb-0">Você ainda não possui denúncias resolvidas. Quando uma denúncia sua for concluída, ela aparecerá aqui.</p>';
        return;
      }

      // Monta o HTML do cartão
      const header = `
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="fa-solid fa-star text-warning"></i>
          <span class="fw-semibold">Você já ajudou a resolver ${total} problema${total === 1 ? '' : 's'}!</span>
        </div>`;

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

  // Função para atualizar informações do usuário no painel
  function updateUserInfo(usuario) {
    const nomeCompleto = usuario.nomeCompleto || usuario.nome || 'Usuário';
    const primeiroNome = nomeCompleto.split(' ')[0];
    const email = usuario.email || '';

    // Atualiza nome em todos os lugares
    const welcomeName = document.getElementById('welcome-name');
    if (welcomeName) welcomeName.textContent = primeiroNome;

    const userName = document.getElementById('user-name');
    if (userName) userName.textContent = `Olá, ${primeiroNome}`;

    const userEmail = document.getElementById('user-email');
    if (userEmail) userEmail.textContent = email;

    const nameUserLg = document.getElementById('name-user-lg');
    if (nameUserLg) nameUserLg.textContent = `Olá, ${primeiroNome}`;

    const nameUserOffcanvas = document.getElementById('name-user-offcanvas');
    if (nameUserOffcanvas) nameUserOffcanvas.textContent = `Olá, ${primeiroNome}`;

    // Atualiza também o elemento com id nomeUsuarioNav se existir
    const nomeUsuarioNav = document.querySelector('#nomeUsuarioNav');
    if (nomeUsuarioNav) nomeUsuarioNav.textContent = `Olá, ${primeiroNome}`;
  }

  // Função para atualizar estatísticas do usuário
  async function updateUserStats(usuarioId) {
    try {
      console.log('[Estatísticas] Buscando para usuário ID:', usuarioId);
      // Busca todas as denúncias do usuário
      const todasDenuncias = await fetchJson(`/ocorrencias?usuarioId=${usuarioId}`);
      console.log('[Estatísticas] Total encontrado antes do filtro:', Array.isArray(todasDenuncias) ? todasDenuncias.length : 0);
      
      // Prepara IDs para comparação (aceita string ou número)
      const usuarioIdNum = parseInt(usuarioId, 10);
      const usuarioIdStr = String(usuarioId);
      
      // Filtra apenas denúncias reais do usuário (exclui LEGACY/simuladas)
      const denunciasReais = Array.isArray(todasDenuncias)
        ? todasDenuncias.filter(d => {
            // Exclui denúncias LEGACY/simuladas
            if (d.codigoOcorrencia && d.codigoOcorrencia.startsWith('LEGACY-')) {
              return false;
            }
            
            // Garante que a denúncia pertence ao usuário atual (aceita string ou número)
            const cidadaoId = d.cidadaoId;
            const usuarioIdDenuncia = d.usuarioId;
            
            if (cidadaoId) {
              const cidadaoIdNum = parseInt(cidadaoId, 10);
              const cidadaoIdStr = String(cidadaoId);
              if ((!Number.isNaN(cidadaoIdNum) && cidadaoIdNum === usuarioIdNum) || 
                  (cidadaoIdStr === usuarioIdStr) || 
                  (String(cidadaoId) === String(usuarioId))) {
                return true;
              }
            }
            
            if (usuarioIdDenuncia) {
              const usuarioIdNumDenuncia = parseInt(usuarioIdDenuncia, 10);
              const usuarioIdStrDenuncia = String(usuarioIdDenuncia);
              if ((!Number.isNaN(usuarioIdNumDenuncia) && usuarioIdNumDenuncia === usuarioIdNum) || 
                  (usuarioIdStrDenuncia === usuarioIdStr) || 
                  (String(usuarioIdDenuncia) === String(usuarioId))) {
                return true;
              }
            }
            
            return false;
          })
        : [];
      
      console.log('[Estatísticas] Após filtro:', denunciasReais.length, 'denúncias reais');
      
      if (denunciasReais.length === 0) {
        // Se não houver denúncias, zera as estatísticas
        const quickTotal = document.getElementById('quick-total');
        const quickResolved = document.getElementById('quick-resolved');
        const quickProgress = document.getElementById('quick-progress');
        
        if (quickTotal) quickTotal.textContent = '0';
        if (quickResolved) quickResolved.textContent = '0';
        if (quickProgress) quickProgress.textContent = '0';
        
        return;
      }

      // Calcula estatísticas apenas com denúncias reais
      const total = denunciasReais.length;
      const resolvidas = denunciasReais.filter(d => {
        const status = normalizeStatus(d.status || d.statusOriginal);
        return status === 'resolvido';
      }).length;
      const emAndamento = denunciasReais.filter(d => {
        const status = normalizeStatus(d.status || d.statusOriginal);
        return status === 'em_andamento';
      }).length;

      // Atualiza elementos
      const quickTotal = document.getElementById('quick-total');
      const quickResolved = document.getElementById('quick-resolved');
      const quickProgress = document.getElementById('quick-progress');
      
      if (quickTotal) quickTotal.textContent = total;
      if (quickResolved) quickResolved.textContent = resolvidas;
      if (quickProgress) quickProgress.textContent = emAndamento;
    } catch (error) {
      console.error('Erro ao atualizar estatísticas do usuário:', error);
    }
  }

  async function init() {
    const user = getUsuarioCorrente();
    if (!user || !user.id) {
      // Atualiza elementos do painel para mostrar mensagens ao invés de dados
      const userName = document.getElementById('user-name');
      const userEmail = document.getElementById('user-email');
      const welcomeSubtitle = document.getElementById('welcome-subtitle');
      
      if (userName) {
        userName.innerHTML = '<i class="fa-solid fa-info-circle me-2"></i>Faça login ou registre-se';
        userName.style.color = 'var(--text-muted)';
        userName.style.fontSize = '1rem';
      }
      if (userEmail) {
        userEmail.innerHTML = 'para visualizar seus dados e acompanhar suas denúncias';
        userEmail.style.color = 'var(--text-muted)';
        userEmail.style.fontSize = '0.9rem';
      }
      if (welcomeSubtitle) {
        welcomeSubtitle.textContent = 'Registre-se para acompanhar suas denúncias e o que está acontecendo na cidade';
      }
      
      // Carrega relatos recentes mesmo sem login (visível para todos)
      await populateRecentReports();
      
      // Se não houver usuário logado, mostra mensagens explicativas
      const ultimasDenunciasContainer = document.getElementById('ultimas-denuncias');
      if (ultimasDenunciasContainer) {
        const currentPath = window.location.pathname;
        let loginPath = '';
        let cadastroPath = '';
        
        if (currentPath.includes('/painel-cidadao/')) {
          if (currentPath.match(/\/painel-cidadao\/[^\/]+\//)) {
            // Subpasta: comunidade, dashboard, etc
            loginPath = '../../login/login.html';
            cadastroPath = '../../cadastro/cadastro-cidadao.html';
          } else {
            // Pasta principal: painel-cidadao/index.html
            loginPath = '../login/login.html';
            cadastroPath = '../cadastro/cadastro-cidadao.html';
          }
        } else {
          loginPath = '../modulos/login/login.html';
          cadastroPath = '../modulos/cadastro/cadastro-cidadao.html';
        }
        ultimasDenunciasContainer.innerHTML = `
          <div class="text-center p-3">
            <p class="text-muted mb-3">Faça login ou registre-se para ver suas denúncias e acompanhar o status dos problemas reportados.</p>
            <div class="d-flex gap-2 justify-content-center">
              <a href="${loginPath}" class="btn btn-primary btn-sm">Fazer Login</a>
              <a href="${cadastroPath}" class="btn btn-outline-primary btn-sm">Cadastrar-se</a>
            </div>
          </div>
        `;
      }
      
      const userImpactBody = document.getElementById('user-impact-body');
      if (userImpactBody) {
        const currentPath = window.location.pathname;
        let loginPath = '';
        let cadastroPath = '';
        
        if (currentPath.includes('/painel-cidadao/')) {
          if (currentPath.match(/\/painel-cidadao\/[^\/]+\//)) {
            // Subpasta: comunidade, dashboard, etc
            loginPath = '../../login/login.html';
            cadastroPath = '../../cadastro/cadastro-cidadao.html';
          } else {
            // Pasta principal: painel-cidadao/index.html
            loginPath = '../login/login.html';
            cadastroPath = '../cadastro/cadastro-cidadao.html';
          }
        } else {
          loginPath = '../modulos/login/login.html';
          cadastroPath = '../modulos/cadastro/cadastro-cidadao.html';
        }
        userImpactBody.innerHTML = `
          <div class="text-center p-3">
            <p class="text-muted mb-3">Faça login ou registre-se para ver seu impacto na comunidade e acompanhar as denúncias resolvidas.</p>
            <div class="d-flex gap-2 justify-content-center">
              <a href="${loginPath}" class="btn btn-primary btn-sm">Fazer Login</a>
              <a href="${cadastroPath}" class="btn btn-outline-primary btn-sm">Cadastrar-se</a>
            </div>
          </div>
        `;
      }
      
      // Atualiza estatísticas para mostrar zero
      const quickTotal = document.getElementById('quick-total');
      const quickResolved = document.getElementById('quick-resolved');
      const quickProgress = document.getElementById('quick-progress');
      if (quickTotal) quickTotal.textContent = '0';
      if (quickResolved) quickResolved.textContent = '0';
      if (quickProgress) quickProgress.textContent = '0';
      
      // Calcula caminhos uma vez para reutilizar
      const currentPath = window.location.pathname;
      let loginPath = '';
      let cadastroPath = '';
      
      if (currentPath.includes('/painel-cidadao/')) {
        if (currentPath.match(/\/painel-cidadao\/[^\/]+\//)) {
          // Subpasta: comunidade, dashboard, etc
          loginPath = '../../login/login.html';
          cadastroPath = '../../cadastro/cadastro-cidadao.html';
        } else {
          // Pasta principal: painel-cidadao/index.html
          loginPath = '../login/login.html';
          cadastroPath = '../cadastro/cadastro-cidadao.html';
        }
      } else {
        loginPath = '../modulos/login/login.html';
        cadastroPath = '../modulos/cadastro/cadastro-cidadao.html';
      }
      
      // Bloqueia o botão de reportar e adiciona aviso
      const linkReportar = document.getElementById('link-reportar');
      const btnReportar = document.getElementById('btn-reportar');
      const userPanelContent = document.querySelector('.user-panel-content');
      
      if (linkReportar && btnReportar) {
        linkReportar.href = loginPath;
        linkReportar.onclick = function(e) {
          e.preventDefault();
          alert('Você precisa estar logado para reportar uma ocorrência. Por favor, faça login ou cadastre-se primeiro.');
          window.location.href = loginPath;
        };
        btnReportar.innerHTML = '<p>Faça login para reportar</p>';
      }
      
      // Adiciona aviso no card do painel do usuário
      if (userPanelContent) {
        // Remove aviso anterior se existir
        const avisoAnterior = userPanelContent.querySelector('.alert-info');
        if (avisoAnterior) {
          avisoAnterior.remove();
        }
        
        const avisoDiv = document.createElement('div');
        avisoDiv.className = 'alert alert-info mt-3 mb-0';
        avisoDiv.innerHTML = `
          <i class="fa-solid fa-info-circle me-2"></i>
          <strong>Você precisa estar logado</strong> para reportar denúncias e acompanhar seus problemas. 
          <a href="${loginPath}" class="alert-link">Faça login</a> ou 
          <a href="${cadastroPath}" class="alert-link">cadastre-se</a> para começar.
        `;
        
        // Insere o aviso antes do footer
        const userPanelFooter = document.getElementById('user-panel-footer');
        if (userPanelFooter && userPanelFooter.parentNode) {
          userPanelFooter.parentNode.insertBefore(avisoDiv, userPanelFooter);
        } else if (userPanelContent) {
          // Se não encontrar o footer, adiciona no final do content
          userPanelContent.appendChild(avisoDiv);
        }
      }
      
      return;
    }
    
    // Tenta buscar do endpoint /cidadaos primeiro, depois /usuarios como fallback
    let usuario = await fetchJson(`/cidadaos/${user.id}`);
    if (!usuario || !usuario.id) {
      usuario = await fetchJson(`/usuarios/${user.id}`);
    }
    if (!usuario) usuario = user; // Fallback para dados da sessão

    // Atualiza informações do usuário no painel
    updateUserInfo(usuario);

    // Atualiza estatísticas do usuário
    await updateUserStats(usuario.id);

    // Busca denúncias do usuário usando cidadaoId, filtrando denúncias LEGACY/simuladas
    console.log('[Últimas Denúncias] Buscando para usuário ID:', usuario.id, 'tipo:', typeof usuario.id);
    // Busca de /denuncias ao invés de /ocorrencias
    const todasDenuncias = await fetchJson(`/denuncias?cidadaoId=${usuario.id}&_sort=dataRegistro&_order=desc`);
    console.log('[Últimas Denúncias] Total encontrado antes do filtro:', Array.isArray(todasDenuncias) ? todasDenuncias.length : 0);
    
    // Prepara IDs para comparação (aceita string ou número)
    const usuarioIdNum = parseInt(usuario.id, 10);
    const usuarioIdStr = String(usuario.id);
    
    // Filtra apenas denúncias reais do usuário (exclui LEGACY e verifica cidadaoId)
    const denunciasFiltradas = Array.isArray(todasDenuncias)
      ? todasDenuncias.filter(d => {
            // Exclui denúncias LEGACY/simuladas
            if (d.codigoOcorrencia && d.codigoOcorrencia.startsWith('LEGACY-')) {
              return false;
            }
            
            // Garante que a denúncia pertence ao usuário atual (aceita string ou número)
            const cidadaoId = d.cidadaoId;
            const usuarioId = d.usuarioId;
            
            if (cidadaoId) {
              const cidadaoIdNum = parseInt(cidadaoId, 10);
              const cidadaoIdStr = String(cidadaoId);
              // Compara de múltiplas formas para garantir match
              if ((!Number.isNaN(cidadaoIdNum) && cidadaoIdNum === usuarioIdNum) || 
                  (cidadaoIdStr === usuarioIdStr) || 
                  (String(cidadaoId) === String(usuario.id))) {
                console.log('[Últimas Denúncias] Match por cidadaoId:', cidadaoId, 'com usuário:', usuario.id);
                return true;
              }
            }
            
            if (usuarioId) {
              const usuarioIdNumDenuncia = parseInt(usuarioId, 10);
              const usuarioIdStrDenuncia = String(usuarioId);
              if ((!Number.isNaN(usuarioIdNumDenuncia) && usuarioIdNumDenuncia === usuarioIdNum) || 
                  (usuarioIdStrDenuncia === usuarioIdStr) || 
                  (String(usuarioId) === String(usuario.id))) {
                console.log('[Últimas Denúncias] Match por usuarioId:', usuarioId, 'com usuário:', usuario.id);
                return true;
              }
            }
            
            return false;
          })
      : [];
    
    // Ordena por data de registro (mais recentes primeiro) e limita a 2 denúncias
    const ultimasDenuncias = denunciasFiltradas
      .sort((a, b) => {
        const dateA = new Date(a.dataRegistro || a.createdAt || 0);
        const dateB = new Date(b.dataRegistro || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime(); // Ordem decrescente (mais recente primeiro)
      })
      .slice(0, 2); // Limita a no máximo 2 denúncias
    
    console.log('[Últimas Denúncias] Após filtro:', ultimasDenuncias.length, 'denúncias');
    
    const ultimasDenunciasContainer = document.getElementById('ultimas-denuncias');
    
    if (ultimasDenunciasContainer) {
      if (ultimasDenuncias.length === 0) {
        ultimasDenunciasContainer.innerHTML = '<p class="text-muted small">Você ainda não possui denúncias.</p>';
      } else {
        ultimasDenunciasContainer.innerHTML = '';
        ultimasDenuncias.forEach((denuncia, index) => {
          const denunciaDiv = document.createElement('div');
          const statusValue = denuncia.statusAtual || denuncia.status || denuncia.statusOriginal || 'Pendente';
          denunciaDiv.className = `denuncia-item status-${normalizeStatus(statusValue)}`;
          const safeTitulo = escapeHtml(denuncia.titulo || 'Ocorrência');
          const safeStatus = escapeHtml(getStatusLabel(statusValue));
          const safeTipo = escapeHtml(denuncia.tipoProblema || denuncia.tipo || 'Tipo');
          const safeBairro = escapeHtml(denuncia.endereco?.bairro || 'Bairro não informado');
          const safeData = escapeHtml(formatDate(denuncia.dataRegistro || denuncia.createdAt));
          denunciaDiv.innerHTML = `
            <div class="denuncia-titulo">${index + 1}. ${safeTitulo}</div>
            <div class="denuncia-meta">
              ${safeStatus} • ${safeTipo} • ${safeBairro} • ${safeData}
            </div>
          `;
          ultimasDenunciasContainer.appendChild(denunciaDiv);
        });
      }
    }

    // Atualiza o subtítulo para o texto padrão quando há usuário logado
    const welcomeSubtitle = document.getElementById('welcome-subtitle');
    if (welcomeSubtitle) {
      welcomeSubtitle.textContent = 'Acompanhe suas denúncias e o que está acontecendo na sua cidade';
    }
    
    // Populate recent reports (da cidade - mantém padrão) e impacto do usuário
    await Promise.all([
      populateRecentReports(), // Mantém padrão - mostra da cidade
      populateUserImpact() // Apenas do usuário
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
