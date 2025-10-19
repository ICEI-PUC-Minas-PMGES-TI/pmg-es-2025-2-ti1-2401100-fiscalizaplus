(function () {
  function getUsuarioCorrente() {
    try {
      const raw = sessionStorage.getItem('usuarioCorrente');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao carregar ' + url);
    return res.json();
  }



  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return 'Data inválida';
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'aberto': return 'Aberto';
      case 'em_andamento': return 'Em andamento';
      case 'resolvido': return 'Resolvido';
      default: return 'Indefinido';
    }
  }

  async function init() {
    const user = getUsuarioCorrente();
    if (!user) return;
    const usuario = await fetchJson(`/usuarios/${user.id}`);

    const ultimasDenuncias = await fetchJson(`/ocorrencias?usuarioId=${usuario.id}&_sort=createdAt&_order=desc&_limit=2`);
    const ultimasDenunciasContainer = document.getElementById('ultimas-denuncias');
    
    if (ultimasDenunciasContainer) {
      if (ultimasDenuncias.length === 0) {
        ultimasDenunciasContainer.innerHTML = '<p class="text-muted small">Nenhuma denúncia encontrada.</p>';
      } else {
        ultimasDenunciasContainer.innerHTML = '';
        ultimasDenuncias.forEach((denuncia, index) => {
          const denunciaDiv = document.createElement('div');
          denunciaDiv.className = `denuncia-item status-${denuncia.status}`;
          denunciaDiv.innerHTML = `
            <div class="denuncia-titulo">${index + 1}. ${denuncia.titulo}</div>
            <div class="denuncia-meta">
              ${getStatusLabel(denuncia.status)} • ${denuncia.tipo} • ${formatDate(denuncia.createdAt)}
            </div>
          `;
          ultimasDenunciasContainer.appendChild(denunciaDiv);
        });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(err => console.error('Erro ao preencher painel do usuário:', err));
  });
})();
