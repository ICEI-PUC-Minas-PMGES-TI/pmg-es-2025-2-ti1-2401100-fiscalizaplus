
document.addEventListener('DOMContentLoaded', () => {
  // Simulação de dados (poderia vir de fetch no futuro)
  const resolvidas = 16280;
  const andamento = 3540;
  const pendentes = 1200;
  const total = resolvidas + andamento + pendentes;

  // Atualiza cards
  document.getElementById('totalDenuncias').textContent = total.toLocaleString();
  document.getElementById('resolvidas').textContent = resolvidas.toLocaleString();
  document.getElementById('andamento').textContent = andamento.toLocaleString();

  // Atualiza donut com conic-gradient
  const donut = document.getElementById('donutCliente');
  if (donut) {
    const degResolvidas = (resolvidas / total) * 360;
    const degAndamento = (andamento / total) * 360;
    const degPendentes = 360 - degResolvidas - degAndamento;
    donut.style.background = `conic-gradient(#4CAF50 0 ${degResolvidas}deg, #FFB300 ${degResolvidas}deg ${degResolvidas + degAndamento}deg, #E53935 ${degResolvidas + degAndamento}deg 360deg)`;
    const pct = Math.round((resolvidas / total) * 100);
    document.getElementById('donutCenter').textContent = pct + '%';
  }
});
