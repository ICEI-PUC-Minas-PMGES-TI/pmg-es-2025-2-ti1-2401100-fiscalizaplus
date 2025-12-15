// Script completo para o painel de usuário
(function() {
  'use strict';
  
  const API_BASE = window.location.origin;
  
  // Função para obter usuário corrente
  function getUsuarioCorrente() {
    try {
      const isGuest = sessionStorage.getItem('isGuest') === 'true';
      if (isGuest) return null;
      
      const keys = ['usuarioCorrente', 'fp_user', 'user'];
      for (const key of keys) {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
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
  
  // Função para normalizar status
  function normalizeStatus(status) {
    const raw = String(status || '').toLowerCase().trim();
    if (['aberto', 'novo', 'pendente', 'aguardando'].includes(raw)) return 'pendente';
    if (['em andamento', 'em_andamento', 'andamento', 'em analise', 'analise'].includes(raw)) return 'andamento';
    if (['resolvido', 'concluido', 'finalizado', 'resolvida', 'concluida', 'finalizada'].includes(raw)) return 'concluido';
    return raw.replace(/\s+/g, '_');
  }
  
  // Função para buscar dados da API
  async function fetchJson(url) {
    try {
      const response = await fetch(`${API_BASE}${url}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Erro ao buscar ${url}:`, error);
      return null;
    }
  }
  
  // Função para formatar data
  function formatDate(dateString) {
    if (!dateString) return 'Data não informada';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return 'Data inválida';
    }
  }
  
  // Função para calcular tempo relativo
  function timeAgo(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const diff = Math.floor((now - date) / 1000);
      const minutes = Math.floor(diff / 60);
      const hours = Math.floor(diff / 3600);
      const days = Math.floor(diff / 86400);
      
      if (diff < 60) return 'há poucos segundos';
      if (minutes < 60) return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
      if (hours < 24) return `há ${hours} hora${hours > 1 ? 's' : ''}`;
      if (days < 7) return `há ${days} dia${days > 1 ? 's' : ''}`;
      return formatDate(dateString);
    } catch {
      return '';
    }
  }
  
  // Função para escapar HTML
  function escapeHtml(str) {
    return String(str).replace(/[&<>"]+/g, s => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[s]));
  }
  
  // Função para atualizar perfil do usuário
  async function updateUserProfile() {
    const user = getUsuarioCorrente();
    if (!user || !user.id) {
      // Redireciona para login se não estiver logado
      window.location.href = '../login/login.html';
      return;
    }
    
    // Busca dados completos do usuário
    let usuario = await fetchJson(`/cidadaos/${user.id}`);
    if (!usuario || !usuario.id) {
      usuario = await fetchJson(`/usuarios/${user.id}`);
    }
    if (!usuario) usuario = user;
    
    const nomeCompleto = usuario.nomeCompleto || usuario.nome || 'Usuário';
    const email = usuario.email || '';
    const inicial = nomeCompleto.charAt(0).toUpperCase();
    
    // Atualiza perfil na sidebar
    const profileInfo = document.querySelector('.profile__info');
    if (profileInfo) {
      const strong = profileInfo.querySelector('strong');
      const span = profileInfo.querySelector('span');
      if (strong) strong.textContent = nomeCompleto;
      if (span) span.textContent = email;
    }
    
    // Atualiza avatar
    const profileAvatar = document.querySelector('.profile__avatar');
    if (profileAvatar) {
      profileAvatar.textContent = inicial;
    }
    
    // Atualiza nome no navbar
    const nameUserLg = document.getElementById('name-user-lg');
    const nameUserOffcanvas = document.getElementById('name-user-offcanvas');
    if (nameUserLg) nameUserLg.textContent = `Olá, ${nomeCompleto.split(' ')[0]}`;
    if (nameUserOffcanvas) nameUserOffcanvas.textContent = `Olá, ${nomeCompleto.split(' ')[0]}`;
    
    return usuario;
  }
  
  // Função para carregar denúncias do usuário
  async function loadUserReports(usuario) {
    if (!usuario || !usuario.id) return;
    
    // Prepara IDs para comparação (aceita string ou número)
    const usuarioIdNum = parseInt(usuario.id, 10);
    const usuarioIdStr = String(usuario.id);
    const emailUsuario = (usuario.email || '').toLowerCase().trim();
    
    // Busca denúncias do usuário - tenta múltiplas formas (ordenado por mais recentes primeiro)
    let denuncias = await fetchJson(`/denuncias?cidadaoId=${usuario.id}&_sort=dataRegistro&_order=desc`);
    
    // Se não encontrar, busca todas e filtra localmente (mais confiável)
    if (!Array.isArray(denuncias) || denuncias.length === 0) {
      const todasDenuncias = await fetchJson('/denuncias');
      if (Array.isArray(todasDenuncias)) {
        denuncias = todasDenuncias.filter(d => {
          // Exclui denúncias LEGACY
          if (d.codigoOcorrencia && d.codigoOcorrencia.startsWith('LEGACY-')) {
            return false;
          }
          
          // Verifica por cidadaoId (aceita string ou número)
          if (d.cidadaoId) {
            const cidadaoIdNum = parseInt(d.cidadaoId, 10);
            const cidadaoIdStr = String(d.cidadaoId);
            if ((!Number.isNaN(cidadaoIdNum) && cidadaoIdNum === usuarioIdNum) || 
                (cidadaoIdStr === usuarioIdStr) ||
                (String(d.cidadaoId) === String(usuario.id))) {
              return true;
            }
          }
          
          // Verifica por email (fallback para compatibilidade)
          if (emailUsuario) {
            const emailDenuncia = (d.contatoCidadao || '').toLowerCase().trim();
            if (emailDenuncia === emailUsuario) {
              return true;
            }
          }
          
          return false;
        });
      }
    } else {
      // Se encontrou por cidadaoId, ainda filtra LEGACY e verifica se realmente pertence ao usuário
      denuncias = denuncias.filter(d => {
        // Exclui denúncias LEGACY
        if (d.codigoOcorrencia && d.codigoOcorrencia.startsWith('LEGACY-')) {
          return false;
        }
        
        // Verifica se realmente pertence ao usuário
        if (d.cidadaoId) {
          const cidadaoIdNum = parseInt(d.cidadaoId, 10);
          const cidadaoIdStr = String(d.cidadaoId);
          return ((!Number.isNaN(cidadaoIdNum) && cidadaoIdNum === usuarioIdNum) || 
                  (cidadaoIdStr === usuarioIdStr) ||
                  (String(d.cidadaoId) === String(usuario.id)));
        }
        
        return false;
      });
    }
    
    if (!Array.isArray(denuncias)) denuncias = [];
    
    // Ordena denúncias por data de registro (mais recentes primeiro)
    denuncias.sort((a, b) => {
      const dateA = new Date(a.dataRegistro || a.createdAt || 0).getTime();
      const dateB = new Date(b.dataRegistro || b.createdAt || 0).getTime();
      return dateB - dateA; // Ordem decrescente (mais recentes primeiro)
    });
    
    console.log(`[Painel Usuário] Encontradas ${denuncias.length} denúncias do usuário ${usuario.id}`);
    
    // Renderiza denúncias
    renderReports(denuncias);
    
    // Atualiza atualizações recentes (apenas quando status foi alterado)
    updateRecentUpdates(denuncias);
  }
  
  // Variáveis de paginação
  let currentPage = 1;
  const itemsPerPage = 5;
  let allDenuncias = [];
  
  // Função para renderizar relatos com paginação
  function renderReports(denuncias) {
    const reportsContainer = document.querySelector('.reports');
    if (!reportsContainer) return;
    
    // Ordena denúncias por data de registro (mais recentes primeiro) antes de salvar
    const denunciasOrdenadas = [...denuncias].sort((a, b) => {
      const dateA = new Date(a.dataRegistro || a.createdAt || 0).getTime();
      const dateB = new Date(b.dataRegistro || b.createdAt || 0).getTime();
      return dateB - dateA; // Ordem decrescente (mais recentes primeiro)
    });
    
    // Salva todas as denúncias (já ordenadas)
    allDenuncias = denunciasOrdenadas;
    window.allDenunciasOriginal = denunciasOrdenadas; // Salva original para filtros
    currentPage = 1;
    
    if (denuncias.length === 0) {
      reportsContainer.innerHTML = `
        <article class="report">
          <div class="report__body">
            <p class="text-muted">Você ainda não possui denúncias registradas.</p>
          </div>
        </article>
      `;
      // Remove paginação se existir
      const existingPagination = document.querySelector('.pagination-container');
      if (existingPagination) {
        existingPagination.remove();
      }
      return;
    }
    
    // Remove paginação existente antes de renderizar
    const existingPagination = document.querySelector('.pagination-container');
    if (existingPagination) {
      existingPagination.remove();
    }
    
    // Renderiza a página atual
    renderPage(currentPage);
    
    // Cria paginação se houver mais de 5 denúncias
    if (denunciasOrdenadas.length > itemsPerPage) {
      createPagination(denunciasOrdenadas.length);
    }
  }
  
  // Função para renderizar uma página específica
  function renderPage(page) {
    const reportsContainer = document.querySelector('.reports');
    if (!reportsContainer) return;
    
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const denunciasToShow = allDenuncias.slice(startIndex, endIndex);
    
    reportsContainer.innerHTML = '';
    
    // Remove classe single-report para manter tamanho padrão
    reportsContainer.classList.remove('single-report');
    
    denunciasToShow.forEach((denuncia, index) => {
      const status = normalizeStatus(denuncia.statusAtual || denuncia.status || 'pendente');
      const statusLabel = {
        'pendente': 'Pendente',
        'andamento': 'Em Análise',
        'concluido': 'Resolvido'
      }[status] || 'Pendente';
      
      const statusClass = {
        'pendente': 'status--pendente',
        'andamento': 'status--andamento',
        'concluido': 'status--concluido'
      }[status] || 'status--pendente';
      
      const lat = denuncia.endereco?.latitude || denuncia.lat || null;
      const lng = denuncia.endereco?.longitude || denuncia.lng || null;
      const dataRegistro = denuncia.dataRegistro || denuncia.createdAt || '';
      const timeText = timeAgo(dataRegistro);
      const codigo = denuncia.codigoOcorrencia || `OCOR-${String(denuncia.id).padStart(6, '0')}`;
      
      const reportArticle = document.createElement('article');
      reportArticle.className = 'report';
      reportArticle.setAttribute('data-id', denuncia.id);
      reportArticle.setAttribute('data-status', status);
      
      const inicial = (denuncia.autorCidadao || 'U').charAt(0).toUpperCase();
      
      reportArticle.innerHTML = `
        <div class="report__avatar">${inicial}</div>
        <div class="report__body">
          <h3 class="report__title">${escapeHtml(denuncia.titulo || 'Sem título')}</h3>
          <span class="report__time">${escapeHtml(timeText || formatDate(dataRegistro))}</span>
          <div class="report__status">
            <span class="status-pill ${statusClass}">
              <i class="dot"></i><span class="status-text">${statusLabel}</span>
            </span>
          </div>
        </div>
        ${lat && lng ? `
          <div class="occurrence-map-canvas" data-lat="${lat}" data-lng="${lng}"
            style="height:80px; width:100%; border-radius:8px; overflow:hidden; min-height:80px;"></div>
        ` : ''}
      `;
      
      // Adiciona evento de clique para abrir modal
      reportArticle.style.cursor = 'pointer';
      reportArticle.addEventListener('click', () => {
        openReportModal(denuncia);
      });
      
      // Adiciona hover effect
      reportArticle.addEventListener('mouseenter', () => {
        reportArticle.style.transform = 'translateY(-2px)';
        reportArticle.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      });
      reportArticle.addEventListener('mouseleave', () => {
        reportArticle.style.transform = '';
        reportArticle.style.boxShadow = '';
      });
      
      reportsContainer.appendChild(reportArticle);
    });
    
    // Inicializa mapas manualmente
    setTimeout(() => {
      const mapCanvases = document.querySelectorAll('.occurrence-map-canvas');
      mapCanvases.forEach(canvas => {
        const lat = parseFloat(canvas.getAttribute('data-lat'));
        const lng = parseFloat(canvas.getAttribute('data-lng'));
        if (lat && lng && typeof L !== 'undefined' && !isNaN(lat) && !isNaN(lng)) {
          try {
            const map = L.map(canvas, { 
              attributionControl: false, 
              zoomControl: false,
              scrollWheelZoom: false,
              doubleClickZoom: false,
              dragging: false
            });
            map.setView([lat, lng], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
              maxZoom: 19,
              attribution: ''
            }).addTo(map);
            L.marker([lat, lng]).addTo(map);
          } catch (error) {
            console.error('Erro ao inicializar mapa:', error);
          }
        }
      });
    }, 200);
    
    // Reaplica filtros
    reapplyFilters();
  }
  
  // Função para criar paginação
  function createPagination(totalItems) {
    // Remove paginação existente
    const existingPagination = document.querySelector('.pagination-container');
    if (existingPagination) {
      existingPagination.remove();
    }
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const reportsContainer = document.querySelector('.reports');
    if (!reportsContainer) return;
    
    // Cria container de paginação
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    paginationContainer.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1.5rem; flex-wrap: wrap;';
    
    // Botão anterior
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-btn';
    prevButton.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
        updatePagination(totalPages);
        reapplyFilters();
      }
    });
    paginationContainer.appendChild(prevButton);
    
    // Botões de página
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'pagination-pages';
    pagesContainer.style.cssText = 'display: flex; gap: 0.5rem; flex-wrap: wrap;';
    
    // Calcula quais páginas mostrar
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Ajusta para sempre mostrar 5 botões quando possível
    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + 4);
      } else if (endPage === totalPages) {
        startPage = Math.max(1, endPage - 4);
      }
    }
    
    // Botão primeira página
    if (startPage > 1) {
      const firstBtn = createPageButton(1, totalPages);
      pagesContainer.appendChild(firstBtn);
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.style.cssText = 'padding: 0.5rem; color: var(--text-secondary);';
        pagesContainer.appendChild(ellipsis);
      }
    }
    
    // Botões de páginas
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = createPageButton(i, totalPages);
      pagesContainer.appendChild(pageBtn);
    }
    
    // Botão última página
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.style.cssText = 'padding: 0.5rem; color: var(--text-secondary);';
        pagesContainer.appendChild(ellipsis);
      }
      const lastBtn = createPageButton(totalPages, totalPages);
      pagesContainer.appendChild(lastBtn);
    }
    
    paginationContainer.appendChild(pagesContainer);
    
    // Botão próximo
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-btn';
    nextButton.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
        updatePagination(totalPages);
        reapplyFilters();
      }
    });
    paginationContainer.appendChild(nextButton);
    
    // Insere após o container de reports
    reportsContainer.parentNode.insertBefore(paginationContainer, reportsContainer.nextSibling);
    
    // Salva referências para atualização
    window.paginationElements = {
      prevButton,
      nextButton,
      pagesContainer,
      container: paginationContainer
    };
  }
  
  // Função para criar botão de página
  function createPageButton(pageNum, totalPages) {
    const button = document.createElement('button');
    button.className = 'pagination-page-btn';
    button.textContent = pageNum;
    button.dataset.page = pageNum;
    
    if (pageNum === currentPage) {
      button.classList.add('active');
    }
    
    button.addEventListener('click', () => {
      currentPage = pageNum;
      renderPage(currentPage);
      updatePagination(totalPages);
      reapplyFilters();
    });
    
    return button;
  }
  
  // Função para atualizar paginação
  function updatePagination(totalPages) {
    if (!window.paginationElements) return;
    
    const { prevButton, nextButton, pagesContainer } = window.paginationElements;
    
    // Atualiza botões anterior/próximo
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
    
    // Atualiza botões de página
    const pageButtons = pagesContainer.querySelectorAll('.pagination-page-btn');
    pageButtons.forEach(btn => {
      const pageNum = parseInt(btn.dataset.page);
      if (pageNum === currentPage) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  // Função para atualizar atualizações recentes (apenas quando status foi alterado)
  function updateRecentUpdates(denuncias) {
    const updatesContainer = document.querySelector('.updates');
    if (!updatesContainer) return;
    
    // Filtra apenas denúncias onde o status foi ALTERADO
    // (dataUltimaAtualizacaoStatus deve ser diferente de dataRegistro)
    const atualizacoes = denuncias
      .filter(d => {
        const dataRegistro = d.dataRegistro || d.createdAt || '';
        const dataAtualizacao = d.dataUltimaAtualizacaoStatus || '';
        
        // Só mostra se houve atualização de status (data diferente)
        if (!dataAtualizacao || !dataRegistro) return false;
        
        const registro = new Date(dataRegistro).getTime();
        const atualizacao = new Date(dataAtualizacao).getTime();
        
        // Retorna true apenas se a data de atualização for diferente (e posterior) à data de registro
        return atualizacao > registro;
      })
      .sort((a, b) => {
        // Ordena por data de atualização (mais recentes primeiro)
        const dateA = new Date(a.dataUltimaAtualizacaoStatus || 0).getTime();
        const dateB = new Date(b.dataUltimaAtualizacaoStatus || 0).getTime();
        return dateB - dateA; // Ordem decrescente (mais recentes primeiro)
      })
      .slice(0, 5); // Limita a 5 atualizações mais recentes
    
    const updatesTitle = updatesContainer.querySelector('.updates__title');
    if (!updatesTitle) return;
    
    const existingUpdates = updatesContainer.querySelectorAll('.update');
    existingUpdates.forEach(update => update.remove());
    
    if (atualizacoes.length === 0) {
      const noUpdates = document.createElement('div');
      noUpdates.className = 'update';
      noUpdates.innerHTML = `
        <div class="update__text">
          <span>Nenhuma atualização de status recente</span>
        </div>
      `;
      updatesContainer.appendChild(noUpdates);
      return;
    }
    
    atualizacoes.forEach(denuncia => {
      const status = normalizeStatus(denuncia.statusAtual || denuncia.status || 'pendente');
      const statusLabel = {
        'pendente': 'pendente',
        'andamento': 'em andamento',
        'concluido': 'concluída'
      }[status] || 'pendente';
      
      const codigo = denuncia.codigoOcorrencia || `OCOR-${String(denuncia.id).padStart(6, '0')}`;
      const inicial = (denuncia.autorCidadao || 'U').charAt(0).toUpperCase();
      const dataAtualizacao = denuncia.dataUltimaAtualizacaoStatus || '';
      const timeText = timeAgo(dataAtualizacao);
      
      const updateDiv = document.createElement('div');
      updateDiv.className = 'update';
      updateDiv.innerHTML = `
        <div class="update__avatar">${inicial}</div>
        <div class="update__text">
          <strong>Ocor.: ${escapeHtml(codigo)}</strong>
          <span>atualizada para <em>${statusLabel}</em> ${timeText ? `(${escapeHtml(timeText)})` : ''}</span>
        </div>
      `;
      updatesContainer.appendChild(updateDiv);
    });
  }
  
  // Função para abrir modal com detalhes da denúncia
  async function openReportModal(denuncia) {
    const modal = document.getElementById('report-detail-modal');
    if (!modal) {
      console.error('Modal não encontrado');
      return;
    }
    
    const title = document.getElementById('report-detail-title');
    const status = document.getElementById('report-detail-status');
    const dates = document.getElementById('report-detail-dates');
    const type = document.getElementById('report-detail-type');
    const desc = document.getElementById('report-detail-desc');
    const extra = document.getElementById('report-detail-extra');
    
    if (title) title.textContent = denuncia.titulo || 'Denúncia';
    
    // Status
    const normalizedStatus = normalizeStatus(denuncia.statusAtual || denuncia.status || 'pendente');
    const statusLabel = {
      'pendente': 'Pendente',
      'andamento': 'Em Análise',
      'concluido': 'Resolvido'
    }[normalizedStatus] || 'Pendente';
    
    const statusColor = {
      'pendente': 'bg-danger',
      'andamento': 'bg-warning text-dark',
      'concluido': 'bg-success'
    }[normalizedStatus] || 'bg-secondary';
    
    if (status) {
      status.className = `badge rounded-pill ${statusColor}`;
      status.textContent = statusLabel;
    }
    
    // Datas
    if (dates) {
      const dataRegistro = formatDate(denuncia.dataRegistro || denuncia.createdAt);
      const dataAtualizacao = formatDate(denuncia.dataUltimaAtualizacaoStatus || denuncia.updatedAt);
      const dataResolucao = normalizedStatus === 'concluido' ? formatDate(denuncia.dataConclusao || denuncia.dataUltimaAtualizacaoStatus) : '-';
      
      dates.innerHTML = `
        <span class="me-2"><i class="fa-regular fa-clock"></i> Criado: <strong>${dataRegistro || 'n/d'}</strong></span>
        <span class="me-2"><i class="fa-solid fa-arrow-rotate-right"></i> Atualizado: <strong>${dataAtualizacao || '-'}</strong></span>
        ${normalizedStatus === 'concluido' ? `<span><i class="fa-solid fa-flag-checkered"></i> Resolvido: <strong>${dataResolucao || '-'}</strong></span>` : ''}
      `;
    }
    
    // Tipo
    if (type) type.textContent = denuncia.tipoProblema || denuncia.tipo || '—';
    
    // Descrição
    if (desc) desc.textContent = denuncia.descricaoCompleta || denuncia.descricao || '-';
    
    // Informações extras (localização e mapa)
    if (extra) {
      extra.innerHTML = '<div class="text-muted small mb-2">Carregando informações...</div>';
      
      // Busca informações adicionais
      const latValue = typeof denuncia.lat === 'string' ? parseFloat(denuncia.lat) : (denuncia.endereco?.latitude || denuncia.lat);
      const lngValue = typeof denuncia.lng === 'string' ? parseFloat(denuncia.lng) : (denuncia.endereco?.longitude || denuncia.lng);
      const hasCoords = Number.isFinite(latValue) && Number.isFinite(lngValue);
      
      const bairroNome = denuncia.endereco?.bairro || denuncia.bairroNome || '';
      const cidadeNome = denuncia.endereco?.cidade || denuncia.cidadeNome || '';
      const rua = denuncia.endereco?.rua || '';
      const numero = denuncia.endereco?.numero || '';
      
      // Monta HTML das informações extras
      let extraHtml = '<hr class="my-3">';
      extraHtml += '<div class="small text-muted mb-2">Localização</div>';
      extraHtml += '<ul class="list-unstyled mb-3 small">';
      
      if (rua && numero) {
        extraHtml += `<li><i class="fa-solid fa-map-marker-alt"></i> Endereço: <strong>${escapeHtml(rua)}, ${escapeHtml(numero)}</strong></li>`;
      }
      if (bairroNome) {
        extraHtml += `<li><i class="fa-solid fa-location-dot"></i> Bairro: <strong>${escapeHtml(bairroNome)}</strong></li>`;
      }
      if (cidadeNome) {
        extraHtml += `<li><i class="fa-regular fa-building"></i> Cidade: <strong>${escapeHtml(cidadeNome)}</strong></li>`;
      }
      
      extraHtml += '</ul>';
      
      if (hasCoords) {
        extraHtml += '<div id="report-detail-map" class="impact-map mt-2" style="height: 300px; width: 100%; border-radius: 8px; overflow: hidden;"></div>';
      } else {
        extraHtml += '<p class="text-muted small">Localização não disponível.</p>';
      }
      
      extra.innerHTML = extraHtml;
      
      // Renderiza mapa se houver coordenadas
      if (hasCoords && typeof L !== 'undefined') {
        setTimeout(() => {
          const mapEl = document.getElementById('report-detail-map');
          if (mapEl) {
            mapEl.innerHTML = '';
            const map = L.map(mapEl, { 
              attributionControl: false, 
              zoomControl: true 
            });
            map.setView([latValue, lngValue], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
              maxZoom: 19 
            }).addTo(map);
            L.marker([latValue, lngValue]).addTo(map);
            
            // Ajusta tamanho após animação do modal
            setTimeout(() => {
              try {
                map.invalidateSize();
              } catch(e) {
                console.error('Erro ao ajustar mapa:', e);
              }
            }, 300);
          }
        }, 100);
      }
    }
    
    // Abre o modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Limpa o mapa quando o modal é fechado
    modal.addEventListener('hidden.bs.modal', function onModalHidden() {
      const mapEl = document.getElementById('report-detail-map');
      if (mapEl) {
        mapEl.innerHTML = '';
      }
      modal.removeEventListener('hidden.bs.modal', onModalHidden);
    });
  }
  
  // Função para reaplicar filtros (não é mais necessária, mas mantida para compatibilidade)
  function reapplyFilters() {
    // Os filtros agora são aplicados antes da renderização
    // Esta função é mantida apenas para compatibilidade
    const reportsContainer = document.querySelector('.reports');
    if (reportsContainer) {
      // Remove classe single-report para manter tamanho padrão
      reportsContainer.classList.remove('single-report');
    }
  }
  
  // Inicialização
  async function init() {
    // Atualiza perfil do usuário
    const usuario = await updateUserProfile();
    
    // Carrega denúncias
    await loadUserReports(usuario);
    
    // Salva todas as denúncias originais para filtros
    window.allDenunciasOriginal = allDenuncias;
    
    // Inicializa filtros de abas
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const filtro = tab.getAttribute('data-filter');
        
        // Usa as denúncias originais para filtrar
        const denunciasOriginais = window.allDenunciasOriginal || allDenuncias;
        
        // Filtra denúncias antes de renderizar
        let denunciasFiltradas = [...denunciasOriginais]; // Cria cópia
        if (filtro !== 'todos') {
          denunciasFiltradas = denunciasOriginais.filter(d => {
            const status = normalizeStatus(d.statusAtual || d.status || 'pendente');
            return status === filtro;
          });
        }
        
        // Ordena denúncias filtradas por data de registro (mais recentes primeiro)
        denunciasFiltradas.sort((a, b) => {
          const dateA = new Date(a.dataRegistro || a.createdAt || 0).getTime();
          const dateB = new Date(b.dataRegistro || b.createdAt || 0).getTime();
          return dateB - dateA; // Ordem decrescente (mais recentes primeiro)
        });
        
        // Atualiza lista de denúncias e renderiza primeira página
        allDenuncias = denunciasFiltradas;
        currentPage = 1;
        
        // Remove paginação existente
        const existingPagination = document.querySelector('.pagination-container');
        if (existingPagination) {
          existingPagination.remove();
        }
        
        // Renderiza página
        renderPage(currentPage);
        
        // Recria paginação se necessário
        if (denunciasFiltradas.length > itemsPerPage) {
          createPagination(denunciasFiltradas.length);
        }
        
        // Atualiza estado visual das abas
        tabs.forEach(t => {
          const isActive = t === tab;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-selected', isActive);
        });
        
        // Atualiza dropdown mobile se existir
        updateMobileDropdown(filtro);
      });
    });
    
    // Inicializa dropdown mobile
    initMobileDropdown();
  }
  
  // Função para inicializar dropdown mobile
  function initMobileDropdown() {
    const dropdownBtn = document.getElementById('filterDropdownBtn');
    const dropdownMenu = document.getElementById('filterDropdownMenu');
    const dropdownItems = document.querySelectorAll('.filter-dropdown-item');
    
    if (!dropdownBtn || !dropdownMenu) return;
    
    // Toggle dropdown
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = dropdownBtn.getAttribute('aria-expanded') === 'true';
      dropdownBtn.setAttribute('aria-expanded', !isExpanded);
      dropdownMenu.classList.toggle('show', !isExpanded);
    });
    
    // Fecha dropdown ao clicar fora
    document.addEventListener('click', (e) => {
      if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownBtn.setAttribute('aria-expanded', 'false');
        dropdownMenu.classList.remove('show');
      }
    });
    
    // Handler para itens do dropdown
    dropdownItems.forEach(item => {
      item.addEventListener('click', () => {
        const filtro = item.getAttribute('data-filter');
        
        // Dispara o mesmo evento que as tabs normais
        const tab = document.querySelector(`.tab[data-filter="${filtro}"]`);
        if (tab) {
          tab.click();
        }
        
        // Atualiza texto do botão
        const filterLabels = {
          'todos': 'Todos',
          'pendente': 'Pendentes',
          'andamento': 'Em Análise',
          'concluido': 'Resolvidos'
        };
        
        const selectedText = document.querySelector('.filter-selected-text');
        if (selectedText) {
          selectedText.textContent = filterLabels[filtro] || 'Todos';
        }
        
        // Atualiza estado visual
        dropdownItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Fecha dropdown
        dropdownBtn.setAttribute('aria-expanded', 'false');
        dropdownMenu.classList.remove('show');
      });
    });
  }
  
  // Função para atualizar dropdown mobile quando filtro muda
  function updateMobileDropdown(filtro) {
    const dropdownItems = document.querySelectorAll('.filter-dropdown-item');
    const selectedText = document.querySelector('.filter-selected-text');
    
    const filterLabels = {
      'todos': 'Todos',
      'pendente': 'Pendentes',
      'andamento': 'Em Análise',
      'concluido': 'Resolvidos'
    };
    
    if (selectedText) {
      selectedText.textContent = filterLabels[filtro] || 'Todos';
    }
    
    dropdownItems.forEach(item => {
      const itemFilter = item.getAttribute('data-filter');
      item.classList.toggle('active', itemFilter === filtro);
    });
  }
  
  // Aguarda DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

