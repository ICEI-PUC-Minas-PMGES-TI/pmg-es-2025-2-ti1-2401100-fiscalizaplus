/**
 * Script para gerenciar configurações do servidor
 */

(function() {
  const API_BASE = 'http://localhost:3000';
  const SERVidores_ENDPOINT = `${API_BASE}/servidores`;

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
   * Carrega configurações salvas
   */
  function loadSettings() {
    const user = getUsuarioCorrente();
    if (!user) return;

    const settingsKey = `configuracoes-servidor-${user.id}`;
    const saved = localStorage.getItem(settingsKey);
    
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        
        // Carrega configurações de tempo
        if (settings.prazoPadrao) {
          const prazoInput = document.querySelector('.settings-card:nth-of-type(1) input[type="number"]');
          if (prazoInput) prazoInput.value = settings.prazoPadrao;
        }
        
        if (settings.frequenciaAtualizacao) {
          const freqSelect = document.querySelector('.settings-card:nth-of-type(1) select');
          if (freqSelect) freqSelect.value = settings.frequenciaAtualizacao;
        }

        // Carrega configurações de notificações
        if (settings.notifNovaDenuncia !== undefined) {
          const check1 = document.getElementById('notifNovaDenuncia');
          if (check1) check1.checked = settings.notifNovaDenuncia;
        }
        
        if (settings.notifStatusAlterado !== undefined) {
          const check2 = document.getElementById('notifStatusAlterado');
          if (check2) check2.checked = settings.notifStatusAlterado;
        }
        
        if (settings.notifPrazoVencendo !== undefined) {
          const check3 = document.getElementById('notifPrazoVencendo');
          if (check3) check3.checked = settings.notifPrazoVencendo;
        }
        
        if (settings.diasAntesVencimento) {
          const diasInput = document.querySelector('.settings-card:nth-of-type(2) input[type="number"]');
          if (diasInput) diasInput.value = settings.diasAntesVencimento;
        }

        // Carrega configurações de relatórios
        if (settings.formatoExportacao) {
          const formatoSelect = document.querySelector('.settings-card:nth-of-type(3) select:nth-of-type(1)');
          if (formatoSelect) formatoSelect.value = settings.formatoExportacao;
        }
        
        if (settings.incluirImagens !== undefined) {
          const incluirSelect = document.querySelector('.settings-card:nth-of-type(3) select:nth-of-type(2)');
          if (incluirSelect) incluirSelect.value = settings.incluirImagens ? 'Sim' : 'Não';
        }
        
        if (settings.frequenciaRelatorios) {
          const freqRelSelect = document.querySelector('.settings-card:nth-of-type(3) select:nth-of-type(3)');
          if (freqRelSelect) freqRelSelect.value = settings.frequenciaRelatorios;
        }

        // Carrega configurações de segurança
        if (settings.tempoSessao) {
          const sessaoInput = document.querySelector('.settings-card:nth-of-type(4) input[type="number"]');
          if (sessaoInput) sessaoInput.value = settings.tempoSessao;
        }
        
        if (settings.logAtividades !== undefined) {
          const logCheck = document.getElementById('logAtividades');
          if (logCheck) logCheck.checked = settings.logAtividades;
        }
        
        if (settings.backupAutomatico !== undefined) {
          const backupCheck = document.getElementById('backupAutomatico');
          if (backupCheck) backupCheck.checked = settings.backupAutomatico;
        }
      } catch (error) {
        console.error('[Configurações] Erro ao carregar configurações:', error);
      }
    }
  }

  /**
   * Salva configurações
   */
  function saveSettings(formCardIndex, event) {
    const user = getUsuarioCorrente();
    if (!user) return;

    const settingsKey = `configuracoes-servidor-${user.id}`;
    const currentSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}');

    if (formCardIndex === 0) {
      // Configurações de tempo
      const prazoInput = document.querySelector('.settings-card:nth-of-type(1) input[type="number"]');
      const freqSelect = document.querySelector('.settings-card:nth-of-type(1) select');
      
      if (prazoInput) currentSettings.prazoPadrao = parseInt(prazoInput.value);
      if (freqSelect) currentSettings.frequenciaAtualizacao = freqSelect.value;
    } else if (formCardIndex === 1) {
      // Configurações de notificações
      const check1 = document.getElementById('notifNovaDenuncia');
      const check2 = document.getElementById('notifStatusAlterado');
      const check3 = document.getElementById('notifPrazoVencendo');
      const diasInput = document.querySelector('.settings-card:nth-of-type(2) input[type="number"]');
      
      if (check1) currentSettings.notifNovaDenuncia = check1.checked;
      if (check2) currentSettings.notifStatusAlterado = check2.checked;
      if (check3) currentSettings.notifPrazoVencendo = check3.checked;
      if (diasInput) currentSettings.diasAntesVencimento = parseInt(diasInput.value);
    } else if (formCardIndex === 2) {
      // Configurações de relatórios
      const formatoSelect = document.querySelector('.settings-card:nth-of-type(3) select:nth-of-type(1)');
      const incluirSelect = document.querySelector('.settings-card:nth-of-type(3) select:nth-of-type(2)');
      const freqRelSelect = document.querySelector('.settings-card:nth-of-type(3) select:nth-of-type(3)');
      
      if (formatoSelect) currentSettings.formatoExportacao = formatoSelect.value;
      if (incluirSelect) currentSettings.incluirImagens = incluirSelect.value === 'Sim';
      if (freqRelSelect) currentSettings.frequenciaRelatorios = freqRelSelect.value;
    } else if (formCardIndex === 3) {
      // Configurações de segurança
      const sessaoInput = document.querySelector('.settings-card:nth-of-type(4) input[type="number"]');
      const logCheck = document.getElementById('logAtividades');
      const backupCheck = document.getElementById('backupAutomatico');
      
      if (sessaoInput) currentSettings.tempoSessao = parseInt(sessaoInput.value);
      if (logCheck) currentSettings.logAtividades = logCheck.checked;
      if (backupCheck) currentSettings.backupAutomatico = backupCheck.checked;
    }

    localStorage.setItem(settingsKey, JSON.stringify(currentSettings));
    
    // Mostra feedback visual
    let btn = null;
    if (event && event.target) {
      btn = event.target.closest('form')?.querySelector('.btn-save');
    }
    
    // Fallback: busca o botão pelo índice do card
    if (!btn && formCardIndex >= 0) {
      const cards = document.querySelectorAll('.settings-card');
      if (cards[formCardIndex]) {
        btn = cards[formCardIndex].querySelector('.btn-save');
      }
    }
    
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check me-1"></i>Salvo!';
      btn.style.backgroundColor = '#198754';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.backgroundColor = '';
      }, 2000);
    }
    
    console.log('[Configurações] Configurações salvas:', currentSettings);
  }

  /**
   * Inicializa os event listeners
   */
  function init() {
    const user = getUsuarioCorrente();
    if (!user) {
      window.location.href = '../login/login.html';
      return;
    }

    // Carrega configurações salvas
    setTimeout(() => {
      loadSettings();
    }, 100);

    // Adiciona listeners aos botões de salvar
    const saveButtons = document.querySelectorAll('.btn-save');
    saveButtons.forEach((btn) => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const form = this.closest('form');
        if (!form) return;
        
        const settingsCard = form.closest('.settings-card');
        if (!settingsCard) return;
        
        const allCards = Array.from(document.querySelectorAll('.settings-card'));
        const cardIndex = allCards.indexOf(settingsCard);
        
        if (cardIndex >= 0) {
          saveSettings(cardIndex, e);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

