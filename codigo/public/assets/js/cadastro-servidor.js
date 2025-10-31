// JSON de tokens de acesso (Usado para a página de resgate de token)
const tokensData = {
    "tokensAcessoServidor": [
        "A1B9-C3D7-E5F2-G4H8",
        "Z9Y2-X4W6-V8U1-T3S5", 
        "P7O3-N5M1-L9K6-J4I0", 
        "H2G8-F6E0-D4C1-B5A7", 
        "Q5R1-S9T4-U7V3-W0X6", 
        "M0N6-O2P8-Q4R1-S3T7", 
        "C4B7-A1D9-E5F3-G8H2", 
        "V3U9-T6S2-R8Q4-P1O5", 
        "K7J0-I4L6-M2N9-O5P3", 
        "E9F5-G1H8-I3J7-K2L4", 
        "D6C2-B8A4-Z0Y7-X5W9", 
        "R1Q5-P9O3-N7M2-L4K6", 
        "J8I4-H6G2-F0E5-D3C7", 
        "T2S6-R9Q5-P1O4-N7M0", 
        "G3H7-I0J4-K6L8-M2N5", 
        "W9V5-U1T3-S7R4-Q0P8", 
        "L5K1-J7I3-H9G4-F2E6", 
        "A7B3-C9D5-E1F4-G6H0", 
        "Y4X8-W0V2-U6T1-S5R9", 
        "P6O2-N8M4-L0K7-J3I5"
    ]
};

// Dados das cidades por estado (Usado para a página de cadastro)
const cidadesPorEstado = {
    'MG': ['Belo Horizonte', 'Contagem', 'Uberlândia', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares', 'Ipatinga'],
    'SP': ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'Ribeirão Preto', 'Sorocaba', 'Mauá', 'São José dos Campos'],
    'RJ': ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Belford Roxo', 'São João de Meriti', 'Campos dos Goytacazes', 'Petrópolis', 'Volta Redonda']
};

let form, estadoSelect, cidadeSelect;

// Constantes de Controle
const TOKENS_KEY = 'tokens_validos_e_usados';
const URL_CADASTRO = '../../modulos/cadastro/cadastro-servidor.html';
const URL_TOKEN = '../../modulos/cadastro/token-servidor.html';
const URL_LOGIN = '#';


// FUNÇÕES DE INICIALIZAÇÃO E TOKENS

function inicializarTokens() {
    if (!localStorage.getItem(TOKENS_KEY)) {
        localStorage.setItem(TOKENS_KEY, JSON.stringify(tokensData.tokensAcessoServidor));
    }
}


function validarToken(token) {
    let tokensValidos;
    try {
        tokensValidos = JSON.parse(localStorage.getItem(TOKENS_KEY) || '[]');
    } catch (e) {
        return false;
    }

    const tokenLimpo = token.trim().toUpperCase().replace(/-/g, '');
    
    const tokenFormatado = (tokenLimpo.match(/.{1,4}/g) || []).join('-'); 

    const index = tokensValidos.indexOf(tokenFormatado);

    if (index > -1) {
        // Token encontrado! Remover para garantir uso único.
        tokensValidos.splice(index, 1);
        localStorage.setItem(TOKENS_KEY, JSON.stringify(tokensValidos));
        
        // Salva o token validado na sessão para liberar o cadastro
        sessionStorage.setItem('token_servidor_validado', 'true'); 
        
        return true;
    }
    return false;
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


function handleSubmit(event) {
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
    const servidorData = {
        nomeCompleto: formData.get('nomeCompleto'),
        email: formData.get('email'),
        estado: formData.get('estado'),
        cidade: formData.get('cidade'),
        orgao: formData.get('orgao'),
        senha: formData.get('senha'),
        dataCadastro: new Date().toISOString(),
        tipoUsuario: 'servidor'
    };
    
    // Salvar no localStorage
    try {
        const key = 'servidores_cadastrados';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        
        const emailExists = existing.some(servidor => servidor.email === servidorData.email);
        if (emailExists) {
            alert('Este e-mail já está cadastrado.');
            return;
        }
        
        existing.push(servidorData);
        localStorage.setItem(key, JSON.stringify(existing));
        
        alert('Cadastro realizado com sucesso! Você será redirecionado para a página de login.');
        
        sessionStorage.removeItem('token_servidor_validado'); 

        window.location.href = URL_LOGIN;
        
    } catch (error) {
        console.error('Erro ao salvar cadastro:', error);
        alert('Erro ao salvar cadastro. Tente novamente.');
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
    
    inicializarTokens();

    const tokenForm = document.getElementById('tokenForm');
    const tokenInput = document.getElementById('tokenInput');
    
    // Inicialização da Lógica do Token
    if (tokenForm) {
        tokenForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            if (tokenInput && tokenInput.value) {
                clearError({ target: tokenInput }); 
                
                if (validarToken(tokenInput.value)) {
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