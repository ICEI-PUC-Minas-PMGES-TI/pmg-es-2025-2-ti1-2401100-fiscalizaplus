/**
 * Script para carregar e exibir notificações dinâmicas para servidores
 */

(function() {
  const API_BASE = 'http://localhost:3000';
  const DENUNCIAS_ENDPOINT = `${API_BASE}/denuncias`;

  /**
   * Obtém o usuário servidor corrente do sessionStorage
   */
  function getUsuarioCorrente() {
    try {
      const keys = ['usuarioCorrente', 'fp_user', 'user'];
      for (const key of keys) {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.id && parsed.tipo === 'servidor') {
            return parsed;
          }
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Formata data relativa (ex: "Há 2 horas")
   */
  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${diffDays} dias`;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  }

  /**
   * Cria uma notificação a partir de uma denúncia
   */
  function createNotificationFromDenuncia(denuncia, tipo = 'nova') {
    const isNova = tipo === 'nova';
    const isStatusAlterado = tipo === 'status';
    
    let titulo = '';
    let mensagem = '';
    let badge = '';
    let importante = false;
    
    if (isNova) {
      titulo = 'Nova denúncia registrada';
      mensagem = `Uma nova denúncia foi registrada no bairro ${denuncia.endereco?.bairro || 'desconhecido'}. ${denuncia.prioridadeCidadao === 'critica' ? 'Requer atenção imediata.' : ''}`;
      badge = denuncia.prioridadeCidadao === 'critica' ? 'Urgente' : 'Informação';
      importante = denuncia.prioridadeCidadao === 'critica';
    } else if (isStatusAlterado) {
      titulo = 'Denúncia atualizada';
      mensagem = `A denúncia ${denuncia.codigoOcorrencia} teve seu status alterado para "${denuncia.statusAtual}".`;
      badge = 'Informação';
    }

    return {
      id: denuncia.id,
      titulo,
      mensagem,
      tempo: formatTimeAgo(isNova ? denuncia.dataRegistro : denuncia.dataUltimaAtualizacaoStatus),
      badge,
      importante,
      tipo: isNova ? 'nova' : 'atualizacao',
      data: isNova ? denuncia.dataRegistro : denuncia.dataUltimaAtualizacaoStatus,
      codigoOcorrencia: denuncia.codigoOcorrencia
    };
  }

  // Variáveis globais para paginação
  let allNotifications = [];
  let currentPage = 1;
  const itemsPerPage = 10;

  /**
   * Renderiza as notificações na página com paginação
   */
  function renderNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    const emptyState = document.getElementById('empty-notifications');
    
    if (!container) return;

    // Salva todas as notificações para filtros e paginação
    allNotifications = notifications;

    if (notifications.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('d-none');
      renderPagination();
      return;
    }

    if (emptyState) emptyState.classList.add('d-none');

    // Aplica filtros antes de paginar
    const filteredNotifications = applyFilters(notifications);
    
    // Calcula paginação
    const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    container.innerHTML = paginatedNotifications.map(notif => {
      const unreadClass = notif.lida ? '' : 'unread';
      const importantClass = notif.importante ? 'important' : '';
      const badgeClass = notif.badge === 'Urgente' ? 'badge-danger' : 
                        notif.badge === 'Informação' ? 'badge-info' : 'badge-success';

      return `
        <div class="notification-card ${unreadClass} ${importantClass}" data-id="${notif.id}" data-lida="${notif.lida}" data-tipo="${notif.tipo || ''}">
          <div class="notification-header">
            <div style="flex: 1;">
              <div class="notification-title">${notif.titulo}</div>
              <div class="notification-time"><i class="bi bi-clock me-1"></i>${notif.tempo}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="notification-badge ${badgeClass}">${notif.badge}</span>
              ${!notif.lida ? `<button class="btn btn-sm btn-outline-secondary mark-read-btn" style="padding: 4px 8px; font-size: 0.75rem;" title="Marcar como lida">
                <i class="bi bi-check"></i>
              </button>` : ''}
            </div>
          </div>
          <div class="notification-message">
            ${notif.mensagem}
          </div>
        </div>
      `;
    }).join('');

    // Adiciona listeners para marcar como lida individualmente
    container.querySelectorAll('.mark-read-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const card = this.closest('.notification-card');
        const notifId = card.dataset.id;
        markAsRead(notifId);
        
        // Atualiza na lista completa também
        const notif = allNotifications.find(n => n.id === notifId);
        if (notif) notif.lida = true;
        
        card.classList.remove('unread');
        card.dataset.lida = 'true';
        this.remove(); // Remove o botão após marcar como lida
        updateNotificationCount();
      });
    });

    // Renderiza paginação
    renderPagination(filteredNotifications.length);
  }

  /**
   * Aplica filtros às notificações
   */
  function applyFilters(notifications) {
    const tipoFilter = document.querySelector('.filters-section select:nth-of-type(1)');
    const statusFilter = document.querySelector('.filters-section select:nth-of-type(2)');
    const periodoFilter = document.querySelector('.filters-section select:nth-of-type(3)');

    let filtered = [...notifications];

    // Filtro por tipo
    if (tipoFilter && tipoFilter.value !== 'Todas') {
      filtered = filtered.filter(notif => {
        if (tipoFilter.value === 'Denúncias') {
          return notif.tipo === 'nova' || notif.tipo === 'atualizacao';
        } else if (tipoFilter.value === 'Sistema') {
          return notif.tipo === 'sistema';
        } else if (tipoFilter.value === 'Relatórios') {
          return notif.tipo === 'relatorio';
        }
        return true;
      });
    }

    // Filtro por status
    if (statusFilter && statusFilter.value !== 'Todas') {
      filtered = filtered.filter(notif => {
        if (statusFilter.value === 'Não lidas') {
          return !notif.lida;
        } else if (statusFilter.value === 'Lidas') {
          return notif.lida;
        }
        return true;
      });
    }

    // Filtro por período
    if (periodoFilter && periodoFilter.value !== 'Todos') {
      const now = new Date();
      let daysAgo = 0;
      
      if (periodoFilter.value === 'Últimos 7 dias') {
        daysAgo = 7;
      } else if (periodoFilter.value === 'Últimos 30 dias') {
        daysAgo = 30;
      }

      if (daysAgo > 0) {
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(notif => {
          const notifDate = new Date(notif.data);
          return notifDate >= cutoffDate;
        });
      }
    }

    return filtered;
  }

  /**
   * Renderiza controles de paginação
   */
  function renderPagination(totalItems = 0) {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    // Remove paginação anterior se existir
    const existingPagination = document.getElementById('notifications-pagination');
    if (existingPagination) {
      existingPagination.remove();
    }

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) return;

    const pagination = document.createElement('div');
    pagination.id = 'notifications-pagination';
    pagination.className = 'd-flex justify-content-center align-items-center mt-4 gap-2';
    pagination.innerHTML = `
      <button class="btn btn-outline-secondary btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
        <i class="bi bi-chevron-left"></i> Anterior
      </button>
      <span class="text-muted">
        Página ${currentPage} de ${totalPages} (${totalItems} notificações)
      </span>
      <button class="btn btn-outline-secondary btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
        Próxima <i class="bi bi-chevron-right"></i>
      </button>
    `;

    container.parentNode.insertBefore(pagination, container.nextSibling);
  }

  /**
   * Vai para uma página específica (exposta globalmente)
   */
  window.goToPage = function(page) {
    currentPage = page;
    renderNotifications(allNotifications);
  };

  /**
   * Marca uma notificação como lida
   */
  function markAsRead(notifId) {
    const read = JSON.parse(localStorage.getItem('notificacoesLidas') || '[]');
    if (!read.includes(notifId)) {
      read.push(notifId);
      localStorage.setItem('notificacoesLidas', JSON.stringify(read));
    }
  }

  /**
   * Carrega notificações do servidor
   */
  async function loadNotifications() {
    try {
      const user = getUsuarioCorrente();
      if (!user) return;

      // Busca todas as denúncias (o filtro de período será aplicado depois)
      const response = await fetch(DENUNCIAS_ENDPOINT);
      if (!response.ok) throw new Error('Erro ao buscar denúncias');

      const denuncias = await response.json();
      const read = JSON.parse(localStorage.getItem('notificacoesLidas') || '[]');
      
      // Cria notificações de todas as denúncias
      const notifications = [];
      
      denuncias.forEach(denuncia => {
        const dataRegistro = new Date(denuncia.dataRegistro);
        const dataAtualizacao = new Date(denuncia.dataUltimaAtualizacaoStatus || denuncia.dataRegistro);
        
        // Notificação de nova denúncia
        const notifNova = createNotificationFromDenuncia(denuncia, 'nova');
        notifications.push({
          ...notifNova,
          id: `nova-${denuncia.id}`,
          lida: read.includes(`nova-${denuncia.id}`)
        });
        
        // Notificação de atualização de status (se diferente da data de registro)
        if (dataAtualizacao > dataRegistro) {
          const notifStatus = createNotificationFromDenuncia(denuncia, 'status');
          notifications.push({
            ...notifStatus,
            id: `status-${denuncia.id}`,
            lida: read.includes(`status-${denuncia.id}`)
          });
        }
      });

      // Ordena por data (mais recentes primeiro)
      notifications.sort((a, b) => new Date(b.data) - new Date(a.data));
      
      // Ordena por data (mais recentes primeiro) - já está ordenado acima
      // Não limita aqui, a paginação cuida disso
      
      renderNotifications(notifications);
    } catch (error) {
      console.error('[Notificações] Erro ao carregar notificações:', error);
      document.getElementById('notifications-list').innerHTML = 
        '<div class="alert alert-warning">Erro ao carregar notificações. Tente novamente mais tarde.</div>';
    }
  }

  /**
   * Marca todas as notificações como lidas
   */
  function markAllAsRead() {
    const cards = document.querySelectorAll('.notification-card');
    const read = JSON.parse(localStorage.getItem('notificacoesLidas') || '[]');
    
    cards.forEach(card => {
      const notifId = card.dataset.id;
      if (!read.includes(notifId)) {
        markAsRead(notifId);
      }
      card.classList.remove('unread');
      card.dataset.lida = 'true';
      
      // Remove o botão de marcar como lida se existir
      const markBtn = card.querySelector('.mark-read-btn');
      if (markBtn) markBtn.remove();
    });
    
    updateNotificationCount();
  }

  /**
   * Atualiza o contador de notificações não lidas
   */
  function updateNotificationCount() {
    const unreadCount = document.querySelectorAll('.notification-card.unread').length;
    // Pode ser usado para atualizar badge no futuro
  }

  /**
   * Aplica filtros e recarrega a visualização
   */
  function filterNotifications() {
    currentPage = 1; // Reseta para primeira página ao filtrar
    renderNotifications(allNotifications);
  }

  /**
   * Inicializa filtros
   */
  function initFilters() {
    const tipoFilter = document.querySelector('.filters-section select:nth-of-type(1)');
    const statusFilter = document.querySelector('.filters-section select:nth-of-type(2)');
    const periodoFilter = document.querySelector('.filters-section select:nth-of-type(3)');
    
    const filterHandler = () => {
      filterNotifications();
    };
    
    if (tipoFilter) tipoFilter.addEventListener('change', filterHandler);
    if (statusFilter) {
      statusFilter.addEventListener('change', filterHandler);
      // Adiciona opção de ver histórico (Todas) se não existir
      if (!Array.from(statusFilter.options).some(opt => opt.value === 'Todas')) {
        const todasOption = document.createElement('option');
        todasOption.value = 'Todas';
        todasOption.textContent = 'Todas';
        statusFilter.insertBefore(todasOption, statusFilter.firstChild);
      }
    }
    if (periodoFilter) periodoFilter.addEventListener('change', filterHandler);

    // Botão marcar todas como lidas
    const markAllBtn = document.querySelector('.notifications-header .btn-light');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', function(e) {
        e.preventDefault();
        markAllAsRead();
      });
    }
  }

  /**
   * Inicializa quando o DOM estiver pronto
   */
  function init() {
    const user = getUsuarioCorrente();
    if (!user) {
      window.location.href = '../login/login.html';
      return;
    }

    loadNotifications();
    initFilters();

    // Atualiza notificações a cada 5 minutos
    setInterval(loadNotifications, 5 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

