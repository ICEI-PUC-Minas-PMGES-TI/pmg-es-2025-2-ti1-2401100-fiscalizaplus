// Lista de possíveis status
const statusList = ["Pendente", "Em análise", "Em andamento", "Concluído"];
let todasOcorrencias = []; // Armazena todas para pesquisa posterior

// Função principal para carregar as ocorrências
async function carregarOcorrencias() {
  try {
    const response = await fetch('../../../db/db.json');
    const dados = await response.json();
    todasOcorrencias = dados.ocorrencias; // salva todas as ocorrências

    renderizarTabela(todasOcorrencias);

    // Evento de pesquisa
    const inputPesquisa = document.querySelector('input[type="text"]');
    inputPesquisa.addEventListener("input", (e) => {
      const termo = e.target.value.toLowerCase().trim();
      const filtradas = todasOcorrencias.filter(oc =>
        oc.titulo.toLowerCase().includes(termo) ||
        oc.tipo.toLowerCase().includes(termo)
      );
      renderizarTabela(filtradas);
    });

  } catch (error) {
    console.error("❌ Erro ao carregar ocorrências:", error);
  }
}

// Função para renderizar as ocorrências na tabela
function renderizarTabela(lista) {
  const tbody = document.querySelector("tbody");
  tbody.innerHTML = "";

  lista.forEach((oc) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${oc.titulo}</td>
      <td>${oc.tipo}</td>
      <td class="status-col">${oc.status}</td>
      <td>${formatarData(oc.createdAt)}</td>
      <td class="position-relative">
        <button class="btn btn-sm btn-outline-danger rounded-circle btn-status" data-id="${oc.id}">
          <i class="bi bi-chevron-down"></i>
        </button>
        <div class="dropdown-status shadow bg-white border rounded d-none position-absolute end-0 mt-1" style="z-index: 10;">
          ${statusList.map(status => `
            <button class="dropdown-item text-start w-100 py-1 px-3" data-status="${status}">
              ${status}
            </button>
          `).join("")}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  ativarEventosDropdown();
}

// Função para configurar os eventos dos dropdowns
function ativarEventosDropdown() {
  // Abre/fecha dropdown
  document.querySelectorAll(".btn-status").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const dropdown = e.currentTarget.nextElementSibling;
      document.querySelectorAll(".dropdown-status").forEach(d => d.classList.add("d-none"));
      dropdown.classList.toggle("d-none");
    });
  });

  // Seleciona novo status
  document.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const novoStatus = e.currentTarget.getAttribute("data-status");
      const linha = e.currentTarget.closest("tr");
      linha.querySelector(".status-col").textContent = novoStatus;
      e.currentTarget.closest(".dropdown-status").classList.add("d-none");

      const titulo = linha.querySelector("td").textContent;
      console.log(`✅ Status da ocorrência "${titulo}" alterado para "${novoStatus}"`);
    });
  });

  // Fecha dropdown ao clicar fora
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".btn-status") && !e.target.closest(".dropdown-status")) {
      document.querySelectorAll(".dropdown-status").forEach(d => d.classList.add("d-none"));
    }
  });
}

// Função para formatar data ISO em formato BR
function formatarData(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleDateString("pt-BR");
}

// Inicializa
document.addEventListener("DOMContentLoaded", carregarOcorrencias);
