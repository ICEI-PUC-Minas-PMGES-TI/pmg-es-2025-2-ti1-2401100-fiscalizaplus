// Dados das cidades por estado 
const cidadesPorEstado = {
    'MG': ['Belo Horizonte'],
};

let form, estadoSelect, cidadeSelect;

// Constantes de Controle
const URL_CADASTRO = '../../modulos/cadastro/cadastro-cidadao.html';
const URL_LOGIN = '../login/login.html'; 
const API_BASE = 'http://localhost:3000';
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

/* Alterna a visibilidade da senha e troca o ícone  */
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

    if (!validateForm()) {
        alert('Por favor, corrija os erros no formulário.');
        return;
    }

    // Coletar dados do formulário
    const formData = new FormData(form);
    const cidadaoData = { 
        nomeCompleto: formData.get('nomeCompleto'),
        email: formData.get('email'),
        estado: formData.get('estado'),
        cidade: formData.get('cidade'),
        senhaHash: formData.get('senha'), 
        dataCadastro: new Date().toISOString()
    };
    
    // Salvar no json-server
    try {
        // Verifica se o e-mail já existe
        const response = await fetch(`${API_BASE}/cidadaos?email=${encodeURIComponent(cidadaoData.email)}`);
        const existing = await response.json();
        
        if (Array.isArray(existing) && existing.length > 0) {
            alert('Este e-mail já está cadastrado.');
            return;
        }
        
        // Salva o novo cadastro
        const saveResponse = await fetch(`${API_BASE}/cidadaos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cidadaoData)
        });
        
        if (!saveResponse.ok) {
            throw new Error(`Erro HTTP: ${saveResponse.status}`);
        }
        
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
    if (!form) return false; 
    
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