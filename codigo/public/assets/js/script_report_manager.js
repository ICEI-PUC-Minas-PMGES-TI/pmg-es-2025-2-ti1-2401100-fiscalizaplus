const URL_BASE = `${window.location.origin}/denuncias`;

document.addEventListener('DOMContentLoaded', () => {

    const tableBody = document.querySelector('tbody');
    const cardElement = document.querySelector('.card');
    const filterStatus = document.getElementById('filterStatus');
    const filterTipo = document.getElementById('filterTipo');
    const filterData = document.getElementById('filterData');
    const searchId = document.getElementById('searchId');
    const btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
    const btnLimparFiltros = document.getElementById('btnLimparFiltros');
    const btnClearSearch = document.getElementById('btnClearSearch');
    const totalDenuncias = document.getElementById('total-denuncias');
    const noResults = document.getElementById('no-results');

    // --- Estado da Aplicação ---
    let allDenuncias = [];      
    let filteredDenuncias = [];
    let currentPage = 1;        
    const itemsPerPage = 25;

    // --- Função para ordenar denúncias por data (mais recente primeiro) ---
    function ordenarPorData(denuncias) {
        return denuncias.sort((a, b) => {
            const dataA = new Date(a.dataRegistro || 0);
            const dataB = new Date(b.dataRegistro || 0);
            return dataB - dataA; // Ordem decrescente (mais recente primeiro)
        });
    }

    // --- Função Principal: Busca os dados e inicializa a tabela ---
    async function init() {
        try {
            const response = await fetch(URL_BASE);
            if (!response.ok) {
                throw new Error('Falha ao carregar denúncias');
            }
            allDenuncias = await response.json();
            allDenuncias = ordenarPorData(allDenuncias); // Ordenar após carregar
            filteredDenuncias = [...allDenuncias];
            
            atualizarContador();
            renderTable();
            setupPagination();
            setupEventListeners();
            setupFilters();

        } catch (error) {
            console.error('Erro ao inicializar:', error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>Erro ao carregar os dados. Verifique se o servidor está rodando.
            </td></tr>`;
        }
    }

    // --- Configurar Event Listeners dos Filtros ---
    function setupFilters() {
        btnAplicarFiltros.addEventListener('click', aplicarFiltros);
        btnLimparFiltros.addEventListener('click', limparFiltros);
        btnClearSearch.addEventListener('click', () => {
            searchId.value = '';
            aplicarFiltros();
        });

        // Aplicar filtros ao pressionar Enter no campo de pesquisa
        searchId.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                aplicarFiltros();
            }
        });
    }

    // --- Aplicar Filtros ---
    function aplicarFiltros() {
        const status = filterStatus.value;
        const tipo = filterTipo.value;
        const data = filterData.value;
        const idSearch = searchId.value.trim().toUpperCase();

        filteredDenuncias = allDenuncias.filter(item => {
            // Filtro por Status
            const matchStatus = status === 'all' || item.statusAtual === status;
            
            // Filtro por Tipo
            const matchTipo = tipo === 'all' || 
                (item.tipoProblema && item.tipoProblema.toLowerCase() === tipo.toLowerCase());
            
            // Filtro por Data
            let matchData = true;
            if (data && item.dataRegistro) {
                const itemDate = new Date(item.dataRegistro).toISOString().split('T')[0];
                matchData = itemDate === data;
            }
            
            // Filtro por ID/Código
            let matchId = true;
            if (idSearch) {
                const codigo = item.codigoOcorrencia || '';
                const id = item.id ? String(item.id) : '';
                matchId = codigo.toUpperCase().includes(idSearch) || 
                         id.toUpperCase().includes(idSearch);
            }

            return matchStatus && matchTipo && matchData && matchId;
        });

        filteredDenuncias = ordenarPorData(filteredDenuncias); // Ordenar após filtrar
        currentPage = 1; // Reset para primeira página
        atualizarContador();
        renderTable();
        setupPagination();
    }

    // --- Limpar Filtros ---
    function limparFiltros() {
        filterStatus.value = 'all';
        filterTipo.value = 'all';
        filterData.value = '';
        searchId.value = '';
        filteredDenuncias = [...allDenuncias];
        filteredDenuncias = ordenarPorData(filteredDenuncias); // Garantir ordenação
        currentPage = 1;
        atualizarContador();
        renderTable();
        setupPagination();
    }

    // --- Atualizar Contador ---
    function atualizarContador() {
        if (totalDenuncias) {
            totalDenuncias.textContent = `${filteredDenuncias.length} denúncia${filteredDenuncias.length !== 1 ? 's' : ''}`;
        }
    }

    // --- Renderiza a tabela com os itens da página atual ---
    function renderTable() {
        tableBody.innerHTML = '';

        if (filteredDenuncias.length === 0) {
            if (noResults) {
                noResults.classList.remove('d-none');
            }
            return;
        }

        if (noResults) {
            noResults.classList.add('d-none');
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = filteredDenuncias.slice(startIndex, endIndex);

        paginatedItems.forEach(item => {
            const tr = document.createElement('tr');
            
            const dataFormatada = item.dataRegistro 
                ? new Date(item.dataRegistro).toLocaleDateString('pt-BR', {
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric'
                })
                : 'N/A';

            tr.innerHTML = `
                <td><strong>${item.codigoOcorrencia || 'N/A'}</strong></td>
                <td>${capitalizeFirst(item.tipoProblema) || 'N/A'}</td>
                <td>
                    <span class="badge ${getStatusClass(item.statusAtual)}">${item.statusAtual || 'N/A'}</span>
                </td>
                <td>${dataFormatada}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-primary btn-visualizar" data-id="${item.id}" title="Visualizar denúncia">
                        <i class="bi bi-eye me-1"></i> Visualizar
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
        
        // Recriar cards móveis após renderizar a tabela
        if (typeof criarCardsMobileDenuncias === 'function') {
            setTimeout(() => criarCardsMobileDenuncias(), 100);
        }
    }

    // --- Cria e renderiza os controles de paginação ---
    function setupPagination() {
        const totalPages = Math.ceil(filteredDenuncias.length / itemsPerPage);
        
        const oldPagination = document.getElementById('pagination-container');
        if (oldPagination) {
            oldPagination.remove();
        }

        if (totalPages <= 1) return;

        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        paginationContainer.classList.add('d-flex', 'justify-content-center', 'mt-4');

        let paginationHTML = '<nav><ul class="pagination mb-0">';

        // Botão Anterior
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;

        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Botão Próximo
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;

        paginationHTML += '</ul></nav>';
        paginationContainer.innerHTML = paginationHTML;
        
        cardElement.appendChild(paginationContainer);
    }

    // --- Adiciona os "ouvintes" de eventos ---
    function setupEventListeners() {
        // Paginação
        cardElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-link') || e.target.closest('.page-link')) {
                e.preventDefault();
                const pageLink = e.target.closest('.page-link') || e.target;
                const page = parseInt(pageLink.dataset.page, 10);
                
                if (page && page !== currentPage && page >= 1) {
                    currentPage = page;
                    renderTable();
                    setupPagination();
                    // Scroll para o topo da tabela
                    tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });

        // Botão Visualizar - usando event delegation no cardElement para funcionar tanto na tabela quanto nos cards móveis
        cardElement.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-visualizar');
            if (button) {
                e.preventDefault();
                e.stopPropagation();
                const denunciaId = button.dataset.id;
                visualizarDenuncia(denunciaId);
            }
        });
    }

    // --- Ação do botão "Visualizar" - Abre página externa ---
    function visualizarDenuncia(id) {
        if (!id) {
            alert('ID da denúncia não encontrado.');
            return;
        }
        // Abre a página de visualização em uma nova aba/janela
        // Em dispositivos móveis, tenta abrir na mesma janela se popup for bloqueado
        try {
            const newWindow = window.open(`denuncias_servidor.html?id=${id}`, '_blank');
            // Se popup foi bloqueado, abre na mesma janela
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                window.location.href = `denuncias_servidor.html?id=${id}`;
            }
        } catch (e) {
            // Fallback: abre na mesma janela
            window.location.href = `denuncias_servidor.html?id=${id}`;
        }
    }

    // --- Helper: Retorna uma classe de cor do Bootstrap com base no status ---
    function getStatusClass(status) {
        if (!status) return 'bg-secondary';
        
        const statusLower = status.toLowerCase();
        switch (statusLower) {
            case 'pendente':
                return 'bg-danger';
            case 'em andamento':
                return 'bg-warning text-dark';
            case 'concluido':
            case 'concluído':
                return 'bg-success';
            default:
                return 'bg-secondary';
        }
    }

    // --- Helper: Capitaliza primeira letra ---
    function capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // Inicia a aplicação
    init();
});
