document.addEventListener("DOMContentLoaded", async () => {
  const tabela = document.getElementById("tabelaDenuncias");
  const statusFilter = document.getElementById("statusFilter");
  const tipoFilter = document.getElementById("tipoFilter");
  const dataFilter = document.getElementById("dataFilter");
  const btnFiltrar = document.getElementById("btnFiltrar");
  const btnRelatorio = document.getElementById("btnRelatorio");
  const btnEnviar = document.getElementById("btnEnviar");

  let denuncias = [];

  // 🔹 Carregar dados do JSON Server
  async function carregarDenuncias() {
    try {
      const res = await fetch("http://localhost:3000/denuncias");
      if (!res.ok) throw new Error("Erro ao buscar dados");
      denuncias = await res.json();
      renderTabela(denuncias);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      tabela.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Erro ao carregar dados.</td></tr>`;
    }
  }

  // 🔹 Renderizar tabela
  function renderTabela(lista) {
    if (!lista.length) {
      tabela.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhuma denúncia encontrada.</td></tr>`;
      return;
    }

    tabela.innerHTML = lista
      .map(
        (d) => `
        <tr>
          <td>${d.id}</td>
          <td>${d.titulo}</td>
          <td>${d.descricao}</td>
          <td>${d.status}</td>
          <td>${d.tipo}</td>
          <td>${d.data}</td>
        </tr>`
      )
      .join("");
  }

  // 🔹 Filtro dinâmico
  btnFiltrar.addEventListener("click", () => {
    const status = statusFilter.value;
    const tipo = tipoFilter.value;
    const data = dataFilter.value;

    const filtradas = denuncias.filter((d) => {
      return (
        (!status || d.status === status) &&
        (!tipo || d.tipo === tipo) &&
        (!data || d.data === data)
      );
    });

    renderTabela(filtradas);
  });

  // 🔹 Mock - Gerar Relatório
  btnRelatorio.addEventListener("click", () => {
    alert("📊 Relatório gerado com sucesso! (simulação)");
  });

  // 🔹 Mock - Encaminhar
  btnEnviar.addEventListener("click", () => {
    alert("📨 Relatório encaminhado à equipe responsável! (simulação)");
  });

  // Inicialização
  carregarDenuncias();
});
