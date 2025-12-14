/**
 * Script para calcular e exibir o tempo médio de resposta das denúncias
 */

(function() {
  const API_BASE = 'http://localhost:3000';
  const DENUNCIAS_ENDPOINT = `${API_BASE}/denuncias`;

  /**
   * Formata tempo em milissegundos para texto legível
   */
  function formatarTempo(ms) {
    const segundos = Math.floor(ms / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) {
      return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
    } else if (horas > 0) {
      return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    } else if (minutos > 0) {
      return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
    } else {
      return `${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`;
    }
  }

  /**
   * Calcula o tempo médio de resposta
   */
  async function calcularTempoMedio() {
    try {
      const response = await fetch(DENUNCIAS_ENDPOINT);
      if (!response.ok) throw new Error('Erro ao buscar denúncias');

      const denuncias = await response.json();

      // Filtra denúncias que foram atendidas (mudaram de Pendente para outro status)
      const denunciasAtendidas = denuncias.filter(denuncia => {
        const dataRegistro = new Date(denuncia.dataRegistro);
        const dataAtualizacao = new Date(denuncia.dataUltimaAtualizacaoStatus || denuncia.dataRegistro);
        
        // Considera atendidas se:
        // 1. Mudou de Pendente para Em Andamento ou Concluído
        // 2. Tem data de atualização diferente da data de registro
        return (
          denuncia.statusAtual !== 'Pendente' &&
          dataAtualizacao > dataRegistro
        );
      });

      if (denunciasAtendidas.length === 0) {
        mostrarResultado({
          tempoMedio: null,
          total: 0,
          detalhes: []
        });
        return;
      }

      // Calcula o tempo de resposta para cada denúncia atendida
      const temposResposta = denunciasAtendidas.map(denuncia => {
        const dataRegistro = new Date(denuncia.dataRegistro);
        const dataAtualizacao = new Date(denuncia.dataUltimaAtualizacaoStatus);
        const tempoMs = dataAtualizacao - dataRegistro;
        
        return {
          codigo: denuncia.codigoOcorrencia,
          titulo: denuncia.titulo,
          status: denuncia.statusAtual,
          dataRegistro,
          dataAtualizacao,
          tempoMs,
          tempoFormatado: formatarTempo(tempoMs)
        };
      });

      // Calcula a média
      const somaTempos = temposResposta.reduce((acc, item) => acc + item.tempoMs, 0);
      const tempoMedioMs = somaTempos / temposResposta.length;

      // Ordena por tempo (mais rápido primeiro)
      temposResposta.sort((a, b) => a.tempoMs - b.tempoMs);

      mostrarResultado({
        tempoMedio: tempoMedioMs,
        total: temposResposta.length,
        detalhes: temposResposta
      });

      // Atualiza o card do dashboard
      const cardTempo = document.getElementById('tempoMedioAdmin');
      if (cardTempo) {
        cardTempo.textContent = formatarTempo(tempoMedioMs);
      }

    } catch (error) {
      console.error('[Tempo Médio] Erro ao calcular:', error);
      document.getElementById('tempo-medio-content').innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Erro ao calcular tempo médio: ${error.message}
        </div>
      `;
    }
  }

  /**
   * Mostra o resultado no modal
   */
  function mostrarResultado(dados) {
    const content = document.getElementById('tempo-medio-content');
    if (!content) return;

    let html = '';

    if (dados.tempoMedio === null || dados.total === 0) {
      html = `
        <div class="alert alert-info text-center">
          <i class="bi bi-info-circle me-2"></i>
          Nenhuma denúncia atendida ainda para calcular o tempo médio.
        </div>
      `;
    } else {
      const tempoMedioFormatado = formatarTempo(dados.tempoMedio);
      
      // Estatísticas resumidas
      const maisRapido = dados.detalhes[0];
      const maisLento = dados.detalhes[dados.detalhes.length - 1];
      
      // Agrupa por status
      const porStatus = {};
      dados.detalhes.forEach(item => {
        if (!porStatus[item.status]) {
          porStatus[item.status] = {
            count: 0,
            totalTempo: 0
          };
        }
        porStatus[item.status].count++;
        porStatus[item.status].totalTempo += item.tempoMs;
      });

      html = `
        <div class="mb-4">
          <div class="row text-center mb-4">
            <div class="col-md-4">
              <div class="card border-primary">
                <div class="card-body">
                  <h6 class="text-muted mb-2">Tempo Médio</h6>
                  <h3 class="text-primary mb-0">${tempoMedioFormatado}</h3>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-success">
                <div class="card-body">
                  <h6 class="text-muted mb-2">Total Atendidas</h6>
                  <h3 class="text-success mb-0">${dados.total}</h3>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-info">
                <div class="card-body">
                  <h6 class="text-muted mb-2">Taxa de Atendimento</h6>
                  <h3 class="text-info mb-0">${((dados.total / window.allDenuncias?.length || 1) * 100).toFixed(1)}%</h3>
                </div>
              </div>
            </div>
          </div>

          <div class="row mb-4">
            <div class="col-md-6">
              <div class="card">
                <div class="card-header bg-success text-white">
                  <i class="bi bi-lightning-charge me-2"></i>Resposta Mais Rápida
                </div>
                <div class="card-body">
                  <p class="mb-1"><strong>${maisRapido.codigo}</strong></p>
                  <p class="text-muted small mb-1">${maisRapido.titulo.substring(0, 50)}${maisRapido.titulo.length > 50 ? '...' : ''}</p>
                  <p class="mb-0"><span class="badge bg-success">${maisRapido.tempoFormatado}</span></p>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card">
                <div class="card-header bg-warning text-dark">
                  <i class="bi bi-hourglass-split me-2"></i>Resposta Mais Lenta
                </div>
                <div class="card-body">
                  <p class="mb-1"><strong>${maisLento.codigo}</strong></p>
                  <p class="text-muted small mb-1">${maisLento.titulo.substring(0, 50)}${maisLento.titulo.length > 50 ? '...' : ''}</p>
                  <p class="mb-0"><span class="badge bg-warning text-dark">${maisLento.tempoFormatado}</span></p>
                </div>
              </div>
            </div>
          </div>

          <div class="card mb-4">
            <div class="card-header">
              <h6 class="mb-0"><i class="bi bi-bar-chart me-2"></i>Tempo Médio por Status</h6>
            </div>
            <div class="card-body">
              ${Object.entries(porStatus).map(([status, dados]) => {
                const mediaStatus = formatarTempo(dados.totalTempo / dados.count);
                return `
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span><strong>${status}:</strong> ${dados.count} denúncia(s)</span>
                    <span class="badge bg-secondary">${mediaStatus}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h6 class="mb-0"><i class="bi bi-list-ul me-2"></i>Detalhes (últimas 10)</h6>
            </div>
            <div class="card-body">
              <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                <table class="table table-sm table-hover">
                  <thead class="table-light sticky-top">
                    <tr>
                      <th>Código</th>
                      <th>Título</th>
                      <th>Status</th>
                      <th>Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${dados.detalhes.slice(0, 10).map(item => `
                      <tr>
                        <td><strong>${item.codigo}</strong></td>
                        <td>${item.titulo.substring(0, 40)}${item.titulo.length > 40 ? '...' : ''}</td>
                        <td><span class="badge bg-${item.status === 'Concluido' || item.status === 'Concluído' ? 'success' : 'warning'}">${item.status}</span></td>
                        <td>${item.tempoFormatado}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    content.innerHTML = html;
  }

  // Expõe a função globalmente
  window.calcularTempoMedio = calcularTempoMedio;

  // Atualiza o tempo médio no card quando a página carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(calcularTempoMedio, 1000);
    });
  } else {
    setTimeout(calcularTempoMedio, 1000);
  }
})();

