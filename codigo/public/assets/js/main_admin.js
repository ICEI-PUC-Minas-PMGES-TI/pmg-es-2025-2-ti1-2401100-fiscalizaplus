// main_admin.js - Versão completa com sincronização
class GerenciadorAdmin {
  constructor() {
    this.chaveStorage = 'relatosUsuario';
    this.eventoSincronizacao = 'fiscalizaplus_atualizacao';
    this.ocorrencias = this.carregarOcorrencias();
    this.usuarios = this.getUsuariosEstaticos();
    
    this.configurarSincronizacao();
  }

  configurarSincronizacao() {
    // Escuta eventos de atualização de outras abas
    window.addEventListener('storage', (e) => {
      if (e.key === this.chaveStorage) {
        console.log('🔄 Dados atualizados de outra aba, sincronizando...');
        this.ocorrencias = this.carregarOcorrencias();
        this.atualizarDashboard();
      }
    });

    // Dispara evento personalizado quando dados mudam
    window.addEventListener(this.eventoSincronizacao, () => {
      console.log('🔄 Evento de sincronização recebido');
      this.ocorrencias = this.carregarOcorrencias();
      this.atualizarDashboard();
    });
  }

  dispararSincronizacao() {
    // Dispara evento para outras abas do mesmo navegador
    window.dispatchEvent(new Event(this.eventoSincronizacao));
    
    // Força atualização do localStorage para sincronizar entre abas
    const event = new StorageEvent('storage', {
      key: this.chaveStorage,
      newValue: JSON.stringify(this.ocorrencias)
    });
    window.dispatchEvent(event);
  }

  carregarOcorrencias() {
    try {
      console.log('Carregando FiscalizaPlus Admin...');
      
      const salvas = localStorage.getItem(this.chaveStorage);
      if (salvas) {
        const dados = JSON.parse(salvas);
        console.log(`✅ ${dados.length} ocorrências carregadas do localStorage`);
        
        // Converte do formato do formulário para o formato do sistema
        return dados.map((relato, index) => this.converterRelatoParaOcorrencia(relato, index));
      }
      
      // Se não há dados salvos, usa os dados estáticos iniciais
      console.log('🔄 Usando dados estáticos iniciais');
      return this.getOcorrenciasIniciais();
      
    } catch (error) {
      console.error('Erro ao carregar ocorrências:', error);
      return this.getOcorrenciasIniciais();
    }
  }

  // ADICIONE ESTE MÉTODO PARA CONVERTER O FORMATO:
  converterRelatoParaOcorrencia(relato, index) {
    return {
      id: relato.id || index + 1,
      usuarioId: 2, // Default para usuário comum
      titulo: relato.titulo || 'Sem título',
      descricao: relato.descricao || relato.observacoes || '',
      status: this.mapearStatus(relato.status) || 'aberto',
      tipo: this.mapearTipo(relato.categoria) || 'outros',
      lat: relato.localizacao?.lat || -19.9167,
      lng: relato.localizacao?.lng || -43.9345,
      localizacao: relato.localizacao?.endereco || 'Local não especificado',
      createdAt: relato.data_envio || new Date().toISOString(),
      prioridade: relato.prioridade || 'media',
      usuarioNome: relato.nomeCidadao || 'Usuário'
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

 // main_admin.js - SUBSTITUA o método salvarOcorrencias por este:

salvarOcorrencias() {
  try {
    // Primeiro carrega os dados originais do formulário
    const dadosOriginais = JSON.parse(localStorage.getItem(this.chaveStorage)) || [];
    
    // Atualiza cada ocorrência no formato original
    this.ocorrencias.forEach(ocorrenciaSistema => {
      const index = dadosOriginais.findIndex(relato => {
        // Encontra pelo ID ou pela posição
        return relato.id === ocorrenciaSistema.id || 
               (!relato.id && dadosOriginais.indexOf(relato) === ocorrenciaSistema.id - 1);
      });
      
      if (index !== -1) {
        // Atualiza o status no formato original
        dadosOriginais[index].status = this.mapearStatusParaFormulario(ocorrenciaSistema.status);
      }
    });
    
    // Salva de volta no localStorage
    localStorage.setItem(this.chaveStorage, JSON.stringify(dadosOriginais));
    console.log('💾 Dados salvos no localStorage (formato original)');
    return true;
  } catch (error) {
    console.error('Erro ao salvar ocorrências:', error);
    return false;
  }
}

// ADICIONE este método para mapear de volta para o formato do formulário:
mapearStatusParaFormulario(statusSistema) {
  const mapeamento = {
    'aberto': 'Pendente',
    'em_andamento': 'Em Andamento', 
    'resolvido': 'Resolvido'
  };
  return mapeamento[statusSistema] || 'Pendente';
}

  getOcorrenciasIniciais() {
    return [
      { "id": 1, "usuarioId": 3, "cidadeId": 1, "bairroId": 1, "tipo": "buraco", "titulo": "Buraco na Rua X", "descricao": "Buraco grande na esquina.", "status": "em_andamento", "lat": -19.9362, "lng": -43.9329, "createdAt": "2025-10-18T10:00:00Z" },
      { "id": 2, "usuarioId": 2, "cidadeId": 1, "bairroId": 2, "tipo": "sinalizacao", "titulo": "Sinalização apagada", "descricao": "Faixa apagada.", "status": "aberto", "lat": -19.9302, "lng": -43.9226, "createdAt": "2025-10-18T09:00:00Z" },
      { "id": 3, "usuarioId": 3, "cidadeId": 1, "bairroId": 1, "tipo": "calcada", "titulo": "Calçada quebrada", "descricao": "Trinca extensa.", "status": "aberto", "lat": -19.9357, "lng": -43.9322, "createdAt": "2025-10-17T14:30:00Z" },
      { "id": 4, "usuarioId": 1, "cidadeId": 1, "bairroId": 1, "tipo": "lixo", "titulo": "Lixo acumulado", "descricao": "Sacos na calçada.", "status": "resolvido", "lat": -19.9371, "lng": -43.9340, "createdAt": "2025-10-16T11:20:00Z", "resolvedAt": "2025-10-17T08:00:00Z" },
      { "id": 5, "usuarioId": 2, "cidadeId": 1, "bairroId": 2, "tipo": "buraco", "titulo": "Asfalto afundando", "descricao": "Depressão no leito.", "status": "em_andamento", "lat": -19.9293, "lng": -43.9218, "createdAt": "2025-10-16T12:00:00Z" },
      { "id": 6, "usuarioId": 4, "cidadeId": 1, "bairroId": 3, "tipo": "iluminacao", "titulo": "Poste apagado", "descricao": "Rua escura.", "status": "aberto", "lat": -19.9292, "lng": -43.9398, "createdAt": "2025-10-15T19:00:00Z" },
      { "id": 7, "usuarioId": 3, "cidadeId": 1, "bairroId": 1, "tipo": "buraco", "titulo": "Tampa de bueiro solta", "descricao": "Risco a pedestres.", "status": "aberto", "lat": -19.9369, "lng": -43.9326, "createdAt": "2025-10-15T08:45:00Z" },
      { "id": 8, "usuarioId": 2, "cidadeId": 1, "bairroId": 2, "tipo": "calcada", "titulo": "Desnível em calçada", "descricao": "Altura perigosa.", "status": "aberto", "lat": -19.9306, "lng": -43.9234, "createdAt": "2025-10-14T10:15:00Z" },
      { "id": 9, "usuarioId": 4, "cidadeId": 1, "bairroId": 3, "tipo": "sinalizacao", "titulo": "Placa caída", "descricao": "Placa no chão.", "status": "em_andamento", "lat": -19.9287, "lng": -43.9411, "createdAt": "2025-10-14T17:40:00Z" },
      { "id": 10, "usuarioId": 1, "cidadeId": 1, "bairroId": 4, "tipo": "buraco", "titulo": "Buraco próximo à praça", "descricao": "Buraco médio.", "status": "aberto", "lat": -19.9548, "lng": -43.9503, "createdAt": "2025-10-13T09:00:00Z" }
    ];
  }

  getUsuariosEstaticos() {
    return [
      { "id": 1, "nome": "Administrador do Sistema", "email": "admin@abc.com", "tipo": "admin" },
      { "id": 2, "nome": "Usuario Comum", "email": "user@abc.com", "tipo": "cliente" },
      { "id": 3, "nome": "Joãozinho", "email": "joaozinho@gmail.com", "tipo": "cliente" },
      { "id": 4, "nome": "Rommel", "email": "rommel@gmail.com", "tipo": "cliente" },
      { "id": 5, "nome": "Maria Silva", "email": "maria.silva@email.com", "tipo": "cliente" }
    ];
  }

  // ESTATÍSTICAS
  calcularEstatisticas() {
    const total = this.ocorrencias.length;
    const resolvidas = this.ocorrencias.filter(o => o.status === 'resolvido').length;
    const andamento = this.ocorrencias.filter(o => o.status === 'em_andamento').length;
    const pendentes = this.ocorrencias.filter(o => o.status === 'aberto').length;
    
    // Ocorrências de hoje
    const hoje = new Date().toISOString().split('T')[0];
    const hojeCount = this.ocorrencias.filter(o => o.createdAt.split('T')[0] === hoje).length;

    return { total, resolvidas, andamento, pendentes, hoje: hojeCount };
  }

  atualizarDashboard() {
    const stats = this.calcularEstatisticas();

    console.log('Estatísticas Admin:', stats);

    // ATUALIZAR A INTERFACE
    this.atualizarElemento('totalAdmin', stats.total);
    this.atualizarElemento('resolvidasAdmin', stats.resolvidas);
    this.atualizarElemento('andamentoAdmin', stats.andamento);
    this.atualizarElemento('pendentesAdmin', stats.pendentes);
    this.atualizarElemento('hojeAdmin', stats.hoje);

    // ATUALIZAR DONUT CHART
    this.atualizarDonutChart(stats.total, stats.resolvidas, stats.andamento, stats.pendentes);

    // ATUALIZAR TABELA
    this.atualizarTabela();

    console.log('✅ Dashboard Admin atualizado com sucesso!');
  }

  atualizarElemento(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.textContent = valor.toLocaleString();
      console.log(`Elemento ${id} atualizado para: ${valor}`);
    } else {
      console.warn(`Elemento #${id} não encontrado`);
    }
  }

  atualizarDonutChart(total, resolvidas, andamento, pendentes) {
    const donut = document.getElementById('donutAdmin');
    const donutCenter = document.getElementById('donutAdminCenter');

    if (!donut || !donutCenter) {
      console.warn('Elementos do donut chart não encontrados');
      return;
    }

    if (total > 0) {
      const degResolvidas = (resolvidas / total) * 360;
      const degAndamento = (andamento / total) * 360;
      
      donut.style.background = `conic-gradient(
        #4CAF50 0 ${degResolvidas}deg,
        #FFB300 ${degResolvidas}deg ${degResolvidas + degAndamento}deg,
        #E53935 ${degResolvidas + degAndamento}deg 360deg
      )`;
      
      const pct = Math.round((resolvidas / total) * 100);
      donutCenter.textContent = pct + '%';
      console.log(`Donut Admin atualizado: ${pct}% resolvidas`);
    } else {
      donut.style.background = '#f0f0f0';
      donutCenter.textContent = '0%';
    }
  }

  atualizarTabela() {
    const tbody = document.getElementById('tabela-corpo');
    if (!tbody) {
      console.warn('Tabela não encontrada');
      return;
    }

    // Ordena por data (mais recentes primeiro)
    const ocorrenciasOrdenadas = [...this.ocorrencias].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    ).slice(0, 10); // Mostra apenas as 10 mais recentes

    tbody.innerHTML = ocorrenciasOrdenadas.map(ocorrencia => {
      const dataFormatada = new Date(ocorrencia.createdAt).toLocaleDateString('pt-BR');
      const usuario = this.usuarios.find(u => u.id === ocorrencia.usuarioId);
      const nomeUsuario = usuario ? usuario.nome : 'Usuário Desconhecido';
      
      const statusClass = ocorrencia.status === 'resolvido' ? 'resolvido' : 
                         ocorrencia.status === 'em_andamento' ? 'andamento' : 'pendente';
      
      const statusText = ocorrencia.status === 'resolvido' ? 'Resolvido' :
                        ocorrencia.status === 'em_andamento' ? 'Em Andamento' : 'Pendente';

      return `
        <tr>
          <td>OCOR-${String(ocorrencia.id).padStart(6, '0')}</td>
          <td>${ocorrencia.titulo}</td>
          <td>${nomeUsuario}</td>
          <td><span class="status ${statusClass}">${statusText}</span></td>
          <td>${this.formatarTipo(ocorrencia.tipo)}</td>
          <td>${dataFormatada}</td>
          <td class="acoes">
            <button class="btn-editar" onclick="adminManager.editarStatus(${ocorrencia.id})">Alterar Status</button>
            <button class="btn-excluir" onclick="adminManager.excluirOcorrencia(${ocorrencia.id})">Excluir</button>
          </td>
        </tr>
      `;
    }).join('');

    console.log(`✅ Tabela atualizada com ${ocorrenciasOrdenadas.length} ocorrências`);
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

  // GERENCIAMENTO DE OCORRÊNCIAS
  editarStatus(id) {
    const ocorrencia = this.ocorrencias.find(o => o.id === id);
    if (!ocorrencia) return;

    // Cria um modal simples para seleção
    const modalHTML = `
      <div id="modalStatus" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); display: flex; justify-content: center; 
        align-items: center; z-index: 1000;">
        <div style="background: white; padding: 20px; border-radius: 8px; width: 300px;">
          <h3>Alterar Status da Ocorrência</h3>
          <p><strong>${ocorrencia.titulo}</strong></p>
          <p>Status atual: <span class="status ${ocorrencia.status}">${this.formatarStatusTexto(ocorrencia.status)}</span></p>
          
          <label for="novoStatusSelect">Novo status:</label>
          <select id="novoStatusSelect" style="width: 100%; padding: 8px; margin: 10px 0;">
            <option value="aberto">Pendente</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="resolvido">Resolvido</option>
          </select>
          
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button onclick="adminManager.confirmarAlteracaoStatus(${ocorrencia.id})" 
                    style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px;">
              Confirmar
            </button>
            <button onclick="adminManager.fecharModal()" 
                    style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px;">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    `;

    // Remove modal existente se houver
    const modalExistente = document.getElementById('modalStatus');
    if (modalExistente) {
      modalExistente.remove();
    }

    // Adiciona o modal ao body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Seleciona o status atual no dropdown
    const select = document.getElementById('novoStatusSelect');
    select.value = ocorrencia.status;
  }

  confirmarAlteracaoStatus(id) {
    const select = document.getElementById('novoStatusSelect');
    const novoStatus = select.value;
    
    const ocorrencia = this.ocorrencias.find(o => o.id === id);
    if (!ocorrencia) {
      this.fecharModal();
      return;
    }

    if (novoStatus && ['aberto', 'em_andamento', 'resolvido'].includes(novoStatus)) {
      ocorrencia.status = novoStatus;
      if (novoStatus === 'resolvido') {
        ocorrencia.resolvedAt = new Date().toISOString();
      }
      this.salvarOcorrencias();
      this.atualizarDashboard();
      this.dispararSincronizacao();
      
      // Mostra feedback visual
      this.mostrarFeedback(`Status alterado para: ${this.formatarStatusTexto(novoStatus)}`, 'success');
    }

    this.fecharModal();
  }

  fecharModal() {
    const modal = document.getElementById('modalStatus');
    if (modal) {
      modal.remove();
    }
  }

  formatarStatusTexto(status) {
    const statusMap = {
      'aberto': 'Pendente',
      'em_andamento': 'Em Andamento', 
      'resolvido': 'Resolvido'
    };
    return statusMap[status] || status;
  }

  mostrarFeedback(mensagem, tipo = 'info') {
    // Remove feedback anterior se existir
    const feedbackAnterior = document.getElementById('feedbackAdmin');
    if (feedbackAnterior) {
      feedbackAnterior.remove();
    }

    const cores = {
      'success': '#4CAF50',
      'error': '#f44336', 
      'info': '#2196F3'
    };

    const feedbackHTML = `
      <div id="feedbackAdmin" style="
        position: fixed; top: 20px; right: 20px; padding: 15px 20px; 
        background: ${cores[tipo] || '#2196F3'}; color: white; 
        border-radius: 4px; z-index: 1001; font-weight: bold;">
        ${mensagem}
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', feedbackHTML);

    // Remove automaticamente após 3 segundos
    setTimeout(() => {
      const feedback = document.getElementById('feedbackAdmin');
      if (feedback) {
        feedback.remove();
      }
    }, 3000);
  }

  excluirOcorrencia(id) {
    const ocorrencia = this.ocorrencias.find(o => o.id === id);
    if (!ocorrencia) return;

    const confirmacao = confirm(`Tem certeza que deseja excluir a ocorrência:\n"${ocorrencia.titulo}"?`);
    
    if (confirmacao) {
      this.ocorrencias = this.ocorrencias.filter(o => o.id !== id);
      this.salvarOcorrencias();
      this.atualizarDashboard();
      this.dispararSincronizacao();
      alert('Ocorrência excluída com sucesso!');
    }
  }

  // FILTROS E RELATÓRIOS
  filtrarPorStatus(status) {
    return this.ocorrencias.filter(o => o.status === status);
  }

  filtrarPorTipo(tipo) {
    return this.ocorrencias.filter(o => o.tipo === tipo);
  }

  gerarRelatorio() {
    const stats = this.calcularEstatisticas();
    const relatorio = `
RELATÓRIO FISCALIZAPLUS - ${new Date().toLocaleDateString('pt-BR')}

Total de Ocorrências: ${stats.total}
- Resolvidas: ${stats.resolvidas}
- Em Andamento: ${stats.andamento}
- Pendentes: ${stats.pendentes}
- Registradas Hoje: ${stats.hoje}

Distribuição por Tipo:
${this.gerarDistribuicaoTipos()}
    `;

    console.log('📊 Relatório Gerado:', relatorio);
    alert('Relatório gerado no console!');
    return relatorio;
  }

  gerarDistribuicaoTipos() {
    const tipos = {};
    this.ocorrencias.forEach(o => {
      tipos[o.tipo] = (tipos[o.tipo] || 0) + 1;
    });

    return Object.entries(tipos)
      .map(([tipo, count]) => `- ${this.formatarTipo(tipo)}: ${count}`)
      .join('\n');
  }
}

// Inicializa o gerenciador globalmente
const adminManager = new GerenciadorAdmin();

// Quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  adminManager.atualizarDashboard();
  
  // Configura botões de ação
  const btnRelatorio = document.getElementById('btnRelatorio');
  if (btnRelatorio) {
    btnRelatorio.addEventListener('click', () => {
      adminManager.gerarRelatorio();
    });
  }

  // Configura filtros
  const filtroStatus = document.getElementById('filtroStatus');
  if (filtroStatus) {
    filtroStatus.addEventListener('change', (e) => {
      const status = e.target.value;
      if (status) {
        const filtradas = adminManager.filtrarPorStatus(status);
        console.log(`Filtradas ${filtradas.length} ocorrências com status: ${status}`);
      }
    });
  }
});