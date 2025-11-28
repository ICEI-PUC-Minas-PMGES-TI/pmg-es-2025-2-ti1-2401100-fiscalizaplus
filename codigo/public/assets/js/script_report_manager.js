const URL_BASE = "/denuncias";

document.addEventListener('DOMContentLoaded', () => {

    const tableBody = document.querySelector('tbody');
    const cardElement = document.querySelector('.card');

    // --- Estado da Aplicação ---
    let allDenuncias = [];      
    let currentPage = 1;        
    const itemsPerPage = 25;  

     /* Função Principal: Busca os dados e inicializa a tabela */
    async function init() {
        try {
            const response = await fetch(URL_BASE); // Puxa os dados
            if (!response.ok) {
                throw new Error('Falha ao carregar denúncias.json');
            }
            allDenuncias = await response.json();
            
            renderTable();
            setupPagination();
            setupEventListeners();

        } catch (error) {
            console.error('Erro ao inicializar:', error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar os dados.</td></tr>`;
        }
    }

     /* Renderiza a tabela com os itens da página atual*/
    function renderTable() {
        // Limpa a tabela antes de desenhar
        tableBody.innerHTML = '';

        // Calcula o "slice" (fatia) de dados para a página atual
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = allDenuncias.slice(startIndex, endIndex);

        // Cria o HTML para cada linha
        paginatedItems.forEach(item => {
            const tr = document.createElement('tr');
            
            // Formata a data para o padrão brasileiro
            const dataFormatada = new Date(item.dataRegistro).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });

            tr.innerHTML = `
                <td>${item.codigoOcorrencia}</td>
                <td>${item.tipoProblema}</td>
                <td>
                    <span class="badge ${getStatusClass(item.statusAtual)}">${item.statusAtual}</span>
                </td>
                <td>${dataFormatada}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-visualizar" data-id="${item.id}">
                        <i class="bi bi-eye me-1"></i> Visualizar
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    /* Cria e renderiza os controles de paginação (1, 2, 3...)*/
    function setupPagination() {
        const totalPages = Math.ceil(allDenuncias.length / itemsPerPage);
        
        // Remove a paginação antiga, se existir
        const oldPagination = document.getElementById('pagination-container');
        if (oldPagination) {
            oldPagination.remove();
        }

        // Cria o container da paginação
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        paginationContainer.classList.add('d-flex', 'justify-content-center', 'mt-4'); // Centraliza

        let paginationHTML = '<nav><ul class="pagination">';

        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        paginationHTML += '</ul></nav>';
        paginationContainer.innerHTML = paginationHTML;
        
        // Adiciona a paginação ao final do card
        cardElement.appendChild(paginationContainer);
    }

    /**
     * Adiciona os "ouvintes" de eventos para a paginação e botões
     * Usamos delegação de eventos para performance
     */
    function setupEventListeners() {
        
        // 1. Ouvinte para os cliques na PAGINAÇÃO
        cardElement.addEventListener('click', (e) => {
            // Verifica se o clique foi em um link de página
            if (e.target.classList.contains('page-link')) {
                e.preventDefault(); // Impede o link de navegar
                const page = parseInt(e.target.dataset.page, 10);

                if (page !== currentPage) {
                    currentPage = page;
                    renderTable();       // Redesenha a tabela com os novos itens
                    setupPagination();   // Redesenha a paginação para marcar o 'active'
                }
            }
        });

        // 2. Ouvinte para os cliques nos botões "VISUALIZAR"
        tableBody.addEventListener('click', (e) => {
            // Encontra o botão mais próximo que foi clicado
            const button = e.target.closest('.btn-visualizar');
            if (button) {
                const denunciaId = button.dataset.id;
                visualizarDenuncia(denunciaId);
            }
        });
    }

    /**
     * Ação do botão "Visualizar"
     */
    function visualizarDenuncia(id) {
        console.log('Visualizando denúncia com ID:', id);
        // Aqui você pode, por exemplo, abrir um modal ou navegar para outra página
        alert(`Você clicou para visualizar a denúncia: ${id}`);
    }

    /**
     * Helper: Retorna uma classe de cor do Bootstrap com base no status
     */
    function getStatusClass(status) {
        switch (status.toLowerCase()) {
            case 'aberto':
                return 'bg-danger';
            case 'em andamento':
                return 'bg-warning text-dark'; // 'text-dark' para melhor leitura em fundo amarelo
            case 'resolvido':
                return 'bg-success';
            default:
                return 'bg-secondary';
        }
    }

    // Inicia a aplicação
    init();
});