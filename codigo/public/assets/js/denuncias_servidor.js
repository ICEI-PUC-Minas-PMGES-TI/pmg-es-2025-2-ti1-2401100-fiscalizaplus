const API_URL = "http://localhost:3000/denuncias";
async function carregarDenuncia(id = 1) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) throw new Error("Erro ao carregar a denúncia.");

    const d = await response.json();

    
    document.getElementById("campoId").value = d.codigoOcorrencia || "";
    document.getElementById("campoCategoria").value = d.tipoProblema || "";
    document.getElementById("campoTitulo").value = d.titulo || "";
    document.getElementById("campoPrioridade").value = d.prioridadeCidadao || "";
    document.getElementById("campoUrgencia").value = d.urgenciaCidadao || "";
    document.getElementById("campoImpacto").value = d.impactoComunidade || "";
    document.getElementById("campoDescricao").value = d.descricaoCompleta || "";

    
    document.getElementById("feedback").value =
      d.observacoesInternasServidor || "";

    
    document.getElementById("status").value =
      d.statusAtual || "Pendente";

    document.getElementById("status").value =
      d.statusAtual || "Em Análise";

    document.getElementById("status").value =
      d.statusAtual || "Concluído";
    
    const grid = document.querySelector(".imagens-grid");
    grid.innerHTML = "";

    (d.imagens || []).forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Imagem da denúncia";
      grid.appendChild(img);
    });

    
    const lat = d.endereco?.latitude;
    const lon = d.endereco?.longitude;

    if (lat && lon) {
      document.querySelector(".map-container iframe").src =
        `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
    }

   
    document.querySelector(".btn-salvar").dataset.id = d.id;

  } catch (erro) {
    console.error("Erro:", erro);
    mostrarMensagem("Erro ao carregar os dados.", "error");
  }
}


async function salvarAlteracoes() {
  const id = document.querySelector(".btn-salvar").dataset.id;

  const statusAtual = document.getElementById("status").value;
  const observacoesInternasServidor = document.getElementById("feedback").value;

  if (!statusAtual) {
    alert("Selecione um status.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statusAtual: statusAtual,
        observacoesInternasServidor: observacoesInternasServidor,
        dataUltimaAtualizacaoStatus: new Date().toISOString()
      })
    });

    if (!response.ok) throw new Error("Erro ao salvar.");

    mostrarMensagem("Alterações salvas com sucesso!");

  } catch (erro) {
    console.error("Erro:", erro);
    mostrarMensagem("Erro ao salvar.", "error");
  }
}


function mostrarMensagem(texto, tipo = "success") {
  const div = document.createElement("div");
  div.className = `feedback-admin ${tipo === "error" ? "bg-danger" : "bg-success"}`;
  div.textContent = texto;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

async function salvarAlteracoes() {
  const id = document.querySelector(".btn-salvar").dataset.id;

  const statusAtual = document.getElementById("status").value;
  const observacoesInternasServidor = document.getElementById("feedback").value;

  if (!statusAtual || statusAtual === "Selecione...") {
    mostrarMensagem("Por favor, altere o status da denúncia.", "error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statusAtual,
        observacoesInternasServidor,
        dataUltimaAtualizacaoStatus: new Date().toISOString()
      })
    });

    if (!response.ok) throw new Error("Erro ao salvar.");

    mostrarMensagem("Alterações salvas com sucesso!");
    
  } catch (erro) {
    console.error("Erro:", erro);
    mostrarMensagem("Erro ao salvar.", "error");
  }
}


document.addEventListener("DOMContentLoaded", () => carregarDenuncia(1));
document.querySelector(".btn-salvar").addEventListener("click", salvarAlteracoes);
document.querySelector(".btn-cancelar").addEventListener("click", () => carregarDenuncia(1));
