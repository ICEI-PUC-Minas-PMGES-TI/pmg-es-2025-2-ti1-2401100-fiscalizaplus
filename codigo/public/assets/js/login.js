// Trabalho Interdisciplinar 1 - Aplicações Web
//
// Esse módulo realiza o registro de novos usuários e login para aplicações com 
// backend baseado em API REST provida pelo JSONServer
// Os dados de usuário estão localizados no arquivo db.json que acompanha este projeto.
//
// Autor: Rommel Vieira Carneiro (rommelcarneiro@gmail.com)
// Data: 09/09/2024
//
// Código LoginApp  


// Página inicial de Login
const LOGIN_URL = "/index.html";
let RETURN_URL = "/index.html";

const API_BASE = 'http://localhost:3000';

const API_URL = `${API_BASE}/cidadaos`;

// Objeto para o banco de dados de usuários baseado em JSON
var db_usuarios = {};

// Objeto para o usuário corrente
var usuarioCorrente = {};

// Inicializa a aplicação de Login
function initLoginApp () {
    let pagina = window.location.pathname;
    if (pagina != LOGIN_URL) {
        // CONFIGURA A URLS DE RETORNO COMO A PÁGINA ATUAL
        sessionStorage.setItem('returnURL', pagina);
        RETURN_URL = pagina;

        // INICIALIZA USUARIOCORRENTE A PARTIR DE DADOS NO LOCAL STORAGE, CASO EXISTA
        usuarioCorrenteJSON = sessionStorage.getItem('usuarioCorrente');
        if (usuarioCorrenteJSON) {
            try {
                const parsed = JSON.parse(usuarioCorrenteJSON);
                // Só aceita se não for administrador e tiver ID válido
                if (parsed && parsed.id && parsed.id !== 'admin' && parsed.id !== 'administrador' && 
                    parsed.nome !== 'Administrador' && parsed.nomeCompleto !== 'Administrador' &&
                    !parsed.nome?.toLowerCase().includes('admin') && !parsed.nomeCompleto?.toLowerCase().includes('admin')) {
                    usuarioCorrente = parsed;
                } else {
                    // Remove dados inválidos
                    sessionStorage.removeItem('usuarioCorrente');
                    sessionStorage.removeItem('fp_user');
                    sessionStorage.removeItem('user');
                }
            } catch (e) {
                // Se houver erro ao parsear, remove
                sessionStorage.removeItem('usuarioCorrente');
                sessionStorage.removeItem('fp_user');
                sessionStorage.removeItem('user');
            }
        }

        // REGISTRA LISTENER PARA O EVENTO DE CARREGAMENTO DA PÁGINA PARA ATUALIZAR INFORMAÇÕES DO USUÁRIO
        // Comentado - não deve atualizar automaticamente, deixa o current-user.js fazer isso
        // document.addEventListener('DOMContentLoaded', function () {
        //     showUserInfo ('userInfo');
        // });
    }
    else {
        // VERIFICA SE A URL DE RETORNO ESTÁ DEFINIDA NO SESSION STORAGE, CASO CONTRARIO USA A PÁGINA INICIAL
        let returnURL = sessionStorage.getItem('returnURL');
        RETURN_URL = returnURL || RETURN_URL
        
        // INICIALIZA BANCO DE DADOS DE USUÁRIOS
        carregarUsuarios(() => {
            console.log('Usuários carregados...');
        });
    }
};


function carregarUsuarios(callback) {
        fetch(API_URL)
            .then(response => response.json())
            .then(data => {
                // O arquivo db.json possui cidadãos com campos: id, nomeCompleto, email, senhaHash.
                // Adaptamos para a estrutura esperada pelo restante do login:
                db_usuarios = (Array.isArray(data) ? data : []).map(c => {
                    const emailLower = (c.email || '').toLowerCase();
                    const loginGerado = emailLower ? emailLower.split('@')[0] : `cidadao${c.id}`;
                    
                    return {
                        id: c.id,
                        // Geramos um "login" sintético a partir do email (antes do @) caso não exista campo login
                        login: c.login || loginGerado,
                        // Usa senhaHash diretamente (sem fallback para '123')
                        senha: c.senha || c.senhaHash || '',
                        email: c.email,
                        emailLower: emailLower, // Armazena email em lowercase para comparação
                        nome: c.nome || c.nomeCompleto || c.login || 'Usuário'
                    };
                });
                
                console.log('Usuários carregados:', db_usuarios.length);
                console.log('Usuários disponíveis:', db_usuarios.map(u => ({ email: u.email, login: u.login })));
                
                callback();
            })
            .catch(error => {
                console.error('Erro ao ler cidadãos via API JSONServer:', error);
                displayMessage("Erro ao ler cidadãos");
            });
}

// Verifica se o login do usuário está ok e, se positivo, direciona para a página inicial
async function loginUser (emailOuLogin, senha) {
    // Normaliza o input: pode ser email completo ou apenas a parte antes do @
    const emailOuLoginNormalizado = emailOuLogin.trim().toLowerCase();
    const loginExtraido = emailOuLoginNormalizado.includes('@') 
        ? emailOuLoginNormalizado.split('@')[0] 
        : emailOuLoginNormalizado;

    console.log('Tentativa de login:', { emailOuLogin: emailOuLoginNormalizado, loginExtraido, senhaLength: senha.length });

    // Primeiro tenta encontrar em cidadãos
    for (var i = 0; i < db_usuarios.length; i++) {
        var usuario = db_usuarios[i];

        // Compara tanto por email quanto por login, e verifica a senha
        const emailMatch = usuario.emailLower === emailOuLoginNormalizado;
        const loginMatch = usuario.login && usuario.login.toLowerCase() === loginExtraido;
        const senhaMatch = senha === usuario.senha;

        console.log('Comparando com usuário:', {
            email: usuario.email,
            emailLower: usuario.emailLower,
            login: usuario.login,
            emailMatch,
            loginMatch,
            senhaMatch,
            senhaDigitada: senha,
            senhaBanco: usuario.senha
        });

        // Se encontrou usuário (por email ou login) e a senha está correta
        if ((emailMatch || loginMatch) && senhaMatch) {
            try {
                // Busca dados completos do usuário no json-server
                const response = await fetch(`${API_URL}/${usuario.id}`);
                if (response.ok) {
                    const data = await response.json();
                    // Preenche todos os dados do usuário
                    usuarioCorrente.id = data.id || usuario.id;
                    usuarioCorrente.login = usuario.login;
                    usuarioCorrente.email = data.email || usuario.email;
                    usuarioCorrente.nome = data.nome || data.nomeCompleto || usuario.nome;
                    usuarioCorrente.nomeCompleto = data.nomeCompleto || data.nome || usuario.nome;
                    usuarioCorrente.estado = data.estado || null;
                    usuarioCorrente.cidade = data.cidade || null;
                    usuarioCorrente.tipo = 'cidadao'; // Define tipo como cidadão
                } else {
                    throw new Error('Usuário não encontrado no servidor');
                }
            } catch (error) {
                console.error('Erro ao buscar dados completos do usuário:', error);
                // Fallback: usa apenas os dados já carregados
                usuarioCorrente.id = usuario.id;
                usuarioCorrente.login = usuario.login;
                usuarioCorrente.email = usuario.email;
                usuarioCorrente.nome = usuario.nome;
                usuarioCorrente.nomeCompleto = usuario.nome;
                usuarioCorrente.tipo = 'cidadao'; // Define tipo como cidadão
            }

            // Remove flag de visitante ao fazer login
            sessionStorage.removeItem('isGuest');
            
            const userJson = JSON.stringify(usuarioCorrente);
            sessionStorage.setItem('usuarioCorrente', userJson);
            sessionStorage.setItem('fp_user', userJson);
            sessionStorage.setItem('user', userJson);

            return true;
        }
    }

    // Se não encontrou em cidadãos, busca em servidores
    try {
        const servidoresResponse = await fetch(`${API_BASE}/servidores`);
        const servidores = await servidoresResponse.json();
        
        if (Array.isArray(servidores)) {
            for (const servidor of servidores) {
                const emailLower = (servidor.email || '').toLowerCase();
                const emailMatch = emailLower === emailOuLoginNormalizado;
                const senhaMatch = senha === (servidor.senhaHash || servidor.senha || '');
                
                if (emailMatch && senhaMatch) {
                    // Usuário encontrado como servidor
                    usuarioCorrente.id = servidor.id;
                    usuarioCorrente.email = servidor.email;
                    usuarioCorrente.nome = servidor.nome || servidor.nomeCompleto || 'Servidor';
                    usuarioCorrente.nomeCompleto = servidor.nomeCompleto || servidor.nome || 'Servidor';
                    usuarioCorrente.estado = servidor.estado || null;
                    usuarioCorrente.cidade = servidor.cidade || null;
                    usuarioCorrente.orgaoId = servidor.orgaoId || null;
                    usuarioCorrente.tipo = 'servidor'; // Define tipo como servidor
                    
                    // Remove flag de visitante ao fazer login
                    sessionStorage.removeItem('isGuest');
                    
                    const userJson = JSON.stringify(usuarioCorrente);
                    sessionStorage.setItem('usuarioCorrente', userJson);
                    sessionStorage.setItem('fp_user', userJson);
                    sessionStorage.setItem('user', userJson);
                    
                    console.log('Login de servidor bem-sucedido:', usuarioCorrente);
                    return true;
                }
            }
        }
    } catch (error) {
        console.error('Erro ao buscar servidores:', error);
    }

    return false;
}

function logoutUser () {
    sessionStorage.removeItem('usuarioCorrente');
    sessionStorage.removeItem('fp_user');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('isGuest'); // Remove flag de visitante também
}

function addUser (nome, login, senha, email) {

    // Cria um objeto de usuario para o novo usuario 
    let usuario = { "login": login, "senha": senha, "nome": nome, "email": email };

    // Envia dados do novo usuário para ser inserido no JSON Server
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(usuario),
    })
        .then(response => response.json())
        .then(data => {
            // Adiciona o novo usuário na variável db_usuarios em memória
            db_usuarios.push (usuario);
            displayMessage("Usuário inserido com sucesso");
        })
        .catch(error => {
            console.error('Erro ao inserir usuário via API JSONServer:', error);
            displayMessage("Erro ao inserir usuário");
        });
}

function showUserInfo (element) {
    var elemUser = document.getElementById(element);
    if (elemUser) {
        elemUser.innerHTML = `${usuarioCorrente.nome} (${usuarioCorrente.login}) 
                    <a onclick="logoutUser()">❌</a>`;
    }
}

// Inicializa as estruturas utilizadas pelo LoginApp
initLoginApp ();

// Login automático temporário REMOVIDO - não deve fazer login automático
// O usuário deve fazer login manualmente ou entrar como visitante