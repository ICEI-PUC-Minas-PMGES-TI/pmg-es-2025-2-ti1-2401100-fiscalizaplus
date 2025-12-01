// main_cliente.js - Dashboard do Cidadão com gráficos
const API_URL = "/denuncias";

let chartStatus = null;
let chartTipo = null;
let chartTemporal = null;

// Carregar denúncias da API
async function carregarDenuncias() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Erro ao carregar denúncias");
    const denuncias = await response.json();
    return denuncias;
  } catch (error) {
    console.error("Erro:", error);
    return [];
  }
}

// Atualizar cards de estatísticas
function atualizarCards(denuncias) {
  const total = denuncias.length;
  const resolvidas = denuncias.filter(d => d.statusAtual === "Concluido").length;
  const emAndamento = denuncias.filter(d => d.statusAtual === "Em Andamento").length;
  const pendentes = denuncias.filter(d => d.statusAtual === "Pendente").length;

  document.getElementById("totalDenuncias").textContent = total;
  document.getElementById("resolvidas").textContent = resolvidas;
  document.getElementById("andamento").textContent = emAndamento;
  document.getElementById("pendentes").textContent = pendentes;
}

// Criar gráfico de pizza para Status
function criarGraficoStatus(denuncias) {
  const ctx = document.getElementById("chartStatus");
  if (!ctx) return;

  const concluidas = denuncias.filter(d => d.statusAtual === "Concluido").length;
  const emAndamento = denuncias.filter(d => d.statusAtual === "Em Andamento").length;
  const pendentes = denuncias.filter(d => d.statusAtual === "Pendente").length;

  if (chartStatus) chartStatus.destroy();

  chartStatus = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Concluídas', 'Em Andamento', 'Pendentes'],
      datasets: [{
        data: [concluidas, emAndamento, pendentes],
        backgroundColor: ['#28A745', '#FFC107', '#E53935'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Criar gráfico de barras por Tipo
function criarGraficoTipo(denuncias) {
  const ctx = document.getElementById("chartTipo");
  if (!ctx) return;

  // Contar por tipo
  const tiposCount = {};
  denuncias.forEach(d => {
    const tipo = d.tipoProblema || "Outros";
    tiposCount[tipo] = (tiposCount[tipo] || 0) + 1;
  });

  const labels = Object.keys(tiposCount);
  const data = Object.values(tiposCount);

  if (chartTipo) chartTipo.destroy();

  chartTipo = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantidade',
        data: data,
        backgroundColor: '#007BFF',
        borderColor: '#0056b3',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Quantidade: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

// Criar gráfico de linha temporal
function criarGraficoTemporal(denuncias) {
  const ctx = document.getElementById("chartTemporal");
  if (!ctx) return;

  // Agrupar por mês
  const porMes = {};
  denuncias.forEach(d => {
    if (!d.dataRegistro) return;
    const data = new Date(d.dataRegistro);
    const mesAno = `${data.getMonth() + 1}/${data.getFullYear()}`;
    porMes[mesAno] = (porMes[mesAno] || 0) + 1;
  });

  // Ordenar por data
  const entries = Object.entries(porMes).sort((a, b) => {
    const [mesA, anoA] = a[0].split('/').map(Number);
    const [mesB, anoB] = b[0].split('/').map(Number);
    return (anoA - anoB) || (mesA - mesB);
  });

  const labels = entries.map(e => e[0]);
  const data = entries.map(e => e[1]);

  if (chartTemporal) chartTemporal.destroy();

  chartTemporal = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Denúncias por Mês',
        data: data,
        borderColor: '#d62828',
        backgroundColor: 'rgba(214, 40, 40, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: '#d62828'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Denúncias: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

// Preencher tabela de denúncias recentes - REMOVIDO

// Inicializar dashboard
async function inicializarDashboard() {
  const denuncias = await carregarDenuncias();
  
  if (denuncias.length === 0) {
    console.warn("Nenhuma denúncia carregada");
    return;
  }

  atualizarCards(denuncias);
  criarGraficoStatus(denuncias);
  criarGraficoTipo(denuncias);
  criarGraficoTemporal(denuncias);
}

// Executar quando a página carregar
document.addEventListener('DOMContentLoaded', inicializarDashboard);