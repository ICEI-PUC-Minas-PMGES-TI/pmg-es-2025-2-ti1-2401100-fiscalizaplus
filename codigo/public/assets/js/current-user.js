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
      { id: 'user-avatar-initial', text: inicial },
      { id: 'sidebar-name', text: nomeCompleto },
      { id: 'sidebar-email', text: email }
    ];
    
    // Atualiza o avatar do sidebar se existir
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAvatar) {
      sidebarAvatar.textContent = inicial;
    }

    elementsToUpdate.forEach(({ id, text }) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = text;
      }
    });

    // Atualiza nome na sidebar do usuário mobile
    const sidebarUserName = document.getElementById('sidebar-user-name');
    if (sidebarUserName) {
      sidebarUserName.textContent = nomeCompleto;
    }

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
        
        // Atualiza sidebar especificamente para usuário não logado
        const sidebarAvatar = document.getElementById('sidebar-avatar');
        const sidebarName = document.getElementById('sidebar-name');
        const sidebarEmail = document.getElementById('sidebar-email');
        if (sidebarAvatar) sidebarAvatar.textContent = 'U';
        if (sidebarName) sidebarName.textContent = 'Usuário';
        if (sidebarEmail) sidebarEmail.textContent = 'Faça login para participar';
        
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
        updateMobileSidebar(); // Atualiza sidebar mobile após carregar dados do usuário
        
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
      updateMobileSidebar(); // Atualiza sidebar mobile mesmo em caso de erro
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
    // Usa uma abordagem mais robusta que sempre funciona
    const currentUrl = new URL(window.location.href);
    const currentPath = currentUrl.pathname;
    
    // Calcula o caminho relativo baseado na estrutura de pastas
    let loginPath = '';
    
    // Conta quantos níveis de profundidade estamos (após /modulos/)
    // Ex: /modulos/painel-cidadao/index.html -> 1 nível -> ../login/login.html
    // Ex: /modulos/painel-cidadao/comunidade/comunidade.html -> 2 níveis -> ../../login/login.html
    const pathParts = currentPath.split('/').filter(p => p);
    const modulosIndex = pathParts.indexOf('modulos');
    
    if (modulosIndex !== -1) {
      // Conta quantas pastas há após 'modulos'
      const depth = pathParts.length - modulosIndex - 2; // -2 porque não conta 'modulos' nem o arquivo HTML
      
      if (depth === 0) {
        // Estamos em /modulos/algum-arquivo.html -> ../login/login.html
        loginPath = '../login/login.html';
      } else if (depth === 1) {
        // Estamos em /modulos/painel-cidadao/index.html -> ../login/login.html
        loginPath = '../login/login.html';
      } else {
        // Estamos em /modulos/painel-cidadao/comunidade/comunidade.html -> ../../login/login.html
        loginPath = '../'.repeat(depth) + 'login/login.html';
      }
    } else {
      // Fallback: se não encontrar 'modulos', tenta caminho padrão
      loginPath = '../login/login.html';
    }
    
    console.log('[Logout] Redirecionando para:', loginPath, 'de', currentPath);
    
    // Redireciona para a página de login
    try {
      window.location.href = loginPath;
    } catch (error) {
      console.error('[Logout] Erro ao redirecionar:', error);
      // Fallback: tenta usar caminho absoluto
      const baseUrl = currentUrl.origin;
      const loginUrl = baseUrl + '/modulos/login/login.html';
      console.log('[Logout] Tentando caminho absoluto:', loginUrl);
      window.location.href = loginUrl;
    }
  }
  
  // Expõe a função globalmente para uso em outros scripts
  window.logoutUser = logoutUser;

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
        if (logoutLinkGuest && !logoutLinkGuest.dataset.logoutListenerAdded) {
          logoutLinkGuest.dataset.logoutListenerAdded = 'true';
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
        let meuPerfilPath = '';
        
        // Calcula caminhos baseado na localização atual
        if (currentPath.includes('/painel-cidadao/')) {
          // Está dentro de /modulos/painel-cidadao/
          if (currentPath.includes('/meu-perfil/')) {
            // Está em meu-perfil
            loginPath = '../../login/login.html';
            painelUsuarioPath = '../painel-de-usuario/index.html';
            meuPerfilPath = 'index.html';
          } else if (currentPath.includes('/painel-de-usuario/')) {
            // Está em painel-de-usuario
            loginPath = '../../login/login.html';
            painelUsuarioPath = 'index.html';
            meuPerfilPath = '../meu-perfil/index.html';
          } else if (currentPath.match(/\/painel-cidadao\/[^\/]+\//)) {
            // Está em outra subpasta de painel-cidadao (comunidade, dashboard, etc)
            loginPath = '../../login/login.html';
            painelUsuarioPath = '../painel-de-usuario/index.html';
            meuPerfilPath = '../meu-perfil/index.html';
          } else {
            // Está na raiz de painel-cidadao (index.html)
            loginPath = '../login/login.html';
            painelUsuarioPath = 'painel-de-usuario/index.html';
            meuPerfilPath = 'meu-perfil/index.html';
          }
        } else if (currentPath.includes('/modulos/')) {
          // Está em outra pasta dentro de /modulos/ (ex: guia, login, etc)
          loginPath = '../login/login.html';
          painelUsuarioPath = '../painel-cidadao/painel-de-usuario/index.html';
          meuPerfilPath = '../painel-cidadao/meu-perfil/index.html';
        } else {
          // Está na raiz do projeto
          loginPath = 'modulos/login/login.html';
          painelUsuarioPath = 'modulos/painel-cidadao/painel-de-usuario/index.html';
          meuPerfilPath = 'modulos/painel-cidadao/meu-perfil/index.html';
        }
        
        console.log('[Current User] Caminhos calculados:', {
          currentPath,
          painelUsuarioPath,
          meuPerfilPath
        });
        
        menu.innerHTML = `
          <li><a class="dropdown-item" href="${meuPerfilPath}" id="meu-perfil-link"><i class="fa-solid fa-user me-2"></i>Meu Perfil</a></li>
          <li><a class="dropdown-item" href="${painelUsuarioPath}" id="minhas-denuncias-link"><i class="fa-solid fa-list me-2"></i>Minhas Denúncias</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" id="logout-link"><i class="fa-solid fa-sign-out-alt me-2"></i>Sair</a></li>
        `;
        
        // Ajusta os links finais para garantir que estão corretos
        const minhasDenunciasLink = menu.querySelector('#minhas-denuncias-link');
        const meuPerfilLink = menu.querySelector('#meu-perfil-link');
        
        if (minhasDenunciasLink) {
          minhasDenunciasLink.href = painelUsuarioPath;
          console.log('[Current User] Link Minhas Denúncias configurado para:', painelUsuarioPath, 'de', currentPath);
        }
        
        if (meuPerfilLink) {
          meuPerfilLink.href = meuPerfilPath;
          console.log('[Current User] Link Meu Perfil configurado para:', meuPerfilPath, 'de', currentPath);
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
        if (logoutLink && !logoutLink.dataset.logoutListenerAdded) {
          logoutLink.dataset.logoutListenerAdded = 'true';
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
   * Atualiza a sidebar mobile baseada no estado de login
   */
  function updateMobileSidebar() {
    const user = getUsuarioCorrente();
    const sidebarLinks = document.querySelector('.user-sidebar-links');
    
    if (!sidebarLinks) {
      return; // Sidebar não existe nesta página
    }
    
    const currentPath = window.location.pathname;
    let loginPath = '';
    let cadastroPath = '';
    let painelUsuarioPath = '';
    let meuPerfilPath = '';
    
    // Calcula caminhos baseado na localização atual
    if (currentPath.includes('/painel-cidadao/')) {
      if (currentPath.match(/\/painel-cidadao\/[^\/]+\//)) {
        // Subpasta: comunidade, dashboard, etc
        loginPath = '../../login/login.html';
        cadastroPath = '../../cadastro/cadastro-cidadao.html';
        painelUsuarioPath = '../painel-de-usuario/index.html';
        meuPerfilPath = '../meu-perfil/index.html';
      } else {
        // Pasta principal: painel-cidadao/index.html
        loginPath = '../login/login.html';
        cadastroPath = '../cadastro/cadastro-cidadao.html';
        painelUsuarioPath = 'painel-de-usuario/index.html';
        meuPerfilPath = 'meu-perfil/index.html';
      }
    } else if (currentPath.includes('/guia/')) {
      loginPath = '../login/login.html';
      cadastroPath = '../cadastro/cadastro-cidadao.html';
      painelUsuarioPath = '../painel-cidadao/painel-de-usuario/index.html';
      meuPerfilPath = '../painel-cidadao/meu-perfil/index.html';
    } else {
      loginPath = '../login/login.html';
      cadastroPath = '../cadastro/cadastro-cidadao.html';
      painelUsuarioPath = '../painel-cidadao/painel-de-usuario/index.html';
      meuPerfilPath = '../painel-cidadao/meu-perfil/index.html';
    }
    
    if (!user || !user.id) {
      // Se não há usuário logado (visitante), mostra opções de login/cadastro
      sidebarLinks.innerHTML = `
        <a href="${loginPath}" class="sidebar-link">
          <i class="fa-solid fa-sign-in-alt"></i>
          <span>Entrar</span>
        </a>
        <a href="${cadastroPath}" class="sidebar-link">
          <i class="fa-solid fa-user-plus"></i>
          <span>Registrar-se</span>
        </a>
        <a href="#" class="sidebar-link" id="sidebar-theme-toggle">
          <i class="fa-solid fa-moon" id="sidebar-theme-icon"></i>
          <span id="sidebar-theme-text">Modo Escuro</span>
        </a>
        <a href="#" class="sidebar-link" id="sidebar-logout">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span>Sair</span>
        </a>
      `;
      
      // Adiciona event listener para logout quando for visitante
      const logoutLink = sidebarLinks.querySelector('#sidebar-logout');
      if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          if (confirm('Tem certeza que deseja sair?')) {
            logoutUser();
          }
        });
      }
      
      // Re-inicializa o toggle de tema
      initSidebarThemeToggle();
    } else {
      // Se há usuário logado, mostra menu normal
      sidebarLinks.innerHTML = `
        <a href="${meuPerfilPath}" class="sidebar-link">
          <i class="fa-solid fa-user"></i>
          <span>Meu Perfil</span>
        </a>
        <a href="${painelUsuarioPath}" class="sidebar-link">
          <i class="fa-solid fa-file-circle-exclamation"></i>
          <span>Minhas Denúncias</span>
        </a>
        <a href="#" class="sidebar-link" id="sidebar-theme-toggle">
          <i class="fa-solid fa-moon" id="sidebar-theme-icon"></i>
          <span id="sidebar-theme-text">Modo Escuro</span>
        </a>
        <a href="#" class="sidebar-link" id="sidebar-logout">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span>Sair</span>
        </a>
      `;
      
      // Adiciona event listener para logout
      const logoutLink = sidebarLinks.querySelector('#sidebar-logout');
      if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          if (confirm('Tem certeza que deseja sair?')) {
            logoutUser();
          }
        });
      }
      
      // Re-inicializa o toggle de tema
      initSidebarThemeToggle();
    }
  }
  
  /**
   * Inicializa o toggle de tema na sidebar
   */
  function initSidebarThemeToggle() {
    const sidebarThemeToggle = document.getElementById('sidebar-theme-toggle');
    const sidebarThemeIcon = document.getElementById('sidebar-theme-icon');
    const sidebarThemeText = document.getElementById('sidebar-theme-text');
    const themeToggle = document.getElementById('themeToggle');
    
    if (sidebarThemeToggle && sidebarThemeIcon && sidebarThemeText) {
      // Atualizar texto e ícone baseado no tema atual
      function updateSidebarThemeButton() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const isDark = currentTheme === 'dark';
        
        sidebarThemeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        sidebarThemeText.textContent = isDark ? 'Modo Claro' : 'Modo Escuro';
      }
      
      // Atualizar ao carregar
      updateSidebarThemeButton();
      
      // Remove listeners anteriores para evitar duplicação
      // Cria um novo elemento para remover todos os listeners
      const newToggle = sidebarThemeToggle.cloneNode(true);
      sidebarThemeToggle.parentNode.replaceChild(newToggle, sidebarThemeToggle);
      
      // Adiciona novo listener
      const newToggleEl = document.getElementById('sidebar-theme-toggle');
      if (newToggleEl) {
        newToggleEl.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          if (window.toggleTheme) {
            window.toggleTheme();
          } else if (themeToggle) {
            themeToggle.click();
          }
          setTimeout(updateSidebarThemeButton, 100);
        });
      }
      
      // Observar mudanças no atributo data-theme para atualizar o botão
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
            updateSidebarThemeButton();
          }
        });
      });
      
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }
  }
  
  /**
   * Inicializa os event listeners para os botões de logout
   * NOTA: Esta função não é mais necessária pois os listeners são adicionados
   * diretamente em updateUserDropdown() para evitar duplicação.
   * Mantida apenas para compatibilidade, mas não adiciona listeners duplicados.
   */
  function initLogoutButtons() {
    // Encontra todos os links/botões de "Sair" no dropdown que ainda não têm listener
    const dropdownItems = document.querySelectorAll('.dropdown-menu a.dropdown-item, .dropdown-menu button.dropdown-item');
    
    dropdownItems.forEach(element => {
      const text = element.textContent.trim().toLowerCase();
      // Verifica se o texto contém "sair" ou "logout" e se ainda não tem listener
      if ((text.includes('sair') || text.includes('logout')) && !element.dataset.logoutListenerAdded) {
        element.dataset.logoutListenerAdded = 'true';
        
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
    updateMobileSidebar(); // Atualiza a sidebar mobile
    // initLogoutButtons() é chamado como fallback para elementos que não têm IDs específicos
    // mas agora verifica se já tem listener para evitar duplicação
    setTimeout(() => {
      initLogoutButtons();
      updateMobileSidebar(); // Atualiza novamente após um delay para garantir que tudo está carregado
    }, 100); // Pequeno delay para garantir que updateUserDropdown() já executou
  }

  // Expõe a função para atualizar a sidebar mobile globalmente
  window.updateMobileSidebar = updateMobileSidebar;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM já está pronto
    init();
  }
})();

