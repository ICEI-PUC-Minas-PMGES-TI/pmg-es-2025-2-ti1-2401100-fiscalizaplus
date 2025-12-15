/**
 * Script para carregar e exibir registro de atividades do servidor
 */

(function() {
  const API_BASE = window.location.origin;
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
   * Formata data e hora
   */
  function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays === 1) return 'Ontem às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month} às ${time}`;
  }

  /**
   * Cria uma atividade a partir de uma denúncia
   */
  function createActivityFromDenuncia(denuncia, servidorId, servidorNome) {
    const atividades = [];
    const isResponsavel = denuncia.servidorResponsavelId === servidorId || 
                         denuncia.servidorResponsavelId === String(servidorId);
    
    if (isResponsavel) {
      // Atividade de atualização de status
      if (denuncia.dataUltimaAtualizacaoStatus && denuncia.statusAtual) {
        const dataRegistro = new Date(denuncia.dataRegistro);
        const dataAtualizacao = new Date(denuncia.dataUltimaAtualizacaoStatus);
        
        // Só cria atividade se houve atualização após o registro
        if (dataAtualizacao > dataRegistro) {
          atividades.push({
            id: `update-${denuncia.id}`,
            titulo: 'Status da denúncia atualizado',
            descricao: `Alterou o status da denúncia <strong>${denuncia.codigoOcorrencia}</strong> de "${getStatusAnterior(denuncia)}" para "${denuncia.statusAtual}"`,
            tipo: 'Atualizar',
            badgeClass: 'badge-update',
            usuario: servidorNome,
            data: denuncia.dataUltimaAtualizacaoStatus
          });
        }
      }

      // Atividade de adicionar observações
      if (denuncia.observacoesInternasServidor && denuncia.observacoesInternasServidor.trim()) {
        atividades.push({
          id: `obs-${denuncia.id}`,
          titulo: 'Observações adicionadas',
          descricao: `Adicionou observações internas na denúncia <strong>${denuncia.codigoOcorrencia}</strong>`,
          tipo: 'Atualizar',
          badgeClass: 'badge-update',
          usuario: servidorNome,
          data: denuncia.dataUltimaAtualizacaoStatus || denuncia.dataRegistro
        });
      }

      // Atividade de resolução (se status for concluído)
      if (denuncia.statusAtual === 'Concluido' || denuncia.statusAtual === 'Concluído') {
        atividades.push({
          id: `resolve-${denuncia.id}`,
          titulo: 'Denúncia resolvida',
          descricao: `Marcou a denúncia <strong>${denuncia.codigoOcorrencia}</strong> como "Concluída"`,
          tipo: 'Atualizar',
          badgeClass: 'badge-update',
          usuario: servidorNome,
          data: denuncia.dataUltimaAtualizacaoStatus || denuncia.dataRegistro
        });
      }
    }

    // Atividade de visualização (para denúncias recentes ou atribuídas)
    if (isResponsavel || new Date(denuncia.dataRegistro) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      atividades.push({
        id: `view-${denuncia.id}`,
        titulo: 'Denúncia visualizada',
        descricao: `Visualizou os detalhes da denúncia <strong>${denuncia.codigoOcorrencia}</strong>: ${denuncia.titulo}`,
        tipo: 'Visualizar',
        badgeClass: 'badge-view',
        usuario: servidorNome,
        data: denuncia.dataRegistro
      });
    }

    return atividades;
  }

  /**
   * Retorna o status anterior (assumindo que era Pendente se não houver histórico)
   */
  function getStatusAnterior(denuncia) {
    // Como não temos histórico de status, assumimos "Pendente" como padrão
    return 'Pendente';
  }

  /**
   * Renderiza as atividades na página
   */
  function renderActivities(activities) {
    const container = document.getElementById('activities-list');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info text-center">
          <i class="bi bi-info-circle me-2"></i>
          Nenhuma atividade registrada ainda.
        </div>
      `;
      return;
    }

    container.innerHTML = activities.map(activity => {
      return `
        <div class="activity-card">
          <div class="activity-header">
            <div>
              <div class="activity-title">${activity.titulo}</div>
              <div class="activity-user"><i class="bi bi-person me-1"></i>${activity.usuario}</div>
              <div class="activity-time"><i class="bi bi-clock me-1"></i>${formatDateTime(activity.data)}</div>
            </div>
            <span class="activity-badge ${activity.badgeClass}">${activity.tipo}</span>
          </div>
          <div class="activity-description">
            ${activity.descricao}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Carrega atividades do servidor
   */
  async function loadActivities() {
    try {
      const user = getUsuarioCorrente();
      if (!user) return;

      const servidorId = user.id;
      const servidorNome = user.nomeCompleto || user.nome || 'Servidor';

      // Busca todas as denúncias
      const response = await fetch(DENUNCIAS_ENDPOINT);
      if (!response.ok) throw new Error('Erro ao buscar denúncias');

      const denuncias = await response.json();
      
      // Cria atividades a partir das denúncias
      let allActivities = [];
      
      denuncias.forEach(denuncia => {
        const activities = createActivityFromDenuncia(denuncia, servidorId, servidorNome);
        allActivities = allActivities.concat(activities);
      });

      // Ordena por data (mais recentes primeiro)
      allActivities.sort((a, b) => new Date(b.data) - new Date(a.data));
      
      // Remove duplicatas mantendo a mais recente
      const uniqueActivities = [];
      const seen = new Set();
      allActivities.forEach(activity => {
        const key = `${activity.titulo}-${activity.descricao}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueActivities.push(activity);
        }
      });

      // Limita a 100 atividades mais recentes
      const limitedActivities = uniqueActivities.slice(0, 100);
      
      renderActivities(limitedActivities);
    } catch (error) {
      console.error('[Registro de Atividades] Erro ao carregar atividades:', error);
      document.getElementById('activities-list').innerHTML = 
        '<div class="alert alert-warning">Erro ao carregar atividades. Tente novamente mais tarde.</div>';
    }
  }

  /**
   * Inicializa filtros
   */
  function initFilters() {
    const acaoFilter = document.querySelector('.filters-section select:nth-of-type(1)');
    const usuarioFilter = document.querySelector('.filters-section select:nth-of-type(2)');
    const periodoFilter = document.querySelector('.filters-section select:nth-of-type(3)');
    const buscaInput = document.querySelector('.filters-section input[type="text"]');

    // Atualiza filtro de usuário com o nome do servidor logado
    if (usuarioFilter) {
      const user = getUsuarioCorrente();
      if (user) {
        const servidorNome = user.nomeCompleto || user.nome || 'Servidor';
        usuarioFilter.innerHTML = `
          <option>Todos</option>
          <option selected>${servidorNome}</option>
          <option>Outros usuários</option>
        `;
      }
    }

    // Implementação básica de filtros (pode ser expandida)
    const filterHandler = () => {
      // Aqui você pode implementar a lógica de filtros
      console.log('Filtros alterados');
    };
    
    if (acaoFilter) acaoFilter.addEventListener('change', filterHandler);
    if (usuarioFilter) usuarioFilter.addEventListener('change', filterHandler);
    if (periodoFilter) periodoFilter.addEventListener('change', filterHandler);
    if (buscaInput) buscaInput.addEventListener('input', filterHandler);
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

    loadActivities();
    initFilters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

