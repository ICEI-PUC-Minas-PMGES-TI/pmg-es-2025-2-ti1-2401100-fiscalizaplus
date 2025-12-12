/**
 * Script para controlar a navbar mobile e sidebar do usuário
 * Aplicado em todas as páginas do painel do cidadão
 */

(function() {
    'use strict';

    // Controla a sidebar do usuário mobile
    function initUserSidebar() {
        const openSidebarBtn = document.getElementById('openUserSidebar');
        const closeSidebarBtn = document.getElementById('closeUserSidebar');
        const sidebar = document.getElementById('userSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const logoutLink = document.getElementById('sidebar-logout');

        // Abrir sidebar
        if (openSidebarBtn) {
            openSidebarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (sidebar) {
                    sidebar.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        }

        // Fechar sidebar
        function closeSidebar() {
            if (sidebar) {
                sidebar.classList.remove('active');
                document.body.style.overflow = '';
            }
        }

        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', closeSidebar);
        }

        if (overlay) {
            overlay.addEventListener('click', closeSidebar);
        }

        // Logout
        if (logoutLink) {
            logoutLink.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('Tem certeza que deseja sair?')) {
                    // Remove dados da sessão
                    sessionStorage.removeItem('usuarioCorrente');
                    sessionStorage.removeItem('fp_user');
                    sessionStorage.removeItem('user');
                    sessionStorage.removeItem('isGuest');
                    
                    // Calcula caminho correto para login
                    const currentPath = window.location.pathname;
                    let loginPath = '../login/login.html';
                    
                    if (currentPath.includes('/painel-cidadao/')) {
                        if (currentPath.match(/\/painel-cidadao\/[^\/]+\//)) {
                            loginPath = '../../login/login.html';
                        } else {
                            loginPath = '../login/login.html';
                        }
                    } else if (currentPath.includes('/guia/')) {
                        loginPath = '../login/login.html';
                    }
                    
                    window.location.href = loginPath;
                }
            });
        }

        // Toggle de tema na sidebar
        const sidebarThemeToggle = document.getElementById('sidebar-theme-toggle');
        const sidebarThemeIcon = document.getElementById('sidebar-theme-icon');
        const sidebarThemeText = document.getElementById('sidebar-theme-text');
        const themeToggle = document.getElementById('themeToggle');
        
        if (sidebarThemeToggle) {
            // Atualizar texto e ícone baseado no tema atual
            function updateSidebarThemeButton() {
                const currentTheme = localStorage.getItem('theme') || 'light';
                const isDark = currentTheme === 'dark';
                
                if (sidebarThemeIcon) {
                    sidebarThemeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
                }
                if (sidebarThemeText) {
                    sidebarThemeText.textContent = isDark ? 'Modo Claro' : 'Modo Escuro';
                }
            }
            
            // Atualizar ao carregar
            updateSidebarThemeButton();
            
            // Listener para mudança de tema
            sidebarThemeToggle.addEventListener('click', function(e) {
                e.preventDefault();
                // Simula clique no botão de tema principal
                if (themeToggle) {
                    themeToggle.click();
                } else {
                    // Fallback: alterna manualmente
                    const currentTheme = localStorage.getItem('theme') || 'light';
                    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                    document.documentElement.setAttribute('data-theme', newTheme);
                    localStorage.setItem('theme', newTheme);
                }
                // Atualiza o botão após um pequeno delay
                setTimeout(updateSidebarThemeButton, 100);
            });
            
            // Observar mudanças no atributo data-theme
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

    // Detecta página ativa e marca o ícone correspondente
    function setActiveIcon() {
        const currentPath = window.location.pathname;
        const navIcons = document.querySelectorAll('.nav-icon-link[data-page]');
        
        navIcons.forEach(icon => {
            icon.classList.remove('active');
            const page = icon.getAttribute('data-page');
            
            // Verifica se é a página atual
            if ((currentPath.includes('index.html') || currentPath.endsWith('/painel-cidadao/')) && page === 'home') {
                icon.classList.add('active');
            } else if (currentPath.includes('comunidade') && page === 'comunidade') {
                icon.classList.add('active');
            } else if (currentPath.includes('dashboard') && page === 'dashboard') {
                icon.classList.add('active');
            } else if (currentPath.includes('guia') && page === 'guia') {
                icon.classList.add('active');
            }
        });
    }

    // Inicializa quando o DOM estiver pronto
    function init() {
        initUserSidebar();
        setActiveIcon();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

