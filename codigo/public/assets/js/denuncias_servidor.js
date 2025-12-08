const API_URL = "http://localhost:3000/denuncias";

// Função para obter parâmetros da URL
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Função para carregar denúncia por ID
async function carregarDenuncia(id) {
    if (!id) {
        mostrarMensagem("ID da denúncia não fornecido.", "error");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Denúncia não encontrada.");
            }
            throw new Error("Erro ao carregar a denúncia.");
        }

        const d = await response.json();

        // Preencher campos básicos
        document.getElementById("campoId").value = d.codigoOcorrencia || "N/A";
        document.getElementById("campoCategoria").value = capitalizeFirst(d.tipoProblema) || "N/A";
        document.getElementById("campoTitulo").value = d.titulo || "Sem título";
        document.getElementById("campoDescricao").value = d.descricaoCompleta || d.descricao || "Sem descrição";

        // Preencher feedback
        document.getElementById("feedback").value = d.observacoesInternasServidor || "";

        // Preencher status (corrigir lógica)
        const statusSelect = document.getElementById("status");
        if (statusSelect) {
            // Mapear status do banco para valores do select
            let statusValue = d.statusAtual || "";
            
            // Normalizar valores do banco para valores do select
            if (statusValue === "Em Andamento") {
                statusValue = "em_andamento";
            } else if (statusValue === "Concluido" || statusValue === "Concluído") {
                statusValue = "resolvido";
            } else if (statusValue === "Pendente") {
                statusValue = "aberto";
            } else {
                statusValue = ""; // Se não corresponder, deixa vazio
            }
            
            if (statusValue) {
                statusSelect.value = statusValue;
            }
        }

        // Carregar imagens
        const grid = document.querySelector(".imagens-grid");
        if (grid) {
            grid.innerHTML = "";
            
            if (d.imagens && d.imagens.length > 0) {
                d.imagens.forEach((url, index) => {
                    const imgContainer = document.createElement("div");
                    imgContainer.className = "imagem-item";
                    
                    const img = document.createElement("img");
                    // Se a URL não começar com http, adicionar o caminho base
                    img.src = url.startsWith('http') ? url : `http://localhost:3000${url}`;
                    img.alt = `Imagem ${index + 1} da denúncia`;
                    img.className = "img-thumbnail";
                    img.style.cursor = "pointer";
                    
                    // Adicionar evento de clique para ampliar
                    img.addEventListener("click", () => {
                        window.open(img.src, '_blank');
                    });
                    
                    imgContainer.appendChild(img);
                    grid.appendChild(imgContainer);
                });
            } else {
                grid.innerHTML = '<p class="text-muted">Nenhuma imagem disponível</p>';
            }
        }

        // Carregar mapa
        const lat = d.endereco?.latitude;
        const lon = d.endereco?.longitude;
        const iframe = document.querySelector(".map-container iframe");

        if (iframe && lat && lon) {
            iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
        } else if (iframe) {
            iframe.src = "";
            iframe.parentElement.innerHTML = '<p class="text-muted">Localização não disponível</p>';
        }

        // Preencher informações adicionais
        if (d.endereco) {
            const enderecoCompleto = `${d.endereco.rua || ''}, ${d.endereco.numero || ''} - ${d.endereco.bairro || ''}, ${d.endereco.cidade || ''}, ${d.endereco.estado || ''}`;
            const enderecoElement = document.getElementById("campoEndereco");
            if (enderecoElement) {
                enderecoElement.value = enderecoCompleto;
            }
        }

        // Preencher data de registro
        if (d.dataRegistro) {
            const dataFormatada = new Date(d.dataRegistro).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const dataElement = document.getElementById("campoDataRegistro");
            if (dataElement) {
                dataElement.value = dataFormatada;
            }
        }

        // Salvar ID para uso posterior
        const btnSalvar = document.querySelector(".btn-salvar");
        if (btnSalvar) {
            btnSalvar.dataset.id = d.id;
        }

    } catch (erro) {
        console.error("Erro:", erro);
        mostrarMensagem(erro.message || "Erro ao carregar os dados.", "error");
    }
}

// Função para salvar alterações
async function salvarAlteracoes() {
    const btnSalvar = document.querySelector(".btn-salvar");
    const id = btnSalvar?.dataset.id;

    if (!id) {
        mostrarMensagem("ID da denúncia não encontrado.", "error");
        return;
    }

    const statusSelect = document.getElementById("status");
    const statusAtual = statusSelect?.value;
    const observacoesInternasServidor = document.getElementById("feedback")?.value || "";

    if (!statusAtual || statusAtual === "Selecione...") {
        mostrarMensagem("Por favor, selecione um status para a denúncia.", "error");
        return;
    }

    // Mapear valores do select para status do banco
    let statusBanco = statusAtual;
    if (statusAtual === "aberto") {
        statusBanco = "Pendente";
    } else if (statusAtual === "em_andamento") {
        statusBanco = "Em Andamento";
    } else if (statusAtual === "resolvido") {
        statusBanco = "Concluido";
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                statusAtual: statusBanco,
                observacoesInternasServidor: observacoesInternasServidor,
                dataUltimaAtualizacaoStatus: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error("Erro ao salvar as alterações.");
        }

        mostrarMensagem("Alterações salvas com sucesso!", "success");
        
        // Atualizar a página após 1 segundo
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (erro) {
        console.error("Erro:", erro);
        mostrarMensagem(erro.message || "Erro ao salvar as alterações.", "error");
    }
}

// Função para mostrar mensagens
function mostrarMensagem(texto, tipo = "success") {
    // Remove mensagens anteriores
    const mensagensAnteriores = document.querySelectorAll(".feedback-admin");
    mensagensAnteriores.forEach(msg => msg.remove());

    const div = document.createElement("div");
    div.className = `feedback-admin alert alert-${tipo === "error" ? "danger" : "success"} alert-dismissible fade show`;
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    div.innerHTML = `
        ${texto}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(div);

    // Auto-remover após 5 segundos
    setTimeout(() => {
        div.remove();
    }, 5000);
}

// Helper para capitalizar primeira letra
function capitalizeFirst(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Inicialização quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
    // Obter ID da URL
    const id = getUrlParameter("id");
    
    if (id) {
        carregarDenuncia(id);
    } else {
        mostrarMensagem("ID da denúncia não fornecido na URL.", "error");
    }

    // Event listeners
    const btnSalvar = document.querySelector(".btn-salvar");
    const btnCancelar = document.querySelector(".btn-cancelar");

    if (btnSalvar) {
        btnSalvar.addEventListener("click", salvarAlteracoes);
    }

    if (btnCancelar) {
        btnCancelar.addEventListener("click", () => {
            window.close();
        });
    }
});
