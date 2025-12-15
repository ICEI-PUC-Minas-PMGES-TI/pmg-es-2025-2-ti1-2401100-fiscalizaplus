/**
 * Script para carregar e exibir dados do usuário servidor corrente em todas as páginas
 * do módulo de servidor
 */

(function() {
  const API_BASE = window.location.origin;
  const SERVIDORES_ENDPOINT = `${API_BASE}/servidores`;

  /**
   * Obtém o usuário corrente do sessionStorage
   */
  function getUsuarioCorrente() {
    try {
      // Tenta múltiplas chaves de sessão
      const keys = ['usuarioCorrente', 'fp_user', 'user'];
      for (const key of keys) {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Verifica se tem ID válido e se é servidor
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
   * Atualiza os elementos HTML com os dados do servidor
   */
  function updateUserElements(user) {
    const nomeCompleto = user.nomeCompleto || user.nome || 'Servidor';
    const primeiroNome = nomeCompleto.split(' ')[0];
    const email = user.email || '';
    const matricula = user.matricula || 'Não informado';
    const orgaoNome = user.orgaoNome || user.orgao || 'Não informado';
    
    // Primeira letra do nome para o avatar
    const inicial = nomeCompleto.charAt(0).toUpperCase();

    console.log('[Current User Servidor] Atualizando elementos com:', { nomeCompleto, email, inicial });

    // Atualiza elementos da sidebar - busca de forma mais robusta
    const userInfoContainers = document.querySelectorAll('.user-info');
    
    if (userInfoContainers.length === 0) {
      console.warn('[Current User Servidor] Nenhum container .user-info encontrado');
    } else {
      console.log('[Current User Servidor] Encontrados', userInfoContainers.length, 'containers .user-info');
    }
    
    userInfoContainers.forEach((container, index) => {
      console.log(`[Current User Servidor] Processando container ${index + 1}`);
      
      // Busca o link dentro do container (onde estão os elementos)
      const link = container.querySelector('a.d-block.dropdown-toggle');
      if (!link) {
        console.warn(`[Current User Servidor] Link não encontrado no container ${index + 1}`);
        return;
      }
      
      // Atualiza nome - busca dentro do link
      const nomePara = link.querySelector('p.mb-0.fw-semibold');
      if (nomePara) {
        nomePara.textContent = nomeCompleto;
        console.log(`[Current User Servidor] Nome atualizado no container ${index + 1}:`, nomeCompleto);
      } else {
        console.warn(`[Current User Servidor] Parágrafo de nome não encontrado no container ${index + 1}`);
        // Tenta buscar qualquer parágrafo com mb-0
        const fallbackNome = link.querySelector('p.mb-0');
        if (fallbackNome) {
          fallbackNome.textContent = nomeCompleto;
          console.log(`[Current User Servidor] Nome atualizado usando fallback no container ${index + 1}`);
        }
      }

      // Atualiza email - busca dentro do link
      const emailPara = link.querySelector('p.text-white-50.small');
      if (emailPara) {
        emailPara.textContent = email;
        console.log(`[Current User Servidor] Email atualizado no container ${index + 1}:`, email);
      } else {
        console.warn(`[Current User Servidor] Parágrafo de email não encontrado no container ${index + 1}`);
        // Tenta buscar qualquer parágrafo com text-white-50
        const fallbackEmail = link.querySelector('p.text-white-50');
        if (fallbackEmail) {
          fallbackEmail.textContent = email;
          console.log(`[Current User Servidor] Email atualizado usando fallback no container ${index + 1}`);
        }
      }

      // Atualiza avatar
      const userImg = link.querySelector('.user-img') || container.querySelector('.user-img');
      if (userImg) {
        userImg.alt = `Foto do Usuário ${nomeCompleto}`;
        console.log(`[Current User Servidor] Alt da imagem atualizado no container ${index + 1}`);
      }
    });

    // Atualiza elementos com IDs específicos (se existirem)
    const elementsToUpdate = [
      { id: 'servidor-nome', text: nomeCompleto },
      { id: 'servidor-primeiro-nome', text: primeiroNome },
      { id: 'servidor-email', text: email },
      { id: 'servidor-avatar-initial', text: inicial },
      // Elementos da página de perfil
      { id: 'profile-nome-completo', text: nomeCompleto },
      { id: 'profile-avatar', text: inicial },
      { id: 'profile-input-nome-completo', value: nomeCompleto },
      { id: 'profile-input-email', value: email },
      { id: 'profile-input-matricula', value: matricula },
      { id: 'profile-input-orgao', value: orgaoNome }
    ];
    
    elementsToUpdate.forEach(({ id, text, value }) => {
      const element = document.getElementById(id);
      if (element) {
        if (value !== undefined) {
          // Para inputs, usa value
          element.value = value;
        } else if (text !== undefined) {
          // Para outros elementos, usa textContent
          element.textContent = text;
        }
      }
    });

    // Já atualizado acima no loop dos containers
    console.log('[Current User Servidor] Atualização de elementos concluída');
  }

  /**
   * Carrega os dados completos do servidor da API
   */
  async function loadUserData() {
    try {
      const user = getUsuarioCorrente();
      
      // Se não há servidor logado, redireciona para login
      if (!user || !user.id || user.tipo !== 'servidor') {
        console.warn('[Current User Servidor] Nenhum servidor logado, redirecionando para login');
        window.location.href = '../login/login.html';
        return;
      }

      // Busca dados completos do servidor no servidor
      const response = await fetch(`${SERVIDORES_ENDPOINT}/${user.id}`);
      
      if (response.ok) {
        const userData = await response.json();
        // Busca dados do órgão se houver orgaoId
        let orgaoNome = null;
        if (userData.orgaoId) {
          try {
            const orgaoResponse = await fetch(`${API_BASE}/orgaosMunicipais/${userData.orgaoId}`);
            if (orgaoResponse.ok) {
              const orgao = await orgaoResponse.json();
              orgaoNome = orgao.nome || null;
            }
          } catch (error) {
            console.error('[Current User Servidor] Erro ao buscar órgão:', error);
          }
        }

        // Combina dados da sessão com dados do servidor
        const completeUser = {
          ...user,
          ...userData,
          nomeCompleto: userData.nomeCompleto || user.nomeCompleto || user.nome || 'Servidor',
          email: userData.email || user.email || '',
          orgaoNome: orgaoNome
        };
        
        // Atualiza sessionStorage com dados completos
        const userJson = JSON.stringify(completeUser);
        sessionStorage.setItem('usuarioCorrente', userJson);
        sessionStorage.setItem('fp_user', userJson);
        sessionStorage.setItem('user', userJson);
        
        // Atualiza elementos HTML - com delay para garantir que o DOM está pronto
        setTimeout(() => {
          updateUserElements(completeUser);
          initLogoutButtons();
        }, 50);
        
        console.log('[Current User Servidor] Dados do servidor carregados:', completeUser);
      } else {
        // Se não encontrou no servidor, usa dados da sessão
        setTimeout(() => {
          updateUserElements(user);
          initLogoutButtons();
        }, 50);
        console.warn('[Current User Servidor] Servidor não encontrado no servidor, usando dados da sessão');
      }
    } catch (error) {
      console.error('[Current User Servidor] Erro ao carregar dados do servidor:', error);
      // Em caso de erro, tenta usar dados da sessão
      const user = getUsuarioCorrente();
      if (user) {
        setTimeout(() => {
          updateUserElements(user);
          initLogoutButtons();
        }, 50);
      }
    }
  }

  /**
   * Função para fazer logout do servidor
   */
  function logoutUser() {
    // Remove todas as chaves de sessão relacionadas ao usuário
    sessionStorage.removeItem('usuarioCorrente');
    sessionStorage.removeItem('fp_user');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token_servidor_validado');
    sessionStorage.removeItem('token_id');
    sessionStorage.removeItem('isGuest');
    
    console.log('[Logout Servidor] Servidor deslogado com sucesso');
    
    // Redireciona para a página de login
    const loginPath = '../login/login.html';
    console.log('[Logout Servidor] Redirecionando para:', loginPath);
    
    try {
      window.location.href = loginPath;
    } catch (error) {
      console.error('[Logout Servidor] Erro ao redirecionar:', error);
      // Fallback: tenta usar caminho absoluto
      const currentUrl = new URL(window.location.href);
      const baseUrl = currentUrl.origin;
      const loginUrl = baseUrl + '/modulos/login/login.html';
      console.log('[Logout Servidor] Tentando caminho absoluto:', loginUrl);
      window.location.href = loginUrl;
    }
  }
  
  // Expõe a função globalmente para uso em outros scripts
  window.logoutUser = logoutUser;

  /**
   * Inicializa os event listeners para os botões de logout
   */
  function initLogoutButtons() {
    // Encontra todos os links/botões de "Sair" no dropdown
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

  /**
   * Verifica se o usuário está logado como servidor antes de carregar a página
   */
  function verifyServidorLogin() {
    const user = getUsuarioCorrente();
    if (!user || !user.id || user.tipo !== 'servidor') {
      console.warn('[Current User Servidor] Servidor não autenticado, redirecionando para login');
      window.location.href = '../login/login.html';
      return false;
    }
    return true;
  }

  /**
   * Inicializa quando o DOM estiver pronto
   */
  function init() {
    // Verifica se está logado como servidor
    if (!verifyServidorLogin()) {
      return;
    }
    
    // Aguarda um pouco para garantir que o DOM está totalmente carregado
    setTimeout(() => {
      loadUserData();
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM já está pronto
    init();
  }
})();

