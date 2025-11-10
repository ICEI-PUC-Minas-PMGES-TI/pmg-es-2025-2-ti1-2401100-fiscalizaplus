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
            usuarioCorrente = JSON.parse (usuarioCorrenteJSON);
        } else {
            // Comentado para não redirecionar automaticamente
            // window.location.href = LOGIN_URL;
        }

        // REGISTRA LISTENER PARA O EVENTO DE CARREGAMENTO DA PÁGINA PARA ATUALIZAR INFORMAÇÕES DO USUÁRIO
        document.addEventListener('DOMContentLoaded', function () {
            showUserInfo ('userInfo');
        });
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
                db_usuarios = (Array.isArray(data) ? data : []).map(c => ({
                    id: c.id,
                    // Geramos um "login" sintético a partir do email (antes do @) caso não exista campo login
                    login: c.login || (c.email ? c.email.split('@')[0] : `cidadao${c.id}`),
                    // Senha fictícia apenas para ambiente de desenvolvimento (NUNCA usar em produção)
                    senha: c.senha || c.senhaHash || '123',
                    email: c.email,
                    nome: c.nome || c.nomeCompleto || c.login || 'Usuário'
                }));
                callback();
            })
            .catch(error => {
                console.error('Erro ao ler cidadãos via API JSONServer:', error);
                displayMessage("Erro ao ler cidadãos");
            });
}

// Verifica se o login do usuário está ok e, se positivo, direciona para a página inicial
function loginUser (login, senha) {

    // Verifica todos os itens do banco de dados de usuarios 
    // para localizar o usuário informado no formulario de login
    for (var i = 0; i < db_usuarios.length; i++) {
        var usuario = db_usuarios[i];

        // Se encontrou login, carrega usuário corrente e salva no Session Storage
        if (login == usuario.login && senha == usuario.senha) {
            usuarioCorrente.id = usuario.id;
            usuarioCorrente.login = usuario.login;
            usuarioCorrente.email = usuario.email;
            usuarioCorrente.nome = usuario.nome;

            const userJson = JSON.stringify(usuarioCorrente);
            sessionStorage.setItem('usuarioCorrente', userJson);
            sessionStorage.setItem('fp_user', userJson);
            sessionStorage.setItem('user', userJson);

            return true;
        }
    }

    return false;
}

function logoutUser () {
    sessionStorage.removeItem('usuarioCorrente');
    sessionStorage.removeItem('fp_user');
    sessionStorage.removeItem('user');

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

// Login automático temporário para desenvolvimento - usando João Pedro que tem denúncias no db.json
if (!sessionStorage.getItem('usuarioCorrente') && !sessionStorage.getItem('fp_user')) {
    // Simula login do João Pedro (existe no db.json com denúncias)
    const usuarioTemp = {
        id: 1,
        login: "joao.pedro",
        email: "joao.pedro@email.com",
        nome: "João Pedro",
        nomeCompleto: "João Pedro",
        cidade: "Belo Horizonte"
    };
    const userJson = JSON.stringify(usuarioTemp);
    sessionStorage.setItem('usuarioCorrente', userJson);
    sessionStorage.setItem('fp_user', userJson);
    sessionStorage.setItem('user', userJson);
    usuarioCorrente = usuarioTemp;
}