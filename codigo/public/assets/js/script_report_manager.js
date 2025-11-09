const statusList = ["Pendente", "Em análise", "Em andamento", "Concluído", "Rejeitado"];
let todasDenuncias = []; // Armazena todas as denúncias para pesquisa posterior

// --- CONFIGURAÇÃO DA API ---
const API_BASE_URL = 'http://localhost:3000'; 
const DENUNCIAS_ENDPOINT = `${API_BASE_URL}/denuncias`; // Endpoint para buscar as denúncias

// Função principal para carregar as denúncias
async function carregarDenuncias() {
    try {
        const response = await fetch(DENUNCIAS_ENDPOINT);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        
        const dados = await response.json();
        todasDenuncias = dados; 

        renderizarTabela(todasDenuncias);

        // Evento de pesquisa
        const inputPesquisa = document.querySelector('input[type="text"]');
        if (inputPesquisa) { 
            inputPesquisa.addEventListener("input", (e) => {
                const termo = e.target.value.toLowerCase().trim();
                const filtradas = todasDenuncias.filter(denuncia =>
                    denuncia.titulo.toLowerCase().includes(termo) ||
                    denuncia.tipoProblema.toLowerCase().includes(termo) || 
                    denuncia.endereco.rua.toLowerCase().includes(termo) || 
                    denuncia.statusAtual.toLowerCase().includes(termo)     
                );
                renderizarTabela(filtradas);
            });
        }

    } catch (error) {
        console.error("❌ Erro ao carregar denúncias:", error);
        // Exibir uma mensagem de erro na UI se houver um elemento para isso
        const tbody = document.querySelector("tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Falha ao carregar as denúncias. ${error.message}</td></tr>`;
        }
    }
}

// Função para renderizar as denúncias na tabela
function renderizarTabela(lista) {
    const tbody = document.querySelector("tbody");
    if (!tbody) {
        console.error("Elemento tbody não encontrado.");
        return;
    }
    tbody.innerHTML = ""; // Limpa a tabela antes de adicionar novos dados

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhuma denúncia encontrada.</td></tr>`;
        return;
    }

    lista.forEach((denuncia) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${denuncia.titulo}</td>
            <td>${denuncia.tipoProblema}</td>
            <td class="status-col">${denuncia.statusAtual}</td>
            <td>${formatarData(denuncia.dataRegistro)}</td>
            <td class="text-center">
                <a href="detalhes-denuncia.html?id=${denuncia.id}" class="btn btn-sm btn-primary">
                    Ver Detalhes
                </a>
                </td>
        `;
        tbody.appendChild(tr);
    });
}

// Função para formatar data ISO em formato BR
function formatarData(dataISO) {
    try {
        const data = new Date(dataISO);
        // Verifica se a data é válida antes de formatar
        if (isNaN(data.getTime())) {
            return "Data inválida";
        }
        return data.toLocaleDateString("pt-BR");
    } catch (e) {
        console.error("Erro ao formatar data:", e);
        return "Data inválida";
    }
}

// Inicializa o carregamento das denúncias quando a página estiver totalmente carregada
document.addEventListener("DOMContentLoaded", carregarDenuncias);