/**
 * Script para carregar e exibir dados do usuário corrente em todas as páginas
 * do módulo de cidadão
 */

(function() {
  const API_BASE = 'http://localhost:3000';
  const CIDADAOS_ENDPOINT = `${API_BASE}/cidadaos`;

  /**
   * Obtém o usuário corrente do sessionStorage
   */
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

  /**
   * Atualiza os elementos HTML com os dados do usuário
   */
  function updateUserElements(user) {
    // Garante que se for usuário não logado, sempre mostra "usuário"
    let nomeCompleto = user.nomeCompleto || user.nome || 'usuário';
    let primeiroNome = nomeCompleto.split(' ')[0];
    
    // Se o nome contém "admin" ou "administrador", força para "usuário"
    if (!user.id || nomeCompleto.toLowerCase().includes('admin') || nomeCompleto.toLowerCase().includes('administrador')) {
      nomeCompleto = 'usuário';
      primeiroNome = 'usuário';
    }
    
    const email = user.email || '';
    // Primeira letra do nome para o avatar (ou 'U' se for usuário)
    const inicial = (nomeCompleto === 'usuário' || nomeCompleto === 'Visitante') ? 'U' : nomeCompleto.charAt(0).toUpperCase();

    // Atualiza elementos com ID específico
    const elementsToUpdate = [
      { id: 'name-user-lg', text: `Olá, ${primeiroNome}` },
      { id: 'name-user', text: `Olá, ${primeiroNome}` },
      { id: 'name-user-offcanvas', text: `Olá, ${primeiroNome}` },
      { id: 'user-name', text: `Olá, ${primeiroNome}` },
      { id: 'user-email', text: email },
      { id: 'welcome-name', text: primeiroNome },
      { id: 'user-name-profile', text: nomeCompleto },
      { id: 'user-email-profile', text: email },
      { id: 'user-avatar-initial', text: inicial }
    ];

    elementsToUpdate.forEach(({ id, text }) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = text;
      }
    });

    // Atualiza elementos por classe (para elementos que não têm ID)
    const nameUserElements = document.querySelectorAll('.name-user');
    nameUserElements.forEach(element => {
      if (!element.id) { // Só atualiza se não tiver ID (para não duplicar)
        element.textContent = `Olá, ${primeiroNome}`;
      }
    });
  }

  /**
   * Carrega os dados completos do usuário do servidor
   */
  async function loadUserData() {
    try {
      const user = getUsuarioCorrente();
      
      // Verifica se é administrador ou dados inválidos
      const isAdmin = user && (
        user.id === 'admin' || user.id === 'administrador' || user.id === 1 ||
        user.nome === 'Administrador' || user.nomeCompleto === 'Administrador' ||
        user.nome === 'Administrador do Sistema' || user.nomeCompleto === 'Administrador do Sistema' ||
        (user.nome && user.nome.toLowerCase().includes('admin')) ||
        (user.nomeCompleto && user.nomeCompleto.toLowerCase().includes('admin')) ||
        (user.login && user.login.toLowerCase() === 'admin')
      );
      
      // Se não há usuário logado OU é administrador, define valores padrão
      if (!user || !user.id || isAdmin) {
        // Limpa qualquer dado inválido do sessionStorage
        sessionStorage.removeItem('usuarioCorrente');
        sessionStorage.removeItem('fp_user');
        sessionStorage.removeItem('user');
        
        // Define valores padrão para usuário não logado
        updateUserElements({ 
          nomeCompleto: 'usuário', 
          nome: 'usuário', 
          email: '' 
        });
        // Retorna mas não bloqueia o carregamento da página
        return;
      }

      // Busca dados completos do usuário no servidor
      const response = await fetch(`${CIDADAOS_ENDPOINT}/${user.id}`);
      
      if (response.ok) {
        const userData = await response.json();
        // Combina dados da sessão com dados do servidor
        const completeUser = {
          ...user,
          ...userData,
          nomeCompleto: userData.nomeCompleto || user.nomeCompleto || user.nome || 'Usuário',
          email: userData.email || user.email || ''
        };
        
        // Atualiza elementos HTML
        updateUserElements(completeUser);
        
        console.log('[Current User] Dados do usuário carregados:', completeUser);
      } else {
        // Se não encontrou no servidor, usa dados da sessão
        updateUserElements(user);
        console.warn('[Current User] Usuário não encontrado no servidor, usando dados da sessão');
      }
    } catch (error) {
      console.error('[Current User] Erro ao carregar dados do usuário:', error);
      // Em caso de erro, tenta usar dados da sessão
      const user = getUsuarioCorrente();
      if (user) {
        updateUserElements(user);
      }
    }
  }

  /**
   * Função para fazer logout do usuário
   */
  function logoutUser() {
    // Remove todas as chaves de sessão relacionadas ao usuário
    sessionStorage.removeItem('usuarioCorrente');
    sessionStorage.removeItem('fp_user');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token_servidor_validado');
    sessionStorage.removeItem('token_id');
    sessionStorage.removeItem('isGuest'); // Remove flag de visitante também
    
    console.log('[Logout] Usuário deslogado com sucesso');
    
    // Determina o caminho correto para a página de login
    // Estrutura: /modulos/painel-cidadao/... -> /modulos/login/login.html
    const currentPath = window.location.pathname;
    let loginPath = '';
    
    if (currentPath.includes('/painel-cidadao/')) {
      // Se está em uma subpasta do painel-cidadao (comunidade, dashboard, etc)
      if (currentPath.match(/\/painel-cidadao\/[^\/]+\//)) {
        // Ex: /modulos/painel-cidadao/comunidade/comunidade.html -> ../../login/login.html
        loginPath = '../../login/login.html';
      } else {
        // Ex: /modulos/painel-cidadao/index.html -> ../login/login.html
        loginPath = '../login/login.html';
      }
    } else {
      // Para outras páginas, tenta caminho padrão
      loginPath = '../modulos/login/login.html';
    }
    
    // Redireciona para a página de login
    window.location.href = loginPath;
  }

  /**
   * Atualiza o dropdown do menu do usuário baseado no estado de login
   */
  function updateUserDropdown() {
    const user = getUsuarioCorrente();
    const dropdownMenus = document.querySelectorAll('.dropdown-menu.dropdown-menu-end');
    
    dropdownMenus.forEach(menu => {
      if (!user || !user.id) {
        // Se não há usuário logado, mostra opções de login/cadastro
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
        
        menu.innerHTML = `
          <li><a class="dropdown-item" href="${loginPath}"><i class="fa-solid fa-sign-in-alt me-2"></i>Entrar</a></li>
          <li><a class="dropdown-item" href="${cadastroPath}"><i class="fa-solid fa-user-plus me-2"></i>Registrar-se</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" id="logout-link-guest"><i class="fa-solid fa-sign-out-alt me-2"></i>Sair</a></li>
        `;
        
        // Adiciona event listener para logout quando for visitante
        const logoutLinkGuest = menu.querySelector('#logout-link-guest');
        if (logoutLinkGuest) {
          logoutLinkGuest.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Tem certeza que deseja sair?')) {
              logoutUser();
            }
          });
        }
      } else {
        // Se há usuário logado, mostra menu normal
        const currentPath = window.location.pathname;
        let loginPath = '';
        let painelUsuarioPath = '';
        
        if (currentPath.includes('/painel-cidadao/')) {
          if (currentPath.match(/\/painel-cidadao\/[^\/]+\//)) {
            loginPath = '../../login/login.html';
            painelUsuarioPath = '../painel-de-usuario/index.html';
          } else {
            loginPath = '../login/login.html';
            painelUsuarioPath = 'painel-de-usuario/index.html';
          }
        } else {
          loginPath = '../modulos/login/login.html';
          painelUsuarioPath = '../modulos/painel-cidadao/painel-de-usuario/index.html';
        }
        
        menu.innerHTML = `
          <li><a class="dropdown-item" href="#"><i class="fa-solid fa-user me-2"></i>Meu Perfil</a></li>
          <li><a class="dropdown-item" href="${painelUsuarioPath}" id="minhas-denuncias-link"><i class="fa-solid fa-list me-2"></i>Minhas Denúncias</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" id="logout-link"><i class="fa-solid fa-sign-out-alt me-2"></i>Sair</a></li>
        `;
        
        const minhasDenunciasLink = menu.querySelector('#minhas-denuncias-link');
        if (minhasDenunciasLink) {
          const currentPath = window.location.pathname;
          let correctPath = painelUsuarioPath;
          
          if (currentPath.includes('/painel-cidadao/index.html') || currentPath.endsWith('/painel-cidadao/')) {
            correctPath = 'painel-de-usuario/index.html';
          }
          
          minhasDenunciasLink.href = correctPath;
          console.log('[Current User] Link Minhas Denúncias configurado para:', correctPath);
        }
        
        const staticLink = document.getElementById('minhas-denuncias-link-static');
        if (staticLink) {
          const currentPath = window.location.pathname;
          let correctPath = 'painel-de-usuario/index.html';
          if (currentPath.includes('/painel-cidadao/index.html') || currentPath.endsWith('/painel-cidadao/')) {
            correctPath = 'painel-de-usuario/index.html';
          }
          staticLink.href = correctPath;
        }
        
        // Adiciona event listener para logout
        const logoutLink = menu.querySelector('#logout-link');
        if (logoutLink) {
          logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Tem certeza que deseja sair?')) {
              logoutUser();
            }
          });
        }
      }
    });
  }

  /**
   * Inicializa os event listeners para os botões de logout
   */
  function initLogoutButtons() {
    // Encontra todos os links/botões de "Sair" no dropdown
    const dropdownItems = document.querySelectorAll('.dropdown-menu a.dropdown-item, .dropdown-menu button.dropdown-item');
    
    dropdownItems.forEach(element => {
      const text = element.textContent.trim().toLowerCase();
      // Verifica se o texto contém "sair" ou "logout"
      if (text.includes('sair') || text.includes('logout')) {
        // Adiciona event listener com preventDefault para evitar navegação
        element.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // Confirmação antes de fazer logout
          if (confirm('Tem certeza que deseja sair?')) {
            logoutUser();
          }
        });
        
        // Remove o href se existir para evitar navegação direta
        if (element.tagName === 'A' && element.href) {
          element.href = '#';
        }
      }
    });
  }

  // Limpa dados inválidos do sessionStorage antes de iniciar
  function cleanInvalidSessionData() {
    // Se for visitante, mantém o flag mas limpa dados de usuário
    const isGuest = sessionStorage.getItem('isGuest') === 'true';
    
    const keys = ['usuarioCorrente', 'fp_user', 'user'];
    keys.forEach(key => {
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Remove se for admin, não tiver ID válido, ou se for visitante
          const isAdmin = parsed && (
            parsed.id === 'admin' || parsed.id === 'administrador' || 
            parsed.id === 1 || // ID 1 é admin no data.js
            parsed.nome === 'Administrador' || parsed.nomeCompleto === 'Administrador' ||
            parsed.nome === 'Administrador do Sistema' || parsed.nomeCompleto === 'Administrador do Sistema' ||
            (parsed.nome && parsed.nome.toLowerCase().includes('admin')) || 
            (parsed.nomeCompleto && parsed.nomeCompleto.toLowerCase().includes('admin')) ||
            (parsed.login && parsed.login.toLowerCase() === 'admin')
          );
          
          if (isGuest || !parsed || !parsed.id || isAdmin) {
            sessionStorage.removeItem(key);
            console.log(`[Current User] Removido dado inválido de ${key}:`, parsed);
          }
        }
      } catch (_) {
        // Se houver erro ao parsear, remove também
        sessionStorage.removeItem(key);
      }
    });
  }

  // Inicializa quando o DOM estiver pronto
  function init() {
    // Limpa dados inválidos primeiro
    cleanInvalidSessionData();
    loadUserData();
    updateUserDropdown();
    initLogoutButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM já está pronto
    init();
  }
})();

