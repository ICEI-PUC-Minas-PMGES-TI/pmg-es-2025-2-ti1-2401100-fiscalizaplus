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

        // Preencher data de registro
        if (d.dataRegistro) {
            const dataFormatada = new Date(d.dataRegistro).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            document.getElementById("campoDataRegistro").value = dataFormatada;
        }

        // Preencher endereço
        if (d.endereco) {
            const enderecoCompleto = `${d.endereco.rua || ''}, ${d.endereco.numero || ''} - ${d.endereco.bairro || ''}, ${d.endereco.cidade || ''}, ${d.endereco.estado || ''}`;
            document.getElementById("campoEndereco").value = enderecoCompleto;
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
                    img.src = url.startsWith('http') ? url : `http://localhost:3000${url}`;
                    img.alt = `Imagem ${index + 1} da denúncia`;
                    img.className = "img-thumbnail";
                    img.style.cursor = "pointer";
                    
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

        // Salvar ID para uso posterior
        const btnEnviar = document.getElementById("btnEnviarRelatorio");
        if (btnEnviar) {
            btnEnviar.dataset.id = d.id;
        }

    } catch (erro) {
        console.error("Erro:", erro);
        mostrarMensagem(erro.message || "Erro ao carregar os dados.", "error");
    }
}

// Função para enviar relatório por e-mail
async function enviarRelatorio(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const btnEnviar = document.getElementById("btnEnviarRelatorio");
    if (!btnEnviar) {
        console.error("Botão de enviar relatório não encontrado!");
        mostrarMensagem("Erro: Botão não encontrado.", "error");
        return;
    }
    
    // Tentar obter ID do dataset do botão ou da URL
    let id = btnEnviar?.dataset.id;
    if (!id) {
        id = getUrlParameter("id");
    }
    
    const emailDestinatario = document.getElementById("emailDestinatario")?.value.trim();
    const mensagem = document.getElementById("mensagemDestinatario")?.value.trim();

    if (!id) {
        mostrarMensagem("ID da denúncia não encontrado.", "error");
        return;
    }

    if (!emailDestinatario) {
        mostrarMensagem("Por favor, informe o e-mail do destinatário.", "error");
        document.getElementById("emailDestinatario")?.focus();
        return;
    }

    // Validar formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailDestinatario)) {
        mostrarMensagem("Por favor, informe um e-mail válido.", "error");
        document.getElementById("emailDestinatario")?.focus();
        return;
    }

    try {
        // Buscar dados completos da denúncia
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) {
            throw new Error("Erro ao buscar dados da denúncia.");
        }
        const denuncia = await response.json();

        // Desabilitar botão durante o envio
        btnEnviar.disabled = true;
        btnEnviar.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Enviando...';

        // Simular envio de e-mail (em produção, isso seria uma chamada a uma API de e-mail)
        // Por enquanto, vamos apenas simular o envio
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Gerar conteúdo do relatório
        const relatorioHTML = gerarRelatorioHTML(denuncia, mensagem);

        // Em produção, aqui você faria uma chamada para sua API de envio de e-mail
        // Por exemplo: await fetch('/api/enviar-email', { method: 'POST', body: JSON.stringify({...}) })
        
        console.log('Relatório que seria enviado:', {
            para: emailDestinatario,
            assunto: `Relatório de Denúncia - ${denuncia.codigoOcorrencia || id}`,
            html: relatorioHTML
        });

        mostrarMensagem(`Relatório enviado com sucesso para ${emailDestinatario}!`, "success");
        
        // Resetar formulário após 2 segundos
        setTimeout(() => {
            document.getElementById("emailDestinatario").value = '';
            document.getElementById("mensagemDestinatario").value = '';
            btnEnviar.disabled = false;
            btnEnviar.innerHTML = '<i class="bi bi-send me-1"></i>Enviar Relatório';
        }, 2000);

    } catch (erro) {
        console.error("Erro:", erro);
        mostrarMensagem(erro.message || "Erro ao enviar o relatório.", "error");
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = '<i class="bi bi-send me-1"></i>Enviar Relatório';
    }
}

// Função para gerar HTML do relatório
function gerarRelatorioHTML(denuncia, mensagemPersonalizada) {
    const dataFormatada = denuncia.dataRegistro 
        ? new Date(denuncia.dataRegistro).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'N/A';

    const enderecoCompleto = denuncia.endereco
        ? `${denuncia.endereco.rua || ''}, ${denuncia.endereco.numero || ''} - ${denuncia.endereco.bairro || ''}, ${denuncia.endereco.cidade || ''}, ${denuncia.endereco.estado || ''}`
        : 'N/A';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #d62828 0%, #b71c1c 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .section { margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
                .label { font-weight: bold; color: #d62828; }
                .value { margin-bottom: 10px; }
                .imagens { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
                .imagens img { max-width: 200px; border-radius: 8px; }
                .mensagem { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; border-radius: 4px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Relatório de Denúncia</h1>
                    <p>Código: ${denuncia.codigoOcorrencia || denuncia.id}</p>
                </div>

                ${mensagemPersonalizada ? `
                    <div class="mensagem">
                        <strong>Mensagem:</strong><br>
                        ${mensagemPersonalizada}
                    </div>
                ` : ''}

                <div class="section">
                    <h2>Informações Básicas</h2>
                    <div class="value"><span class="label">Título:</span> ${denuncia.titulo || 'N/A'}</div>
                    <div class="value"><span class="label">Categoria:</span> ${capitalizeFirst(denuncia.tipoProblema) || 'N/A'}</div>
                    <div class="value"><span class="label">Status:</span> ${denuncia.statusAtual || 'N/A'}</div>
                    <div class="value"><span class="label">Data de Registro:</span> ${dataFormatada}</div>
                </div>

                <div class="section">
                    <h2>Descrição</h2>
                    <p>${denuncia.descricaoCompleta || denuncia.descricao || 'Sem descrição'}</p>
                </div>

                <div class="section">
                    <h2>Localização</h2>
                    <div class="value"><span class="label">Endereço:</span> ${enderecoCompleto}</div>
                    ${denuncia.endereco?.latitude && denuncia.endereco?.longitude ? `
                        <div class="value">
                            <span class="label">Coordenadas:</span> 
                            ${denuncia.endereco.latitude}, ${denuncia.endereco.longitude}
                        </div>
                    ` : ''}
                </div>

                ${denuncia.imagens && denuncia.imagens.length > 0 ? `
                    <div class="section">
                        <h2>Imagens</h2>
                        <div class="imagens">
                            ${denuncia.imagens.map(img => `
                                <img src="${img.startsWith('http') ? img : `http://localhost:3000${img}`}" alt="Imagem da denúncia">
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 0.9em;">
                    <p>Este é um relatório gerado automaticamente pelo sistema FiscalizaPlus</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Função para mostrar mensagens
function mostrarMensagem(texto, tipo = "success") {
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
    const btnEnviar = document.getElementById("btnEnviarRelatorio");
    const btnCancelar = document.querySelector(".btn-cancelar");

    if (btnEnviar) {
        // Garantir que o botão esteja habilitado
        btnEnviar.disabled = false;
        btnEnviar.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            enviarRelatorio(e);
        });
    } else {
        console.error("Botão btnEnviarRelatorio não encontrado no DOM!");
    }

    if (btnCancelar) {
        btnCancelar.addEventListener("click", (e) => {
            e.preventDefault();
            window.close();
        });
    }
});


