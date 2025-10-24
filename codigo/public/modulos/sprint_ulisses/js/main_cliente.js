document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Busca os dados do backend
    const res = await fetch('http://localhost:3000/denuncias');
    const denuncias = await res.json();
    console.log('Denúncias carregadas:', denuncias);

    // Calcula estatísticas
    const total = denuncias.length;
    const resolvidas = denuncias.filter(d => d.status === 'resolvido').length;
    const andamento = denuncias.filter(d => d.status === 'andamento').length;
    const pendentes = denuncias.filter(d => d.status === 'pendente').length;

    // Atualiza cards no dashboard
    document.getElementById('totalDenuncias').textContent = total;
    document.getElementById('resolvidas').textContent = resolvidas;
    document.getElementById('andamento').textContent = andamento;

    // Atualiza o donut
    const donut = document.getElementById('donutCliente');
    if (donut) {
      const degResolvidas = (resolvidas / total) * 360;
      const degAndamento = (andamento / total) * 360;
      donut.style.background = `conic-gradient(
        #4CAF50 0 ${degResolvidas}deg,
        #FFB300 ${degResolvidas}deg ${degResolvidas + degAndamento}deg,
        #E53935 ${degResolvidas + degAndamento}deg 360deg
      )`;
      const pct = Math.round((resolvidas / total) * 100);
      document.getElementById('donutCenter').textContent = pct + '%';
    }

  } catch (error) {
    console.error('Erro ao buscar dados do servidor JSON:', error);
  }
});