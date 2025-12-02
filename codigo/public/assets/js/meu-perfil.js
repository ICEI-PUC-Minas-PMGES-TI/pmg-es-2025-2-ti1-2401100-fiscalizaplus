// Script para a página Meu Perfil
(function() {
  'use strict';
  
  const API_BASE = 'http://localhost:3000';
  const CIDADAOS_ENDPOINT = `${API_BASE}/cidadaos`;
  
  // Dados das cidades por estado
  const cidadesPorEstado = {
    'MG': ['Belo Horizonte']
  };
  
  let usuarioAtual = null;
  let formOriginal = {};
  
  // Função para obter usuário corrente
  function getUsuarioCorrente() {
    try {
      const isGuest = sessionStorage.getItem('isGuest') === 'true';
      if (isGuest) return null;
      
      const keys = ['usuarioCorrente', 'fp_user', 'user'];
      for (const key of keys) {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.id && (parsed.id !== 'admin' && parsed.id !== 'administrador')) {
            return parsed;
          }
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }
  
  // Função para buscar dados da API
  async function fetchJson(url) {
    try {
      const response = await fetch(`${API_BASE}${url}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Erro ao buscar ${url}:`, error);
      return null;
    }
  }
  
  // Função para formatar data
  function formatDate(dateString) {
    if (!dateString) return 'Data não informada';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data não informada';
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return 'Data não informada';
    }
  }
  
  // Função para carregar dados do usuário
  async function loadUserProfile() {
    const user = getUsuarioCorrente();
    if (!user || !user.id) {
      // Redireciona para login se não estiver logado
      window.location.href = '../login/login.html';
      return;
    }
    
    // Busca dados completos do usuário
    let usuario = await fetchJson(`/cidadaos/${user.id}`);
    if (!usuario || !usuario.id) {
      usuario = await fetchJson(`/usuarios/${user.id}`);
    }
    if (!usuario) {
      usuario = user;
    }
    
    usuarioAtual = usuario;
    
    // Preenche o formulário
    fillProfileForm(usuario);
    
    // Salva dados originais
    formOriginal = {
      nomeCompleto: usuario.nomeCompleto || usuario.nome || '',
      email: usuario.email || '',
      estado: usuario.estado || '',
      cidade: usuario.cidade || ''
    };
  }
  
  // Função para preencher formulário
  function fillProfileForm(usuario) {
    const nomeCompleto = usuario.nomeCompleto || usuario.nome || 'Usuário';
    const email = usuario.email || '';
    const estado = usuario.estado || '';
    const cidade = usuario.cidade || '';
    const dataCadastro = usuario.dataCadastro || '';
    const fotoPerfil = usuario.fotoPerfil || usuario.avatar || '';
    
    // Atualiza avatar e nome no header
    const avatarInitial = nomeCompleto.charAt(0).toUpperCase();
    const avatarEl = document.getElementById('avatar-initial');
    const avatarImg = document.getElementById('profile-avatar-img');
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileDate = document.getElementById('profile-date');
    
    // Exibe foto se existir, senão mostra inicial
    if (fotoPerfil && avatarImg) {
      avatarImg.src = fotoPerfil;
      avatarImg.style.display = 'block';
      if (avatarEl) avatarEl.style.display = 'none';
    } else {
      if (avatarEl) {
        avatarEl.textContent = avatarInitial;
        avatarEl.style.display = 'flex';
      }
      if (avatarImg) avatarImg.style.display = 'none';
    }
    
    if (profileName) profileName.textContent = nomeCompleto;
    if (profileEmail) profileEmail.textContent = email;
    if (profileDate) profileDate.textContent = formatDate(dataCadastro);
    
    // Preenche formulário
    const nomeInput = document.getElementById('nomeCompleto');
    const emailInput = document.getElementById('email');
    const estadoSelect = document.getElementById('estado');
    const cidadeSelect = document.getElementById('cidade');
    
    if (nomeInput) nomeInput.value = nomeCompleto;
    if (emailInput) emailInput.value = email;
    
    if (estadoSelect) {
      estadoSelect.value = estado;
      atualizarCidades();
    }
    
    if (cidadeSelect && cidade) {
      cidadeSelect.value = cidade;
    }
  }
  
  // Função para atualizar cidades baseado no estado
  function atualizarCidades() {
    const estadoSelect = document.getElementById('estado');
    const cidadeSelect = document.getElementById('cidade');
    
    if (!estadoSelect || !cidadeSelect) return;
    
    const estado = estadoSelect.value;
    cidadeSelect.innerHTML = '<option value="">Selecione a cidade</option>';
    cidadeSelect.disabled = true;
    
    if (estado && cidadesPorEstado[estado]) {
      cidadeSelect.disabled = false;
      cidadesPorEstado[estado].forEach(cidade => {
        const option = document.createElement('option');
        option.value = cidade;
        option.textContent = cidade;
        cidadeSelect.appendChild(option);
      });
    }
  }
  
  // Função para toggle de senha
  function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const toggle = document.querySelector(`[data-target="${fieldId}"]`);
    
    if (!field || !toggle) return;
    
    if (field.type === 'password') {
      field.type = 'text';
      toggle.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
      field.type = 'password';
      toggle.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
  }
  
  // Função para validar formulário
  function validateForm() {
    const form = document.getElementById('profileForm');
    if (!form) return false;
    
    const nomeCompleto = document.getElementById('nomeCompleto').value.trim();
    const email = document.getElementById('email').value.trim();
    const estado = document.getElementById('estado').value;
    const cidade = document.getElementById('cidade').value;
    const senhaAtual = document.getElementById('senhaAtual').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;
    
    // Validações básicas
    if (!nomeCompleto) {
      alert('Por favor, preencha o nome completo.');
      return false;
    }
    
    if (!email || !email.includes('@')) {
      alert('Por favor, preencha um e-mail válido.');
      return false;
    }
    
    if (!estado || !cidade) {
      alert('Por favor, selecione estado e cidade.');
      return false;
    }
    
    // Validação de senha (se preenchida)
    if (novaSenha || senhaAtual || confirmarSenha) {
      if (!senhaAtual) {
        alert('Para alterar a senha, é necessário informar a senha atual.');
        return false;
      }
      
      if (novaSenha.length < 6) {
        alert('A nova senha deve ter no mínimo 6 caracteres.');
        return false;
      }
      
      if (novaSenha !== confirmarSenha) {
        alert('As senhas não coincidem.');
        return false;
      }
    }
    
    return true;
  }
  
  // Função para salvar perfil
  async function saveProfile(formData) {
    if (!usuarioAtual || !usuarioAtual.id) {
      alert('Erro: Usuário não identificado.');
      return false;
    }
    
    try {
      const updateData = {
        nomeCompleto: formData.nomeCompleto,
        email: formData.email,
        estado: formData.estado,
        cidade: formData.cidade
      };
      
      // Se houver nova senha, adiciona ao update
      if (formData.novaSenha) {
        // Em produção, isso deveria ser um hash, mas para simplificar:
        updateData.senhaHash = formData.novaSenha;
      }
      
      const response = await fetch(`${CIDADAOS_ENDPOINT}/${usuarioAtual.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const updatedUser = await response.json();
      
      // Atualiza sessionStorage
      const userSession = getUsuarioCorrente();
      if (userSession) {
        const updatedSession = {
          ...userSession,
          ...updatedUser
        };
        sessionStorage.setItem('usuarioCorrente', JSON.stringify(updatedSession));
        sessionStorage.setItem('fp_user', JSON.stringify(updatedSession));
        sessionStorage.setItem('user', JSON.stringify(updatedSession));
      }
      
      // Atualiza dados locais
      usuarioAtual = updatedUser;
      formOriginal = {
        nomeCompleto: updatedUser.nomeCompleto || '',
        email: updatedUser.email || '',
        estado: updatedUser.estado || '',
        cidade: updatedUser.cidade || ''
      };
      
      // Limpa campos de senha
      document.getElementById('senhaAtual').value = '';
      document.getElementById('novaSenha').value = '';
      document.getElementById('confirmarSenha').value = '';
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      return false;
    }
  }
  
  // Função para lidar com mudança de foto (placeholder - lógica será implementada depois)
  function handlePhotoChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validação básica
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem.');
      event.target.value = '';
      return;
    }
    
    // Limite de tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.');
      event.target.value = '';
      return;
    }
    
    // Preview da imagem (temporário - será implementado upload depois)
    const reader = new FileReader();
    reader.onload = function(e) {
      const avatarImg = document.getElementById('profile-avatar-img');
      const avatarInitial = document.getElementById('avatar-initial');
      
      if (avatarImg && avatarInitial) {
        avatarImg.src = e.target.result;
        avatarImg.style.display = 'block';
        avatarInitial.style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
    
    // TODO: Implementar upload da foto para o servidor
    console.log('Foto selecionada:', file.name);
    alert('A funcionalidade de upload de foto será implementada em breve.');
  }
  
  // Inicialização
  async function init() {
    // Carrega perfil do usuário
    await loadUserProfile();
    
    // Event listener para mudança de foto
    const photoInput = document.getElementById('profile-photo-input');
    if (photoInput) {
      photoInput.addEventListener('change', handlePhotoChange);
    }
    
    // Event listeners
    const estadoSelect = document.getElementById('estado');
    if (estadoSelect) {
      estadoSelect.addEventListener('change', atualizarCidades);
    }
    
    // Toggle de senha
    document.querySelectorAll('.password-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        if (targetId) togglePassword(targetId);
      });
    });
    
    // Botão cancelar
    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar) {
      btnCancelar.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja cancelar? As alterações não salvas serão perdidas.')) {
          fillProfileForm(usuarioAtual);
          // Limpa campos de senha
          document.getElementById('senhaAtual').value = '';
          document.getElementById('novaSenha').value = '';
          document.getElementById('confirmarSenha').value = '';
        }
      });
    }
    
    // Submit do formulário
    const form = document.getElementById('profileForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
          return;
        }
        
        const formData = {
          nomeCompleto: document.getElementById('nomeCompleto').value.trim(),
          email: document.getElementById('email').value.trim(),
          estado: document.getElementById('estado').value,
          cidade: document.getElementById('cidade').value,
          senhaAtual: document.getElementById('senhaAtual').value,
          novaSenha: document.getElementById('novaSenha').value,
          confirmarSenha: document.getElementById('confirmarSenha').value
        };
        
        // Verifica se houve alterações
        const hasChanges = 
          formData.nomeCompleto !== formOriginal.nomeCompleto ||
          formData.email !== formOriginal.email ||
          formData.estado !== formOriginal.estado ||
          formData.cidade !== formOriginal.cidade ||
          formData.novaSenha;
        
        if (!hasChanges) {
          alert('Nenhuma alteração foi feita.');
          return;
        }
        
        // Mostra modal de confirmação
        const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
        confirmModal.show();
        
        // Confirmação
        document.getElementById('confirm-save').addEventListener('click', async () => {
          confirmModal.hide();
          
          const btnSalvar = document.getElementById('btn-salvar');
          if (btnSalvar) {
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Salvando...';
          }
          
          const success = await saveProfile(formData);
          
          if (btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i>Salvar Alterações';
          }
          
          if (success) {
            alert('Perfil atualizado com sucesso!');
            // Recarrega dados
            await loadUserProfile();
            // Atualiza nome no navbar
            if (typeof updateUserElements === 'function') {
              updateUserElements(usuarioAtual);
            }
          } else {
            alert('Erro ao salvar perfil. Tente novamente.');
          }
        }, { once: true });
      });
    }
  }
  
  // Aguarda DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

