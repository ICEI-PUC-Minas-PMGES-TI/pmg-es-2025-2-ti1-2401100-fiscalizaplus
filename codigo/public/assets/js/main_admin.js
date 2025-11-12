const API_URL = "http://localhost:3000/denuncias";

// Paleta de cores padronizada
const CORES = {
  principal: "#d62828",
  resolvido: "#28A745",
  andamento: "#FFC107",
  pendente: "#E53935",
  fundoGrafico: "#F5F6FA",
  auxiliar1: "#007BFF",
  auxiliar2: "#6C757D",
  auxiliar3: "#17A2B8",
};

let allDenuncias = [];
let charts = {};


// Converte a string de data ISO para o formato PT-BR (DD/MM/AAAA)
function formatarData(dateString) {
  if (!dateString) return "Indefinida";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  } catch (e) {
    console.error("Erro ao formatar data:", dateString, e);
    return "Inválida";
  }
}

// FUNÇÃO DE BUSCA
async function fetchDenuncias() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Status HTTP: ${response.status}`);
    const data = await response.json();
    document.querySelector('#data-load-alert')?.classList.add('d-none');
    return data;
  } catch (err) {
    document.querySelector('#data-load-alert')?.classList.remove('d-none');
    return [];
  }
}

// CARDS
function updateKPIs(denuncias) {
  const total = denuncias.length;
  const concluido = denuncias.filter(d => d.statusAtual === "Concluido").length;
  const pendente = denuncias.filter(d => d.statusAtual === "Pendente").length;
  const emAndamento = denuncias.filter(d => d.statusAtual === "Em Andamento").length;

  const tempoMedioTexto = "--";

  const taxaResolucao = total > 0 ? ((concluido / total) * 100).toFixed(1) : 0;

  // Atualização dos elementos
  document.querySelector("#totalAdmin").textContent = total;
  document.querySelector("#taxaResolucao").textContent = `${taxaResolucao}%`;
  document.querySelector("#pendentesAdmin").textContent = pendente;
  document.querySelector("#andamentoAdmin").textContent = emAndamento;
  // Card de tempo médio
  document.querySelector("#tempoMedioAdmin").textContent = tempoMedioTexto;
}

// TABELA
function normalizeStatusForClass(status) {
  return status ? status.replace(/\s/g, "-") : "Pendente";
}

function renderTabela(denuncias, filtro) {
  const tbody = document.querySelector("#tabela-corpo");
  const statusVazia = document.querySelector("#tabela-status-vazia");
  if (!tbody) return;

  tbody.innerHTML = "";

  const filtradas = denuncias
    .filter(d => filtro === "all" || d.statusAtual === filtro)
    .slice(0, 10);

  if (filtradas.length === 0) {
    statusVazia?.classList.remove("d-none");
    return;
  }
  statusVazia?.classList.add("d-none");

  filtradas.sort((a, b) => new Date(b.dataRegistro) - new Date(a.dataRegistro));
  
  filtradas.forEach(d => {
    const statusClass = normalizeStatusForClass(d.statusAtual);
    const regiao = d.endereco?.bairro || "Não informado";
    const dataDenuncia = d.dataRegistro;

    const row = tbody.insertRow();
    row.innerHTML = `
  <td class="text-nowrap align-middle">${d.codigoOcorrencia}</td>
  <td class="align-middle">${d.titulo}</td>
  <td class="text-nowrap align-middle">
    <span class="status-pill status-${statusClass}">${d.statusAtual}</span>
  </td>
  <td class="text-nowrap align-middle">${formatarData(dataDenuncia)}</td>
  <td class="text-nowrap align-middle">${regiao}</td>
`;

  });
}

// ===============================
// GRÁFICOS
// ===============================
function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

function generateChartColors(count) {
  const colors = [
    CORES.principal,
    CORES.resolvido,
    CORES.andamento,
    CORES.pendente,
    CORES.auxiliar1,
    CORES.auxiliar2,
    CORES.auxiliar3,
  ];
  return colors.slice(0, count);
}

/* 1️⃣ Gráfico de Linha (Tendência Semanal) */
function initGraficoLinha(denuncias) {
  destroyChart("linha");
  const ctx = document.getElementById("graficoLinha")?.getContext("2d");
  if (!ctx) return;

  // Usando 'd.data' para análise temporal
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const contagem = dias.map((_, i) =>
    denuncias.filter(d => new Date(d.dataRegistro).getDay() === i).length
  );

  charts["linha"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: dias,
      datasets: [
        {
          label: "Denúncias Abertas",
          data: contagem,
          borderColor: CORES.principal,
          backgroundColor: `${CORES.principal}30`,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: CORES.principal,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { grid: { display: false } },
      },
    },
  });
}

/* 2️⃣ Gráfico de Pizza (Status) */
function initGraficoPizza(denuncias) {
  destroyChart("pizza");
  const ctx = document.getElementById("graficoPizza")?.getContext("2d");
  if (!ctx) return;

  const contagem = {
    Pendente: denuncias.filter(d => d.statusAtual === "Pendente").length,
    "Em Andamento": denuncias.filter(d => d.statusAtual === "Em Andamento").length,
    Concluido: denuncias.filter(d => d.statusAtual === "Concluido").length,
  };

  charts["pizza"] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(contagem),
      datasets: [
        {
          data: Object.values(contagem),
          backgroundColor: [CORES.pendente, CORES.andamento, CORES.resolvido],
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });
}

/* 3️⃣ Gráfico de Barras (Categorias) */
function initGraficoBarra(denuncias) {
  destroyChart("barra");
  const ctx = document.getElementById("graficoBarra")?.getContext("2d");
  if (!ctx) return;

  const contagem = denuncias.reduce((acc, d) => {
    const tipo = d.tipoProblema || "Outros";
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {});

  const categorias = Object.keys(contagem);
  const valores = Object.values(contagem);
  const cores = generateChartColors(categorias.length);

  charts["barra"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: categorias,
      datasets: [
        {
          data: valores,
          backgroundColor: cores,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true },
      },
    },
  });
}

/* 4️⃣ Gráfico de Barras Horizontais (Regiões) */
function initGraficoHorizontal(denuncias) {
  destroyChart("horizontal");
  const ctx = document.getElementById("graficoHorizontal")?.getContext("2d");
  if (!ctx) return;

  const contagem = denuncias.reduce((acc, d) => {
    // Adicionando um fallback seguro para bairro
    const local = d.endereco?.bairro || "Não informado";
    acc[local] = (acc[local] || 0) + 1;
    return acc;
  }, {});

  const sortedData = Object.entries(contagem)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7);

  const regioes = sortedData.map(([local]) => local);
  const valores = sortedData.map(([, qtd]) => qtd);
  const cores = generateChartColors(regioes.length);

  charts["horizontal"] = new Chart(ctx, {
    // ... resto da configuração do gráfico horizontal
    type: "bar",
    data: {
      labels: regioes,
      datasets: [
        {
          label: "Denúncias",
          data: valores,
          backgroundColor: cores,
          barThickness: 18,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: "Quantidade" } },
        y: { grid: { display: false } },
      },
    },
  });
}

/* 5️⃣ Gráfico de Área (Cumulativo Resolvidas) */
function initGraficoArea(denuncias) {
  destroyChart("area");
  const ctx = document.querySelector("#graficoArea")?.getContext("2d");
  if (!ctx) return;

  const resolvidas = denuncias
    .filter(d => (d.statusAtual) === "Concluido" && d.dataUltimaAtualizacaoStatus)
    .sort((a, b) => new Date(a.dataUltimaAtualizacaoStatus) - new Date(b.dataUltimaAtualizacaoStatus));

  let cumulative = 0;
  const resolvedData = {};
  resolvidas.forEach(d => {
    const date = new Date(d.dataUltimaAtualizacaoStatus).toISOString().split("T")[0];
    cumulative++;
    resolvedData[date] = cumulative;
  });

  const labels = Object.keys(resolvedData);
  const data = Object.values(resolvedData);
  if (labels.length === 0) return;

  charts["area"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Denúncias Concluídas",
          data: data,
          borderColor: CORES.resolvido,
          backgroundColor: `${CORES.resolvido}50`,
          fill: "origin",
          tension: 0.3,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            tooltipFormat: "dd/MM/yyyy",
            displayFormats: { day: "dd/MM" },
          },
        },
        y: { beginAtZero: true },
      },
    },
  });
}

// INICIALIZAÇÃO
async function loadDashboard() {
  allDenuncias = await fetchDenuncias();

  if (allDenuncias.length === 0) {
    console.warn("Nenhuma denúncia carregada. Verifique o json-server.");
    renderTabela([], "all");
    return;
  }

  updateKPIs(allDenuncias);
  renderTabela(allDenuncias, "all");

  // Inicialização de gráficos
  initGraficoLinha(allDenuncias);
  initGraficoPizza(allDenuncias);
  initGraficoBarra(allDenuncias);
  initGraficoHorizontal(allDenuncias);
  initGraficoArea(allDenuncias);
}

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();

  const filtro = document.querySelector("#filtroStatus");
  if (filtro) {
    filtro.addEventListener("change", e =>
      renderTabela(allDenuncias, e.target.value)
    );
  }

  const btnAtualizar = document.querySelector("#btnAtualizar");
  if (btnAtualizar) {
    btnAtualizar.addEventListener("click", loadDashboard);
  }
});