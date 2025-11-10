const API_URL = "http://localhost:3000/denuncias"; // json-server endpoint

// Função principal: carrega dados da denúncia
async function carregarDenuncia(id = 1) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) throw new Error("Erro ao carregar a denúncia.");

    const denuncia = await response.json();

    // === Preenche campos da interface ===
    document.querySelector('.denuncia-form input:nth-of-type(1)').value = denuncia.codigoOcorrencia;
    document.querySelector('.denuncia-form input:nth-of-type(2)').value = denuncia.tipoProblema;
    document.querySelector('.denuncia-form input:nth-of-type(3)').value = denuncia.titulo;
    document.querySelector('.denuncia-form input:nth-of-type(4)').value = denuncia.prioridadeCidadao;
    document.querySelector('.denuncia-form input:nth-of-type(5)').value = denuncia.urgenciaCidadao;
    document.querySelector('.denuncia-form input:nth-of-type(6)').value = denuncia.impactoComunidade;
    document.querySelector('.denuncia-form textarea').value = denuncia.descricaoCompleta;

    // === Imagens ===
    const imagensGrid = document.querySelector('.imagens-grid');
    imagensGrid.innerHTML = "";
    denuncia.imagens.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Imagem do problema";
      imagensGrid.appendChild(img);
    });

    // === Feedback e status ===
    document.getElementById("feedback").value = denuncia.observacoesInternasServidor || "";
    document.getElementById("status").value = denuncia.statusAtual || "";

    // === Atualiza mapa ===
    const lat = denuncia.endereco.latitude;
    const lon = denuncia.endereco.longitude;
    const iframe = document.querySelector(".map-container iframe");
    iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;

    // Guarda o ID atual no botão "Salvar"
    document.querySelector(".btn-salvar").dataset.id = denuncia.id;

  } catch (erro) {
    console.error("Erro ao carregar denúncia:", erro);
    mostrarMensagem("Erro ao carregar dados da denúncia.", "error");
  }
}

// === Atualizar dados (status + observações internas) ===
async function salvarAlteracoes() {
  const id = document.querySelector(".btn-salvar").dataset.id;
  const statusAtual = document.getElementById("status").value;
  const observacoesInternasServidor = document.getElementById("feedback").value;
  const dataUltimaAtualizacaoStatus = new Date().toISOString();

  if (!statusAtual) {
    alert("Por favor, selecione um status antes de salvar.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statusAtual,
        observacoesInternasServidor,
        dataUltimaAtualizacaoStatus
      })
    });

    if (!response.ok) throw new Error("Erro ao salvar dados");

    mostrarMensagem("Denúncia atualizada com sucesso!", "success");
  } catch (erro) {
    console.error("Erro ao salvar:", erro);
    mostrarMensagem("Erro ao salvar denúncia.", "error");
  }
}

// === Mensagem flutuante de feedback ===
function mostrarMensagem(texto, tipo = "success") {
  const div = document.createElement("div");
  div.className = `feedback-admin ${tipo === "error" ? "bg-danger" : "bg-success"}`;
  div.textContent = texto;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// === Eventos ===
document.addEventListener("DOMContentLoaded", () => carregarDenuncia(1));
document.querySelector(".btn-salvar").addEventListener("click", (e) => {
  e.preventDefault();
  salvarAlteracoes();
});
document.querySelector(".btn-cancelar").addEventListener("click", () => {
  carregarDenuncia(1);
});