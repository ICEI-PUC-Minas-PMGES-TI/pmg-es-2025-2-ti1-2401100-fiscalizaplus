// main_cliente.js - Versão completa com sincronização
class GerenciadorCliente {
  constructor() {
    this.chaveStorage = 'relatosUsuario';
    this.eventoSincronizacao = 'fiscalizaplus_atualizacao';
    this.ocorrencias = this.carregarOcorrencias();
    
    this.configurarSincronizacao();
  }

  configurarSincronizacao() {
    // Escuta eventos de atualização do admin
    window.addEventListener('storage', (e) => {
      if (e.key === this.chaveStorage) {
        console.log('🔄 Dados atualizados pelo admin, recarregando...');
        this.ocorrencias = this.carregarOcorrencias();
        this.atualizarDashboard();
      }
    });

    window.addEventListener(this.eventoSincronizacao, () => {
      console.log('🔄 Sincronização recebida do admin');
      this.ocorrencias = this.carregarOcorrencias();
      this.atualizarDashboard();
    });
  }

  carregarOcorrencias() {
    try {
      const salvas = localStorage.getItem(this.chaveStorage);
      if (salvas) {
        const dados = JSON.parse(salvas);
        console.log(`✅ ${dados.length} ocorrências carregadas (sincronizadas)`);
        
        // Converte do formato do formulário para o formato do sistema
        return dados.map((relato, index) => this.converterRelatoParaOcorrencia(relato, index));
      }
      
      // Fallback para dados estáticos
      console.log('🔄 Usando dados estáticos iniciais');
      return this.getDadosIniciais();
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return this.getDadosIniciais();
    }
  }

  // ADICIONE o método de conversão:
  converterRelatoParaOcorrencia(relato, index) {
    return {
      id: relato.id || index + 1,
      usuarioId: 2,
      titulo: relato.titulo || 'Sem título',
      descricao: relato.descricao || relato.observacoes || '',
      status: this.mapearStatus(relato.status) || 'aberto',
      tipo: this.mapearTipo(relato.categoria) || 'outros',
      lat: relato.localizacao?.lat || -19.9167,
      lng: relato.localizacao?.lng || -43.9345,
      localizacao: relato.localizacao?.endereco || 'Local não especificado',
      createdAt: relato.data_envio || new Date().toISOString()
    };
  }

  mapearStatus(statusFormulario) {
    const mapeamento = {
      'Pendente': 'aberto',
      'Resolvido': 'resolvido',
      'Em Andamento': 'em_andamento'
    };
    return mapeamento[statusFormulario] || 'aberto';
  }

  mapearTipo(categoria) {
    const mapeamento = {
      'buraco_via': 'buraco',
      'iluminacao_publica': 'iluminacao', 
      'sinalizacao': 'sinalizacao',
      'calcada': 'calcada',
      'lixo_entulho': 'lixo',
      'arborizacao': 'outros',
      'praca_parque': 'outros',
      'outros': 'outros'
    };
    return mapeamento[categoria] || 'outros';
  }

  getDadosIniciais() {
    return [
      { "id": 1, "usuarioId": 3, "cidadeId": 1, "bairroId": 1, "tipo": "buraco", "titulo": "Buraco na Rua X", "descricao": "Buraco grande na esquina.", "status": "em_andamento", "lat": -19.9362, "lng": -43.9329, "createdAt": "2025-10-18T10:00:00Z" },
      { "id": 2, "usuarioId": 2, "cidadeId": 1, "bairroId": 2, "tipo": "sinalizacao", "titulo": "Sinalização apagada", "descricao": "Faixa apagada.", "status": "aberto", "lat": -19.9302, "lng": -43.9226, "createdAt": "2025-10-18T09:00:00Z" },
      { "id": 3, "usuarioId": 3, "cidadeId": 1, "bairroId": 1, "tipo": "calcada", "titulo": "Calçada quebrada", "descricao": "Trinca extensa.", "status": "aberto", "lat": -19.9357, "lng": -43.9322, "createdAt": "2025-10-17T14:30:00Z" },
      { "id": 4, "usuarioId": 1, "cidadeId": 1, "bairroId": 1, "tipo": "lixo", "titulo": "Lixo acumulado", "descricao": "Sacos na calçada.", "status": "resolvido", "lat": -19.9371, "lng": -43.9340, "createdAt": "2025-10-16T11:20:00Z", "resolvedAt": "2025-10-17T08:00:00Z" },
      { "id": 5, "usuarioId": 2, "cidadeId": 1, "bairroId": 2, "tipo": "buraco", "titulo": "Asfalto afundando", "descricao": "Depressão no leito.", "status": "em_andamento", "lat": -19.9293, "lng": -43.9218, "createdAt": "2025-10-16T12:00:00Z" }
    ];
  }

  atualizarDashboard() {
    const total = this.ocorrencias.length;
    const resolvidas = this.ocorrencias.filter(o => o.status === 'resolvido').length;
    const andamento = this.ocorrencias.filter(o => o.status === 'em_andamento').length;
    const abertas = this.ocorrencias.filter(o => o.status === 'aberto').length;

    console.log('Estatísticas Cliente (sincronizadas):', { total, resolvidas, andamento, abertas });

    // ATUALIZAR A INTERFACE
    this.atualizarElemento('totalDenuncias', total);
    this.atualizarElemento('resolvidas', resolvidas);
    this.atualizarElemento('andamento', andamento);

    // ATUALIZAR DONUT CHART
    this.atualizarDonutChart(total, resolvidas, andamento, abertas);

    // ATUALIZAR LISTA DE OCORRÊNCIAS (se houver)
    this.atualizarListaOcorrencias();

    console.log('✅ Dashboard Cliente atualizado (sincronizado)!');
  }

  atualizarElemento(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.textContent = valor;
    }
  }

  atualizarDonutChart(total, resolvidas, andamento, abertas) {
    const donut = document.getElementById('donutCliente');
    const donutCenter = document.getElementById('donutCenter');

    if (donut && donutCenter && total > 0) {
      const degResolvidas = (resolvidas / total) * 360;
      const degAndamento = (andamento / total) * 360;
      
      donut.style.background = `conic-gradient(
        #4CAF50 0 ${degResolvidas}deg,
        #FFB300 ${degResolvidas}deg ${degResolvidas + degAndamento}deg,
        #E53935 ${degResolvidas + degAndamento}deg 360deg
      )`;
      
      const pct = Math.round((resolvidas / total) * 100);
      donutCenter.textContent = pct + '%';
    }
  }

  atualizarListaOcorrencias() {
    const listaElement = document.getElementById('listaOcorrencias');
    if (!listaElement) return;

    // Ordena por data (mais recentes primeiro)
    const ocorrenciasOrdenadas = [...this.ocorrencias].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    listaElement.innerHTML = ocorrenciasOrdenadas.map(ocorrencia => {
      const dataFormatada = new Date(ocorrencia.createdAt).toLocaleDateString('pt-BR');
      const statusClass = ocorrencia.status === 'resolvido' ? 'resolvido' : 
                         ocorrencia.status === 'em_andamento' ? 'andamento' : 'pendente';
      
      const statusText = ocorrencia.status === 'resolvido' ? 'Resolvido' :
                        ocorrencia.status === 'em_andamento' ? 'Em Andamento' : 'Pendente';

      return `
        <div class="ocorrencia-item" data-id="${ocorrencia.id}">
          <h4>${ocorrencia.titulo}</h4>
          <p>${ocorrencia.descricao}</p>
          <div class="ocorrencia-info">
            <span class="status ${statusClass}">${statusText}</span>
            <span class="tipo">${this.formatarTipo(ocorrencia.tipo)}</span>
            <span class="data">${dataFormatada}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  formatarTipo(tipo) {
    const tipos = {
      'buraco': 'Buraco na Via',
      'iluminacao': 'Iluminação',
      'sinalizacao': 'Sinalização', 
      'calcada': 'Calçada',
      'lixo': 'Lixo/Acúmulo'
    };
    return tipos[tipo] || tipo;
  }
}

// Inicializa o gerenciador do cliente
const clienteManager = new GerenciadorCliente();

// Quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  clienteManager.atualizarDashboard();
});