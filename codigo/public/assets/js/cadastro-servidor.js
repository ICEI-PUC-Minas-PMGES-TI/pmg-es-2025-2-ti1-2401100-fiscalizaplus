// Dados das cidades por estado (Usado para a página de cadastro)
const cidadesPorEstado = {
    'MG': ['Belo Horizonte']
};

let form, estadoSelect, cidadeSelect;

// Constantes de Controle
const URL_CADASTRO = '../../modulos/cadastro/cadastro-servidor.html';
const URL_TOKEN = '../../modulos/cadastro/token-servidor.html';
const URL_LOGIN = '../login/login.html';
const API_BASE = 'http://localhost:3000';

// Mapeamento de órgãos do formulário para nomes no banco
const orgaoNomeMapping = {
    'camara': 'Câmara Municipal',
    'secretaria-saude': 'Secretaria de Saúde',
    'secretaria-educacao': 'Secretaria de Educação',
    'secretaria-obras': 'Secretaria de Obras',
    'secretaria-transito': 'Secretaria de Trânsito',
    'defesa-civil': 'Defesa Civil'
};


// FUNÇÕES DE INICIALIZAÇÃO E TOKENS

/**
 * Valida um token buscando do json-server
 * Se o token for válido e não usado, marca como usado e salva o tokenId na sessão
 */
async function validarToken(token) {
    try {
        // Formata o token (remove espaços, converte para maiúsculo, formata com hífens)
        const tokenLimpo = token.trim().toUpperCase().replace(/-/g, '');
        const tokenFormatado = (tokenLimpo.match(/.{1,4}/g) || []).join('-');
        
        // Busca o token no json-server
        const response = await fetch(`${API_BASE}/tokensAcessoServidor?token=${encodeURIComponent(tokenFormatado)}`);
        const tokens = await response.json();
        
        if (!Array.isArray(tokens) || tokens.length === 0) {
            return false; // Token não encontrado
        }
        
        const tokenEncontrado = tokens[0];
        
        // Verifica se o token já foi usado
        if (tokenEncontrado.usado === true) {
            return false; // Token já foi usado
        }
        
        // Marca o token como usado
        const tokenAtualizado = {
            ...tokenEncontrado,
            usado: true,
            dataUso: new Date().toISOString()
        };
        
        // Atualiza o token no json-server
        const updateResponse = await fetch(`${API_BASE}/tokensAcessoServidor/${tokenEncontrado.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tokenAtualizado)
        });
        
        if (!updateResponse.ok) {
            console.error('Erro ao atualizar token:', updateResponse.status);
            return false;
        }
        
        // Salva o tokenId e indicação de validação na sessão
        sessionStorage.setItem('token_servidor_validado', 'true');
        sessionStorage.setItem('token_id', tokenEncontrado.id);
        
        return true;
    } catch (error) {
        console.error('Erro ao validar token:', error);
        return false;
    }
}

/**
 * Verifica se o usuário tem o token validado para acessar a página de cadastro.
 */
function verificarAcessoCadastro() {
    // Só executa se estivermos na página de cadastro (form existe)
    if (document.getElementById('cadastroForm')) { 
        const tokenValidado = sessionStorage.getItem('token_servidor_validado');
        
        if (!tokenValidado) {
            alert('Acesso negado. Por favor, valide seu token de acesso primeiro.');
            window.location.href = URL_TOKEN; 
            return;
        }
    }
}


// FUNÇÕES DE CADASTRO

function atualizarCidades() {
    const estado = estadoSelect.value;
    cidadeSelect.innerHTML = '<option value="">Cidade</option>';
    cidadeSelect.disabled = true;

    if (estado && cidadesPorEstado[estado]) {
        cidadeSelect.disabled = false;
        cidadesPorEstado[estado].forEach(cidade => {
            const option = document.createElement('option');
            option.value = cidade;
            option.textContent = cidade;
            cidadeSelect.appendChild(option);
        });
        showSuccess(estadoSelect);
    } else if (estado) {
         showError(estadoSelect, 'Selecione um estado válido.');
    }
}

/* Alterna a visibilidade da senha e troca o ícone (Material Icon) */
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const iconSpan = field.closest('.password-input').querySelector('.eye-icon');
    
    if (field.type === 'password') {
        field.type = 'text';
        iconSpan.textContent = 'visibility_off'; // Ícone de olho cortado
    } else {
        field.type = 'password';
        iconSpan.textContent = 'visibility'; // Ícone de olho aberto
    }
}


async function handleSubmit(event) {
    event.preventDefault();
    
    const tokenValidado = sessionStorage.getItem('token_servidor_validado');
    
    // Verificação de segurança adicional antes de salvar
    if (!tokenValidado) {
      alert('Sessão expirada. Por favor, revalide seu token.');
      window.location.href = URL_TOKEN; 
      return;
    }

    if (!validateForm()) {
        alert('Por favor, corrija os erros no formulário.');
        return;
    }
    
    // Coletar dados do formulário
    const formData = new FormData(form);
    const orgaoValue = formData.get('orgao');
    
    // Buscar o ID do órgão através da API
    let orgaoId = null;
    try {
        const orgaosResponse = await fetch(`${API_BASE}/orgaosMunicipais`);
        const orgaos = await orgaosResponse.json();
        
        const nomeOrgao = orgaoNomeMapping[orgaoValue];
        if (nomeOrgao && Array.isArray(orgaos)) {
            const orgaoEncontrado = orgaos.find(o => o.nome === nomeOrgao);
            if (orgaoEncontrado) {
                orgaoId = orgaoEncontrado.id;
            }
        }
    } catch (error) {
        console.warn('Erro ao buscar órgãos da API:', error);
        // Fallback: mapeamento direto para IDs conhecidos
        const fallbackMapping = {
            'secretaria-obras': '1',
            'secretaria-transito': '2',
            'defesa-civil': '3'
        };
        orgaoId = fallbackMapping[orgaoValue] || null;
    }
    
    const servidorData = {
        nomeCompleto: formData.get('nomeCompleto'),
        email: formData.get('email'),
        estado: formData.get('estado'),
        cidade: formData.get('cidade'),
        orgaoId: orgaoId ? parseInt(orgaoId) : null,
        senhaHash: formData.get('senha'), // Por enquanto mantém a senha como está, pode ser convertida para hash depois
        dataCadastro: new Date().toISOString()
    };
    
    // Salvar no json-server
    try {
        // Verifica se o e-mail já existe
        const response = await fetch(`${API_BASE}/servidores?email=${encodeURIComponent(servidorData.email)}`);
        const existing = await response.json();
        
        if (Array.isArray(existing) && existing.length > 0) {
            alert('Este e-mail já está cadastrado.');
            return;
        }
        
        // Salva o novo cadastro
        const saveResponse = await fetch(`${API_BASE}/servidores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(servidorData)
        });
        
        if (!saveResponse.ok) {
            throw new Error(`Erro HTTP: ${saveResponse.status}`);
        }
        
        // Obtém o servidor criado para pegar o ID
        const servidorCriado = await saveResponse.json();
        const servidorId = servidorCriado.id;
        
        // Atualiza o token com o servidorId
        const tokenId = sessionStorage.getItem('token_id');
        if (tokenId) {
            try {
                // Busca o token atual
                const tokenResponse = await fetch(`${API_BASE}/tokensAcessoServidor/${tokenId}`);
                const tokenAtual = await tokenResponse.json();
                
                // Atualiza o token com o servidorId
                const tokenAtualizado = {
                    ...tokenAtual,
                    servidorId: parseInt(servidorId)
                };
                
                await fetch(`${API_BASE}/tokensAcessoServidor/${tokenId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(tokenAtualizado)
                });
            } catch (error) {
                console.warn('Erro ao atualizar token com servidorId:', error);
                // Não bloqueia o cadastro se houver erro ao atualizar o token
            }
        }
        
        // Remove os dados do token da sessão antes de redirecionar
        sessionStorage.removeItem('token_servidor_validado');
        sessionStorage.removeItem('token_id');
        
        // Mostra mensagem de sucesso e redireciona após 1 segundo
        alert('Cadastro realizado com sucesso! Você será redirecionado para a página de login.');
        setTimeout(() => {
            window.location.href = URL_LOGIN;
        }, 1000);
        
    } catch (error) {
        console.error('Erro ao salvar cadastro:', error);
        alert('Erro ao salvar cadastro. Verifique se o servidor está rodando e tente novamente.');
    }
}

// FUNÇÕES AUXILIARES DE VALIDAÇÃO GERAL

function validateField(event) {
    const field = event.target;
    const value = field.value.trim();
    const fieldName = field.name;
    
    clearError(event);
    
    let isValid = true;
    let errorMessage = '';
    
    switch (fieldName) {
        case 'nomeCompleto':
            if (!value) {
                isValid = false;
                errorMessage = 'Nome completo é obrigatório';
            } 
            break;
            
        case 'email':
            if (!value) {
                isValid = false;
                errorMessage = 'E-mail é obrigatório';
            } else if (!isValidEmail(value)) {
                isValid = false;
                errorMessage = 'E-mail inválido';
            }
            break;
            
        case 'estado':
        case 'cidade':
        case 'orgao':
            if (!value) {
                isValid = false;
                errorMessage = 'Este campo é obrigatório';
            }
            break;
            
        case 'senha':
            if (!value) {
                isValid = false;
                errorMessage = 'Senha é obrigatória';
            } else if (value.length < 6) {
                isValid = false;
                errorMessage = 'Senha deve ter pelo menos 6 caracteres';
            }
            break;
            
        case 'confirmarSenha':
            const senhaField = document.querySelector('input[name="senha"]');
            if (!senhaField) return true;
            const senha = senhaField.value;
            
            if (!value) {
                isValid = false;
                errorMessage = 'Confirmação de senha é obrigatória';
            } else if (value !== senha) {
                isValid = false;
                errorMessage = 'Senhas não coincidem';
            }
            break;
    }
    
    if (!isValid) {
        showError(field, errorMessage);
    } else {
        showSuccess(field);
    }
    
    return isValid;
}

function clearError(event) {
    const field = event.target;
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    formGroup.classList.remove('error', 'success');
    
    const errorMsg = formGroup.querySelector('.error-message');
    if (errorMsg) {
        errorMsg.remove();
    }
}

function showError(field, message) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    formGroup.classList.add('error');
    formGroup.classList.remove('success');
    
    const existingError = formGroup.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    formGroup.appendChild(errorDiv);
}

function showSuccess(field) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    formGroup.classList.add('success');
    formGroup.classList.remove('error');
    
    const existingError = formGroup.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateForm() {
    const fields = form.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    fields.forEach(field => {
        const fieldEvent = { target: field };
        if (!validateField(fieldEvent)) {
            isValid = false;
        }
    });
    
    return isValid;
}
// INICIALIZAÇÃO DA PÁGINA

document.addEventListener('DOMContentLoaded', function() {
    
    const tokenForm = document.getElementById('tokenForm');
    const tokenInput = document.getElementById('tokenInput');
    
    // Inicialização da Lógica do Token
    if (tokenForm) {
        tokenForm.addEventListener('submit', async function(event) {
            event.preventDefault(); 

            if (tokenInput && tokenInput.value) {
                clearError({ target: tokenInput }); 
                
                const tokenValido = await validarToken(tokenInput.value);
                if (tokenValido) {
                    alert('Token validado com sucesso! Redirecionando para o cadastro.');
                    window.location.href = URL_CADASTRO; 
                } else {
                    showError(tokenInput, 'Token inválido ou já utilizado.');
                    tokenInput.value = ''; 
                }
            } else {
                showError(tokenInput, 'O campo do token é obrigatório.');
            }
        });

        // Adiciona validação visual para o token
        tokenInput.addEventListener('blur', validateField); 
        tokenInput.addEventListener('input', clearError);
    }
    
    // Inicialização da Lógica do Cadastro
    form = document.getElementById('cadastroForm');

    if (form) {
        estadoSelect = document.getElementById('estado');
        cidadeSelect = document.getElementById('cidade');
        
        // Adiciona evento aos botões de password
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-target');
                if (targetId) {
                    togglePassword(targetId);
                }
            });
        });
        
        estadoSelect.addEventListener('change', atualizarCidades);
        form.addEventListener('submit', handleSubmit);
        
        // Verifica se o acesso é permitido (se o token foi validado)
        verificarAcessoCadastro(); 

        // Validação em tempo real para o formulário de cadastro
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearError);
        });
        
        // Inicializa o estado do campo cidade
        cidadeSelect.disabled = !estadoSelect.value;
    }
});