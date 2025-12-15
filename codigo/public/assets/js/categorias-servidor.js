/**
 * Script para gerenciar categorias de denúncias
 */

(function() {
  const API_BASE = window.location.origin;
  const DENUNCIAS_ENDPOINT = `${API_BASE}/denuncias`;

  /**
   * Obtém o usuário servidor corrente do sessionStorage
   */
  function getUsuarioCorrente() {
    try {
      const keys = ['usuarioCorrente', 'fp_user', 'user'];
      for (const key of keys) {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.id && parsed.tipo === 'servidor') {
            return parsed;
          }
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Mapeamento de categorias com descrições e ícones
   */
  const categoriasInfo = {
    'infraestrutura': {
      nome: 'Infraestrutura',
      descricao: 'Problemas relacionados a ruas, calçadas, pontes e outras estruturas urbanas',
      icone: '🏗️'
    },
    'iluminacao': {
      nome: 'Iluminação',
      descricao: 'Problemas com iluminação pública, postes e lâmpadas',
      icone: '💡'
    },
    'limpeza': {
      nome: 'Limpeza',
      descricao: 'Problemas relacionados a coleta de lixo, limpeza urbana e descarte irregular',
      icone: '🧹'
    },
    'transito': {
      nome: 'Trânsito',
      descricao: 'Problemas de sinalização, semáforos e organização do trânsito',
      icone: '🚦'
    },
    'seguranca': {
      nome: 'Segurança',
      descricao: 'Problemas relacionados à segurança pública e iluminação em áreas de risco',
      icone: '🔒'
    }
  };

  /**
   * Conta denúncias por categoria
   */
  async function countDenunciasByCategoria() {
    try {
      const response = await fetch(DENUNCIAS_ENDPOINT);
      if (!response.ok) throw new Error('Erro ao buscar denúncias');

      const denuncias = await response.json();
      const counts = {};
      const pendentes = {};

      denuncias.forEach(denuncia => {
        const categoria = denuncia.tipoProblema;
        if (categoria) {
          counts[categoria] = (counts[categoria] || 0) + 1;
          if (denuncia.statusAtual === 'Pendente' || !denuncia.statusAtual) {
            pendentes[categoria] = (pendentes[categoria] || 0) + 1;
          }
        }
      });

      return { counts, pendentes };
    } catch (error) {
      console.error('[Categorias] Erro ao contar denúncias:', error);
      return { counts: {}, pendentes: {} };
    }
  }

  /**
   * Renderiza as categorias na página
   */
  async function renderCategorias() {
    const container = document.getElementById('categories-list');
    if (!container) return;

    const { counts, pendentes } = await countDenunciasByCategoria();
    const categorias = Object.keys(categoriasInfo);

    if (categorias.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info text-center">
          <i class="bi bi-info-circle me-2"></i>
          Nenhuma categoria encontrada.
        </div>
      `;
      return;
    }

    container.innerHTML = categorias.map(categoriaKey => {
      const info = categoriasInfo[categoriaKey];
      const total = counts[categoriaKey] || 0;
      const pendentesCount = pendentes[categoriaKey] || 0;

      return `
        <div class="category-card" data-categoria="${categoriaKey}">
          <div class="category-header">
            <div style="flex: 1;">
              <div class="category-name">${info.icone} ${info.nome}</div>
              <div class="category-description">
                ${info.descricao}
              </div>
              <div class="category-stats">
                <div class="stat-item">
                  <span class="stat-value">${total}</span>
                  <span class="stat-label">Denúncias</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">${pendentesCount}</span>
                  <span class="stat-label">Pendentes</span>
                </div>
              </div>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-category btn-edit" onclick="editCategory('${categoriaKey}')">
                <i class="bi bi-pencil me-1"></i>Editar
              </button>
              <button class="btn btn-category btn-delete" onclick="deleteCategory('${categoriaKey}')" ${total > 0 ? 'disabled title="Não é possível excluir categoria com denúncias"' : ''}>
                <i class="bi bi-trash me-1"></i>Excluir
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Edita uma categoria (abre modal)
   */
  window.editCategory = function(categoriaKey) {
    const info = categoriasInfo[categoriaKey];
    if (!info) return;

    // Preenche o modal com os dados da categoria
    const modal = document.getElementById('modalNovaCategoria');
    const modalTitle = modal.querySelector('.modal-title');
    const nomeInput = modal.querySelector('input[type="text"]');
    const descInput = modal.querySelector('textarea');
    
    modalTitle.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Categoria';
    if (nomeInput) nomeInput.value = info.nome;
    if (descInput) descInput.value = info.descricao;

    // Marca como edição
    modal.dataset.editMode = 'true';
    modal.dataset.editKey = categoriaKey;

    // Abre o modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  };

  /**
   * Exclui uma categoria (apenas visual, não remove do sistema)
   */
  window.deleteCategory = function(categoriaKey) {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${categoriasInfo[categoriaKey]?.nome}"?`)) {
      return;
    }
    alert('Funcionalidade de exclusão de categorias será implementada em breve.');
  };

  /**
   * Inicializa o modal de nova categoria
   */
  function initModal() {
    const modal = document.getElementById('modalNovaCategoria');
    if (!modal) return;

    // Reset do modal ao fechar
    modal.addEventListener('hidden.bs.modal', function() {
      const nomeInput = modal.querySelector('input[type="text"]');
      const descInput = modal.querySelector('textarea');
      const iconeSelect = modal.querySelector('select');
      
      if (nomeInput) nomeInput.value = '';
      if (descInput) descInput.value = '';
      if (iconeSelect) iconeSelect.selectedIndex = 0;
      
      delete modal.dataset.editMode;
      delete modal.dataset.editKey;
    });

    // Handler do botão salvar
    const saveBtn = modal.querySelector('.btn-danger');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        const nomeInput = modal.querySelector('input[type="text"]');
        const descInput = modal.querySelector('textarea');
        
        if (!nomeInput || !nomeInput.value.trim()) {
          alert('Por favor, preencha o nome da categoria.');
          return;
        }

        const isEdit = modal.dataset.editMode === 'true';
        
        if (isEdit) {
          alert('Funcionalidade de edição de categorias será implementada em breve.');
        } else {
          alert('Funcionalidade de criação de categorias será implementada em breve.');
        }

        // Fecha o modal
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
      });
    }
  }

  /**
   * Inicializa quando o DOM estiver pronto
   */
  function init() {
    const user = getUsuarioCorrente();
    if (!user) {
      window.location.href = '../login/login.html';
      return;
    }

    renderCategorias();
    initModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

