// Simulação do seu arquivo JSON (poderia vir de uma API ou arquivo externo)
const dados = {
  ocorrenciasCidadao: {
    ocorrencias: [
      {
        id: 1,
        titulo: "OCOR-002021",
        tipo: "Poste queimado na rua X",
        bairro: "Centro",
        status: "Pendente",
        data: "2025-09-21",
        autor: "Cidadão3"
      },
      {
        id: 2,
        titulo: "OCOR-002022",
        tipo: "Buraco na avenida Y",
        bairro: "Santa Efigênia",
        status: "Em análise",
        data: "2025-09-21",
        autor: "Cidadão1"
      },
      {
        id: 3,
        titulo: "OCOR-002023",
        tipo: "Lixo acumulado no bairro Z",
        bairro: "Savassi",
        status: "Em andamento",
        data: "2025-09-22",
        autor: "Cidadão5"
      },
      {
        id: 4,
        titulo: "OCOR-002024",
        tipo: "Semáforo apagado na Rua A",
        bairro: "São João Batista",
        status: "Concluído",
        data: "2025-09-23",
        autor: "Cidadão2"
      },
      {
        id: 5,
        titulo: "OCOR-002025",
        tipo: "Entulho acumulado na praça B",
        bairro: "Alípio de Melo",
        status: "Pendente",
        data: "2025-09-24",
        autor: "Cidadão3"
      }
    ]
  }
};

// Lista de possíveis status
const statusList = ["Pendente", "Em análise", "Em andamento", "Concluído"];

// Função que carrega os dados na tabela
async function carregarOcorrencias() {
  try {
    

    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    dados.ocorrenciasCidadao.ocorrencias.forEach((ocorrencia) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${ocorrencia.titulo}</td>
        <td>${ocorrencia.tipo}</td>
        <td class="status-col">${ocorrencia.status}</td>
        <td>${formatarData(ocorrencia.data)}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger rounded-circle btn-status" data-id="${ocorrencia.id}">
            <i class="bi bi-chevron-down"></i>
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Adiciona eventos aos botões de seta
    document.querySelectorAll(".btn-status").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.currentTarget.getAttribute("data-id"));
        atualizarStatus(dados, id);
      });
    });
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

// Função que atualiza o status de uma ocorrência
function atualizarStatus(dados, id) {
  const ocorrencia = dados.ocorrenciasCidadao.ocorrencias.find((o) => o.id === id);
  if (ocorrencia) {
    const atualIndex = statusList.indexOf(ocorrencia.status);
    const proximoIndex = (atualIndex + 1) % statusList.length;
    ocorrencia.status = statusList[proximoIndex];

    // Atualiza o texto da célula na tabela
    const linha = document.querySelector(`button[data-id='${id}']`).closest("tr");
    const statusCol = linha.querySelector(".status-col");
    statusCol.textContent = ocorrencia.status;

    console.log(`✅ Ocorrência ${ocorrencia.titulo} agora está "${ocorrencia.status}"`);
  }
}

// Função para formatar a data
function formatarData(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleDateString("pt-BR");
}

// Executa ao carregar a página
document.addEventListener("DOMContentLoaded", carregarOcorrencias);