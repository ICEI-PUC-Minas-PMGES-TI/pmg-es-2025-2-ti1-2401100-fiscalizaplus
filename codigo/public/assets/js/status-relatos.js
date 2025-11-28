//teste

// Seleciona todos os botões de aba e os relatos
const tabs = document.querySelectorAll('.tab');
const reports = document.querySelectorAll('.report');

// Função que aplica o filtro
function filtrarRelatos(filtro) {
  reports.forEach(report => {
    const status = report.dataset.status;

    // "todos" mostra tudo; caso contrário, compara com o data-status
    if (filtro === 'todos' || filtro === status) {
      report.style.display = ''; // mostra
    } else {
      report.style.display = 'none'; // esconde
    }
  });
}

// Função para atualizar o estado visual das abas
function ativarAba(tabClicada) {
  tabs.forEach(tab => {
    const isActive = tab === tabClicada;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', isActive);
  });
}

// Adiciona os eventos de clique em cada aba
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const filtro = tab.dataset.filter; // lê "pendente", "andamento", etc.
    filtrarRelatos(filtro);
    ativarAba(tab);
  });
});