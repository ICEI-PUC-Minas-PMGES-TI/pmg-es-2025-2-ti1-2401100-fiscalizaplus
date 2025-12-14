/**
 * Script para gerenciar funcionalidades da página de perfil do servidor
 */

(function() {
  const API_BASE = 'http://localhost:3000';
  const SERVIDORES_ENDPOINT = `${API_BASE}/servidores`;

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
   * Inicializa funcionalidade de alterar senha
   */
  function initAlterarSenha() {
    const form = document.getElementById('form-alterar-senha');
    const btn = document.getElementById('btn-alterar-senha');
    
    if (!form) {
      console.error('[Perfil] Formulário de alterar senha não encontrado (id: form-alterar-senha)');
      return;
    }
    
    if (!btn) {
      console.error('[Perfil] Botão de alterar senha não encontrado (id: btn-alterar-senha)');
      return;
    }
    
    console.log('[Perfil] Funcionalidade de alterar senha inicializada com sucesso');

    btn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();

      const senhaAtualInput = document.getElementById('senha-atual');
      const novaSenhaInput = document.getElementById('nova-senha');
      const confirmarSenhaInput = document.getElementById('confirmar-senha');

      if (!senhaAtualInput || !novaSenhaInput || !confirmarSenhaInput) {
        alert('Erro: Campos de senha não encontrados.');
        return;
      }

      const senhaAtual = senhaAtualInput.value.trim();
      const novaSenha = novaSenhaInput.value.trim();
      const confirmarSenha = confirmarSenhaInput.value.trim();

      // Validações
      if (!senhaAtual || !novaSenha || !confirmarSenha) {
        alert('Por favor, preencha todos os campos.');
        return;
      }

      if (novaSenha !== confirmarSenha) {
        alert('As senhas não coincidem. Por favor, verifique.');
        return;
      }

      if (novaSenha.length < 6) {
        alert('A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }

      const user = getUsuarioCorrente();
      if (!user) {
        alert('Erro: usuário não encontrado. Por favor, faça login novamente.');
        return;
      }

      try {
        console.log('[Perfil] Iniciando alteração de senha para usuário:', user.id);
        
        // Busca dados do servidor
        const response = await fetch(`${SERVIDORES_ENDPOINT}/${user.id}`);
        if (!response.ok) {
          console.error('[Perfil] Erro ao buscar servidor:', response.status, response.statusText);
          alert('Erro ao buscar dados do servidor. Verifique se o servidor está rodando.');
          return;
        }

        const servidor = await response.json();
        console.log('[Perfil] Servidor encontrado:', servidor.email);

        // Verifica senha atual
        if (servidor.senhaHash !== senhaAtual) {
          alert('Senha atual incorreta.');
          return;
        }

        console.log('[Perfil] Senha atual válida, atualizando senha...');

        // Atualiza senha
        const updateResponse = await fetch(`${SERVIDORES_ENDPOINT}/${user.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            senhaHash: novaSenha
          })
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('[Perfil] Erro ao atualizar senha:', updateResponse.status, errorText);
          alert('Erro ao atualizar senha. Tente novamente.');
          return;
        }

        // Verifica se a atualização foi bem-sucedida
        const updatedServidor = await updateResponse.json();
        console.log('[Perfil] Senha atualizada com sucesso');

        // Atualiza no sessionStorage também
        const userJson = JSON.stringify({ ...user, senhaHash: novaSenha });
        sessionStorage.setItem('usuarioCorrente', userJson);
        sessionStorage.setItem('fp_user', userJson);
        sessionStorage.setItem('user', userJson);

        // Limpa os campos
        senhaAtualInput.value = '';
        novaSenhaInput.value = '';
        confirmarSenhaInput.value = '';

        // Mostra mensagem de sucesso
        alert('Senha alterada com sucesso!');
      } catch (error) {
        console.error('[Perfil] Erro ao alterar senha:', error);
        alert('Erro ao alterar senha: ' + error.message);
      }
    });
  }

  /**
   * Carrega preferências de notificação salvas
   */
  function loadPreferenciasNotificacao() {
    const user = getUsuarioCorrente();
    if (!user) return;

    const settingsKey = `preferencias-notificacao-servidor-${user.id}`;
    const saved = localStorage.getItem(settingsKey);
    
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        
        const checkEmail = document.getElementById('notifEmail');
        const checkSistema = document.getElementById('notifSistema');
        const selectFreq = document.querySelector('.profile-card:nth-of-type(3) select');
        
        if (checkEmail && prefs.notifEmail !== undefined) checkEmail.checked = prefs.notifEmail;
        if (checkSistema && prefs.notifSistema !== undefined) checkSistema.checked = prefs.notifSistema;
        if (selectFreq && prefs.frequenciaRelatorios) selectFreq.value = prefs.frequenciaRelatorios;
      } catch (error) {
        console.error('[Perfil] Erro ao carregar preferências:', error);
      }
    }
  }

  /**
   * Salva preferências de notificação
   */
  function initSalvarPreferencias() {
    const form = document.querySelector('.profile-card:nth-of-type(3) form');
    if (!form) return;

    const btn = form.querySelector('.btn-save');
    if (!btn) return;

    btn.addEventListener('click', function(e) {
      e.preventDefault();

      const user = getUsuarioCorrente();
      if (!user) return;

      const settingsKey = `preferencias-notificacao-servidor-${user.id}`;
      const checkEmail = document.getElementById('notifEmail');
      const checkSistema = document.getElementById('notifSistema');
      const selectFreq = document.querySelector('.profile-card:nth-of-type(3) select');

      const prefs = {
        notifEmail: checkEmail ? checkEmail.checked : true,
        notifSistema: checkSistema ? checkSistema.checked : true,
        frequenciaRelatorios: selectFreq ? selectFreq.value : 'Diário'
      };

      localStorage.setItem(settingsKey, JSON.stringify(prefs));

      // Feedback visual
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check me-1"></i>Salvo!';
      btn.style.backgroundColor = '#198754';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.backgroundColor = '';
      }, 2000);
    });
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

    // Aguarda um pouco para garantir que o DOM está totalmente carregado
    setTimeout(() => {
      initAlterarSenha();
      loadPreferenciasNotificacao();
      initSalvarPreferencias();
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM já está pronto, mas espera um pouco mais
    setTimeout(init, 100);
  }
})();

