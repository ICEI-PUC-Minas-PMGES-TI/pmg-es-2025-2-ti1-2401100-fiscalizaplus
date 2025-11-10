// visualizar.js - Controle da página de visualização e relatórios
document.addEventListener("DOMContentLoaded", () => {
  const tabela = document.getElementById("tabelaDenuncias");
  const statusFilter = document.getElementById("statusFilter");
  const tipoFilter = document.getElementById("tipoFilter");
  const dataFilter = document.getElementById("dataFilter");
  const btnFiltrar = document.getElementById("btnFiltrar");
  const btnRelatorio = document.getElementById("btnRelatorio");

  // Dados mockados (pode vir do JSON server depois)
  const denuncias = [
    { id: 1, titulo: "Buraco na rua A", descricao: "Buraco grande na esquina", status: "pendente", tipo: "infraestrutura", data: "2025-10-18" },
    { id: 2, titulo: "Iluminação quebrada", descricao: "Poste apagado", status: "resolvido", tipo: "iluminacao", data: "2025-10-19" },
    { id: 3, titulo: "Lixo acumulado", descricao: "Sacos na calçada", status: "andamento", tipo: "limpeza", data: "2025-10-20" },
    { id: 4, titulo: "Asfalto irregular", descricao: "Depressão na via", status: "andamento", tipo: "infraestrutura", data: "2025-10-21" },
    { id: 5, titulo: "Praça suja", descricao: "Lixo no chão", status: "pendente", tipo: "limpeza", data: "2025-10-22" }
  ];

  let denunciasFiltradas = [...denuncias];

  function renderTabela(lista) {
    if (!tabela) return;
    tabela.innerHTML = "";

    if (lista.length === 0) {
      tabela.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhuma denúncia encontrada.</td></tr>`;
      return;
    }

    lista.forEach((d) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${d.id}</td>
        <td>${d.titulo}</td>
        <td>${d.descricao}</td>
        <td><span class="status ${d.status}">${capitalize(d.status)}</span></td>
        <td>${capitalize(d.tipo)}</td>
        <td>${new Date(d.data).toLocaleDateString("pt-BR")}</td>
      `;
      tabela.appendChild(row);
    });
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function aplicarFiltros() {
    const status = statusFilter.value;
    const tipo = tipoFilter.value;
    const data = dataFilter.value;

    denunciasFiltradas = denuncias.filter((d) => {
      const matchStatus = !status || d.status === status;
      const matchTipo = !tipo || d.tipo === tipo;
      const matchData = !data || d.data === data;
      return matchStatus && matchTipo && matchData;
    });

    renderTabela(denunciasFiltradas);
    atualizarDonut();
  }

  // Gera gráfico donut igual ao dashboard
  function atualizarDonut() {
    const total = denunciasFiltradas.length;
    const resolvidas = denunciasFiltradas.filter(d => d.status === "resolvido").length;
    const andamento = denunciasFiltradas.filter(d => d.status === "andamento").length;
    const pendentes = denunciasFiltradas.filter(d => d.status === "pendente").length;

    const donut = document.getElementById("donutCliente");
    const center = document.getElementById("donutCenter");

    if (donut && total > 0) {
      const degResolvidas = (resolvidas / total) * 360;
      const degAndamento = (andamento / total) * 360;
      donut.style.background = `conic-gradient(
        #4CAF50 0 ${degResolvidas}deg,
        #FFB300 ${degResolvidas}deg ${degResolvidas + degAndamento}deg,
        #E53935 ${degResolvidas + degAndamento}deg 360deg
      )`;
      center.textContent = Math.round((resolvidas / total) * 100) + "%";
    }
  }

  // Gera relatório PDF (modo impressão)
  btnRelatorio.addEventListener("click", () => {
    const areaRelatorio = document.createElement("div");
    areaRelatorio.innerHTML = `
      <h2>📊 Relatório de Denúncias</h2>
      <div style="margin: 20px auto; text-align:center;">
        <div id="donutCliente" class="donut">
          <div class="center" id="donutCenter">0%</div>
        </div>
      </div>
      <table style="width:100%; border-collapse: collapse;" border="1">
        <thead>
          <tr style="background:#f5f5f5;">
            <th>ID</th><th>Título</th><th>Descrição</th><th>Status</th><th>Tipo</th><th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${denunciasFiltradas.map(d => `
            <tr>
              <td>${d.id}</td>
              <td>${d.titulo}</td>
              <td>${d.descricao}</td>
              <td>${capitalize(d.status)}</td>
              <td>${capitalize(d.tipo)}</td>
              <td>${new Date(d.data).toLocaleDateString("pt-BR")}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`<html><head><title>Relatório</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        .donut { width: 160px; height: 160px; border-radius: 50%;
          margin: 0 auto; background: conic-gradient(#4CAF50 0 120deg, #FFB300 120deg 160deg, #E53935 160deg 360deg);
          display: grid; place-items: center; }
        .center { width: 90px; height: 90px; border-radius: 50%; background: white;
          display: grid; place-items: center; font-weight: bold; }
        table, th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
      </style>
      </head><body>${areaRelatorio.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  });

  // Filtrar
  btnFiltrar.addEventListener("click", aplicarFiltros);

  // Inicialização
  renderTabela(denuncias);
  atualizarDonut();
});
