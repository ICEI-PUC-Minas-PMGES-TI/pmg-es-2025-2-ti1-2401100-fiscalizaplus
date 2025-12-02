// visualizar.js - Controle da página de visualização e relatórios
document.addEventListener("DOMContentLoaded", () => {
  const tabela = document.getElementById("tabelaDenuncias");
  const statusFilter = document.getElementById("statusFilter");
  const tipoFilter = document.getElementById("tipoFilter");
  const dataFilter = document.getElementById("dataFilter");
  const btnFiltrar = document.getElementById("btnFiltrar");
  const btnRelatorio = document.getElementById("btnRelatorio");

  // =======================================================
  // ✅ Carregar denúncias do JSON Server
  // =======================================================
  async function carregarDenuncias() {
    try {
      const response = await fetch("http://localhost:3000/denuncias");

      if (!response.ok) {
        throw new Error("Erro ao acessar JSON Server");
      }

      const dados = await response.json();
      return dados;

    } catch (erro) {
      console.error("Erro ao buscar denúncias:", erro);
      return [];
    }
  }

  let denuncias = [];
  let denunciasFiltradas = [];

  // =======================================================
  // ✅ Renderizar tabela
  // =======================================================
  function renderTabela(lista) {
    if (!tabela) return;
    tabela.innerHTML = "";

    if (lista.length === 0) {
      tabela.innerHTML =
        `<tr><td colspan="6" style="text-align:center;">Nenhuma denúncia encontrada.</td></tr>`;
      return;
    }

    lista.forEach((d) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${d.id}</td>
        <td>${d.titulo}</td>
        <td>${d.descricaoCompleta || d.descricao || ''}</td>
        <td><span class="status ${d.statusAtual || d.status}">${capitalize(d.statusAtual || d.status)}</span></td>
        <td>${capitalize(d.tipoProblema || d.tipo)}</td>
        <td>${new Date(d.dataRegistro || d.data).toLocaleDateString("pt-BR")}</td>
      `;
      tabela.appendChild(row);
    });
  }

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // =======================================================
  // ✅ Filtros
  // =======================================================
  function aplicarFiltros() {
    const status = statusFilter.value;
    const tipo = tipoFilter.value;
    const data = dataFilter.value;

    denunciasFiltradas = denuncias.filter((d) => {
      const itemStatus = d.statusAtual || d.status;
      const itemTipo = d.tipoProblema || d.tipo;
      const itemData = d.dataRegistro || d.data;

      const matchStatus = (status === "all") || itemStatus === status;
      const matchTipo = (tipo === "all") || itemTipo === tipo;

      let matchData = true;
      if (data && itemData) {
        const dataItem = new Date(itemData).toISOString().split('T')[0];
        matchData = dataItem === data;
      }

      return matchStatus && matchTipo && matchData;
    });

    renderTabela(denunciasFiltradas);
    atualizarDonut();
  }

  // =======================================================
  // ✅ Gráfico donut
  // =======================================================
  function atualizarDonut() {
    const total = denunciasFiltradas.length;
    // Ajuste dos status conforme db.json (Pendente, Em Andamento, Concluido)
    // Normalizando para lowercase para comparação se necessário, mas db.json usa CamelCase ou Capitalized
    const resolvidos = denunciasFiltradas.filter(d => (d.statusAtual || d.status) === "Concluido").length;
    const andamento = denunciasFiltradas.filter(d => (d.statusAtual || d.status) === "Em Andamento").length;
    const pendentes = denunciasFiltradas.filter(d => (d.statusAtual || d.status) === "Pendente").length;

    const donut = document.getElementById("donutCliente");
    const center = document.getElementById("donutCenter");

    if (donut && total > 0) {
      const degResolvidos = (resolvidos / total) * 360;
      const degAndamento = (andamento / total) * 360;

      donut.style.background = `conic-gradient(
        #4CAF50 0 ${degResolvidos}deg,
        #FFB300 ${degResolvidos}deg ${degResolvidos + degAndamento}deg,
        #E53935 ${degResolvidos + degAndamento}deg 360deg
      )`;

      center.textContent = Math.round((resolvidos / total) * 100) + "%";
    } else if (donut) {
      donut.style.background = '#e0e0e0';
      center.textContent = "0%";
    }
  }

  // =======================================================
  // ✅ Gerar relatório PDF
  // =======================================================
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
              <td>${d.descricaoCompleta || d.descricao || ''}</td>
              <td>${capitalize(d.statusAtual || d.status)}</td>
              <td>${capitalize(d.tipoProblema || d.tipo)}</td>
              <td>${new Date(d.dataRegistro || d.data).toLocaleDateString("pt-BR")}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    `;

    // Recalcular porcentagem para o relatório impresso
    const total = denunciasFiltradas.length;
    const resolvidos = denunciasFiltradas.filter(d => (d.statusAtual || d.status) === "Concluido").length;
    const andamento = denunciasFiltradas.filter(d => (d.statusAtual || d.status) === "Em Andamento").length;

    let degResolvidos = 0;
    let degAndamento = 0;
    let percResolvidos = 0;

    if (total > 0) {
      degResolvidos = (resolvidos / total) * 360;
      degAndamento = (andamento / total) * 360;
      percResolvidos = Math.round((resolvidos / total) * 100);
    }

    const printWindow = window.open('', '', 'width=900,height=650');
    printWindow.document.write(`
      <html>
      <head>
        <title>Relatório</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          .donut { 
            width: 160px; height: 160px; border-radius: 50%; margin: 0 auto; 
            background: conic-gradient(
                #4CAF50 0 ${degResolvidos}deg,
                #FFB300 ${degResolvidos}deg ${degResolvidos + degAndamento}deg,
                #E53935 ${degResolvidos + degAndamento}deg 360deg
            );
          }
          .center { width: 90px; height: 90px; border-radius: 50%; background: white;
            display: grid; place-items: center; font-weight: bold; position: relative; top: 35px; left: 35px;}
          table, th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h2>📊 Relatório de Denúncias</h2>
        <div style="margin: 20px auto; text-align:center;">
            <div class="donut">
                <div class="center">${percResolvidos}%</div>
            </div>
        </div>
        ${areaRelatorio.querySelector('table').outerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  });

  // =======================================================
  // ✅ Inicialização
  // =======================================================
  (async () => {
    denuncias = await carregarDenuncias();
    denunciasFiltradas = [...denuncias];

    renderTabela(denuncias);
    atualizarDonut();
  })();

  btnFiltrar.addEventListener("click", aplicarFiltros);

  // =======================================================
  // ✅ Botão Enviar para Equipe (Mock)
  // =======================================================
  const btnEnviar = document.getElementById("btnEnviar");
  if (btnEnviar) {
    btnEnviar.addEventListener("click", () => {
      const originalText = btnEnviar.innerText;
      btnEnviar.disabled = true;
      btnEnviar.innerText = "Enviando... ⏳";

      setTimeout(() => {
        btnEnviar.innerText = "Enviado para a equipe ✅";
        btnEnviar.classList.remove("btn-primary"); // Remove classe original se houver
        btnEnviar.style.backgroundColor = "#28a745"; // Verde sucesso
        btnEnviar.style.borderColor = "#28a745";

        setTimeout(() => {
          btnEnviar.innerText = originalText;
          btnEnviar.disabled = false;
          btnEnviar.style.backgroundColor = ""; // Volta ao original
          btnEnviar.style.borderColor = "";
        }, 3000);
      }, 1500);
    });
  }
});
