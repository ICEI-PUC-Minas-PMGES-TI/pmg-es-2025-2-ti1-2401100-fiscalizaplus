/* ============ Utilidades ============ */
const YEAR_SPAN = document.getElementById('year');
if (YEAR_SPAN) YEAR_SPAN.textContent = new Date().getFullYear();

const STORAGE_KEY = 'fiscaliza_status_by_report';

/** Lê o mapa { id: status } do localStorage */
function readStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

/** Salva status de 1 relato e persiste */
function saveStatus(reportId, status) {
  const data = readStorage();
  data[reportId] = status;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Aplica visual e atributos de status em um <article.report> */
function applyStatus(reportEl, status) {
  reportEl.dataset.status = status;

  // Atualiza pílula (classe e texto)
  const pill = reportEl.querySelector('.status-pill');
  const text = reportEl.querySelector('.status-text');

  pill.classList.remove('status--pendente', 'status--andamento', 'status--concluido');
  pill.classList.add(`status--${status}`);

  if (text) {
    if (status === 'pendente') text.textContent = 'Pendente';
    if (status === 'andamento') text.textContent = 'Em andamento';
    if (status === 'concluido') text.textContent = 'Concluído';
  }
}

/* ============ Inicialização de estados ============ */
const reports = Array.from(document.querySelectorAll('.report'));
const saved = readStorage();

// Restaura estados salvos
reports.forEach(report => {
  const id = report.dataset.id;
  const select = report.querySelector('.status-select');
  const status = saved[id] || report.dataset.status || 'pendente';

  select.value = status;
  applyStatus(report, status);

  // Listeners de mudança
  select.addEventListener('change', e => {
    const newStatus = e.target.value;
    applyStatus(report, newStatus);
    saveStatus(id, newStatus);
    // Reaplica filtro atual se existir
    const current = document.querySelector('.tab.is-active')?.dataset.filter || 'todos';
    filterBy(current);
  });
});

/* Filtro por abas*/
const tabs = Array.from(document.querySelectorAll('.tab'));
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    tabs.forEach(b => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'));
    filterBy(btn.dataset.filter);
  });
});

/** Mostra/oculta relatos conforme filtro */
function filterBy(filter) {
  reports.forEach(report => {
    const st = report.dataset.status; // pendente | andamento | concluido
    let show = true;

    if (filter === 'pendente') show = (st === 'pendente');
    if (filter === 'andamento') show = (st === 'andamento');
    if (filter === 'concluido') show = (st === 'concluido');
    // 'todos' sempre mostra

    report.style.display = show ? '' : 'none';
  });
}

// Aplica filtro "todos" ao carregar
filterBy('todos');

