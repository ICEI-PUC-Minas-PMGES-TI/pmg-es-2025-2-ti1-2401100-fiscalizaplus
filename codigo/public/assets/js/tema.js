// Theme Toggle Script
(function() {
    'use strict';

    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');
    const themeIcon = document.getElementById('themeIcon');
    const themeIconMobile = document.getElementById('themeIconMobile');

    // Função para obter o tema atual
    function getCurrentTheme() {
        return localStorage.getItem('theme') || 'light';
    }

    // Função para aplicar o tema
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Atualizar ícones
        const isDark = theme === 'dark';
        if (themeIcon) {
            themeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
        if (themeIconMobile) {
            themeIconMobile.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
        
        // Atualizar logo
        const navbarLogo = document.getElementById('navbarLogo');
        if (navbarLogo) {
            // Detectar o caminho correto baseado na localização atual
            const currentPath = window.location.pathname;
            let logoPath = '';
            
            // Verificar se está em uma subpasta de painel-cidadao
            const isInSubfolder = currentPath.includes('/comunidade/') || 
                                  currentPath.includes('/dashboard_cidadao/') || 
                                  currentPath.includes('/dashboard-cidadao/') ||
                                  currentPath.includes('/painel-de-usuario/') ||
                                  currentPath.includes('/meu-perfil/') ||
                                  currentPath.includes('/reportar-ocorr') ||
                                  currentPath.includes('reportar-ocorr') ||
                                  currentPath.includes('newreport');
            
            if (currentPath.includes('/modulos/painel-cidadao/')) {
                // Páginas dentro de painel-cidadao
                if (isInSubfolder) {
                    logoPath = '../../../assets/images/';
                } else {
                    // index.html na raiz de painel-cidadao
                    logoPath = '../../assets/images/';
                }
            } else if (currentPath.includes('/painel-cidadao/')) {
                // Caso o caminho não tenha /modulos/ (pode acontecer em alguns servidores)
                if (isInSubfolder) {
                    logoPath = '../../../assets/images/';
                } else {
                    logoPath = '../../assets/images/';
                }
            } else {
                // Fallback para outros casos
                logoPath = '../../assets/images/';
            }
            
            // Garantir que o caminho termina com /
            if (!logoPath.endsWith('/')) {
                logoPath += '/';
            }
            
            // Atualizar logo baseado no tema
            const logoFileName = isDark ? 'logo_modo_escuro.png' : 'logo.png';
            const newLogoSrc = logoPath + logoFileName;
            
            // Só atualizar se o caminho mudou ou se for a primeira vez
            if (navbarLogo.src !== new URL(newLogoSrc, window.location.href).href) {
                navbarLogo.src = newLogoSrc;
            }
        }
    }

    // Função para alternar o tema
    function toggleTheme() {
        const currentTheme = getCurrentTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    // Inicializar tema ao carregar a página
    function initTheme() {
        const savedTheme = getCurrentTheme();
        applyTheme(savedTheme);
    }

    // Event listeners
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    if (themeToggleMobile) {
        themeToggleMobile.addEventListener('click', toggleTheme);
    }

    // Aplicar tema ao carregar
    initTheme();
})();

