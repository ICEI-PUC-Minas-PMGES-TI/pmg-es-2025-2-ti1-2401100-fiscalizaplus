
document.addEventListener('DOMContentLoaded', () => {
  // Simulação de dados
  const resolvidas = 16280;
  const andamento = 3540;
  const pendentes = 1200;
  const hoje = 45;
  const total = resolvidas + andamento + pendentes;

  // Atualiza cards
  document.getElementById('totalAdmin').textContent = total.toLocaleString();
  document.getElementById('resolvidasAdmin').textContent = resolvidas.toLocaleString();
  document.getElementById('andamentoAdmin').textContent = andamento.toLocaleString();
  document.getElementById('hojeAdmin').textContent = hoje.toLocaleString();

  // Donut
  const donut = document.getElementById('donutAdmin');
  if (donut) {
    const degResolvidas = (resolvidas / total) * 360;
    const degAndamento = (andamento / total) * 360;
    donut.style.background = `conic-gradient(#4CAF50 0 ${degResolvidas}deg, #FFB300 ${degResolvidas}deg ${degResolvidas + degAndamento}deg, #E53935 ${degResolvidas + degAndamento}deg 360deg)`;
    const pct = Math.round((resolvidas / total) * 100);
    document.getElementById('donutAdminCenter').textContent = pct + '%';
  }

  // Tabela dinâmica (dados simulados)
  const denuncias = [
    { id: 'OCOR-002021', titulo: 'Poste queimado na rua X', status: 'Aguardando análise', data: '21/09/2025' },
    { id: 'OCOR-002020', titulo: 'Buraco na rua Y', status: 'Aguardando análise', data: '21/09/2025' },
    { id: 'OCOR-002019', titulo: 'Falta de sinalização na rua B', status: 'Em andamento', data: '21/09/2025' },
    { id: 'OCOR-002018', titulo: 'Buraco na avenida L', status: 'Resolvido', data: '21/09/2025' },
    { id: 'OCOR-002017', titulo: 'Falta de sinalização na rua B', status: 'Aguardando análise', data: '21/09/2025' },
  ];

  const tbody = document.getElementById('tabela-corpo');
  denuncias.forEach(d => {
    const tr = document.createElement('tr');
    const statusClass = d.status.toLowerCase().includes('resol') ? 'resolvido' : (d.status.toLowerCase().includes('andamento') ? 'andamento' : 'pendente');
    tr.innerHTML = `
      <td>${d.id}</td>
      <td>${d.titulo}</td>
      <td><span class="status ${statusClass}">${d.status}</span></td>
      <td>${d.data}</td>
    `;
    tbody.appendChild(tr);
  });
});
