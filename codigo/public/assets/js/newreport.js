let map;
let marker;
let selectedLocation = null;
let imageInput = null;
let selectedFilesList = [];
let selectedFileDataUrls = [];
let currentUser = null; 
// Variáveis para armazenar o endereço completo obtido pelo reverse geocoding
let addressDetails = {
    rua: '',
    bairro: '',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    cep: ''
};

// --- CONFIGURAÇÃO DA API ---
const API_BASE_URL = 'http://localhost:3000';
const DENUNCIAS_ENDPOINT = `${API_BASE_URL}/denuncias`;
const CIDADAOS_ENDPOINT = `${API_BASE_URL}/cidadaos`;
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Função para obter o usuário corrente do sessionStorage
function getUsuarioCorrente() {
    try {
        // Verifica se é visitante (entrou sem login)
        const isGuest = sessionStorage.getItem('isGuest') === 'true';
        if (isGuest) {
            return null; // Retorna null para visitante
        }
        
        // Tenta múltiplas chaves de sessão
        const keys = ['usuarioCorrente', 'fp_user', 'user'];
        for (const key of keys) {
            const raw = sessionStorage.getItem(key);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Verifica se tem ID válido (não aceita dados sem ID ou admin)
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

// Função para carregar dados do usuário corrente
async function loadUserData() {
    try {
        // Primeiro tenta obter do sessionStorage
        let usuario = getUsuarioCorrente();
        
        // Se não há usuário logado, redireciona para login
        if (!usuario || !usuario.id) {
            alert('Você precisa estar logado para reportar uma ocorrência. Por favor, faça login primeiro.');
            // Calcula o caminho correto para login
            const loginPath = '../../modulos/login/login.html';
            window.location.href = loginPath;
            return;
        }
        
        if (usuario && usuario.id) {
            // Se encontrou no sessionStorage, busca dados completos do json-server
            const response = await fetch(`${CIDADAOS_ENDPOINT}/${usuario.id}`);
            
            if (response.ok) {
                const data = await response.json();
                currentUser = {
                    ...usuario,
                    ...data,
                    nomeCompleto: data.nomeCompleto || usuario.nome || usuario.nomeCompleto || 'Usuário'
                };
            } else {
                // Se não encontrou no servidor, usa os dados do sessionStorage
                currentUser = usuario;
            }
        } else {
            // Fallback: busca o primeiro usuário (para desenvolvimento)
            const response = await fetch(CIDADAOS_ENDPOINT);
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    currentUser = data[0];
                } else {
                    currentUser = { nomeCompleto: "Usuário de Teste (Fallback)", id: null };
                }
            } else {
                currentUser = { nomeCompleto: "Usuário de Teste (Fallback)", id: null };
            }
        }

        console.log("Usuário carregado:", currentUser.nomeCompleto, "ID:", currentUser.id);

        const nomeUsuarioNav = document.querySelector('.navbar-user .name-user');
        if (nomeUsuarioNav && currentUser.nomeCompleto) {
            nomeUsuarioNav.textContent = `Olá, ${currentUser.nomeCompleto.split(' ')[0]}`;
        }
        
    } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        currentUser = { nomeCompleto: "Usuário de Teste (Fallback)", id: null };
    }
}

// Variável do centro do mapa
const bhCenter = [-19.9167, -43.9345];

// Define os limites geográficos aproximados de Belo Horizonte
const bhBounds = L.latLngBounds(
    [-19.98, -44.10], // Sudoeste
    [-19.75, -43.80]  // Nordeste
);

// Função de inicialização do mapa usando o Leaflet
function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Elemento #map não encontrado no DOM!');
        return;
    }

    // Verifica se o mapa já foi inicializado
    if (map) {
        try {
            map.remove();
        } catch (e) {
            console.warn('Erro ao remover mapa anterior:', e);
        }
    }

    try {
        map = L.map('map', {
            center: bhCenter,
            zoom: 13,
            maxBoundsViscosity: 1.0,
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            keyboard: true,
            dragging: true,
            touchZoom: true,
        }).setView(bhCenter, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            minZoom: 10
        }).addTo(map);

        L.rectangle(bhBounds, {
            color: '#ce2828',
            weight: 2,
            fillColor: 'transparent',
            fillOpacity: 0,
            dashArray: '5, 5'
        }).addTo(map);

        console.log('Mapa inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
        alert('Erro ao carregar o mapa. Por favor, recarregue a página.');
    }

    map.on('click', function (e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        if (bhBounds.contains([lat, lng])) {
            if (marker) {
                map.removeLayer(marker);
            }
            marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: `
                        <div style="
                            background-color: #ce2828;
                            width: 30px;
                            height: 30px;
                            border-radius: 50%;
                            border: 2px solid white;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 16px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">!</div>
                    `,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                })
            }).addTo(map);

            selectedLocation = { lat: lat, lng: lng };
            updateAddressFields(lat, lng); // Chamada para reverse geocoding
        } else {
            alert('Por favor, selecione uma localização dentro dos limites de Belo Horizonte.');
        }
    });
}

// NOVA FUNÇÃO: Reverse Geocoding para obter Rua e Bairro
async function reverseGeocode(lat, lng) {
    const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.address; // Retorna o objeto de endereço
    } catch (error) {
        console.error("Erro ao realizar reverse geocoding:", error);
        return null;
    }
}

// ATUALIZADA: Preenche o campo de endereço único e a variável global
async function updateAddressFields(lat, lng) {
    const enderecoField = document.querySelector("#endereco");
    enderecoField.value = 'Localizando endereço...'; // Feedback imediato

    const addressData = await reverseGeocode(lat, lng);

    if (addressData) {
        const street = addressData.road || addressData.footway || addressData.street || 'Endereço não identificado';
        const neighbourhood = addressData.suburb || addressData.neighbourhood || addressData.village || 'Bairro não identificado';
        const postcode = addressData.postcode || '';

        // Preenche o campo visível no formulário com o endereço legível
        enderecoField.value = `${street}, ${neighbourhood}, Belo Horizonte`;
        
        // Armazena os detalhes na variável global para o envio
        addressDetails.rua = street;
        addressDetails.bairro = neighbourhood;
        addressDetails.cep = postcode;
        addressDetails.cidade = addressData.city || addressData.town || 'Belo Horizonte';
        addressDetails.estado = addressData.state_code || addressData.state || 'MG';

    } else {
        enderecoField.value = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)} (Endereço não identificado)`;
        // Reseta os detalhes se a busca falhar
        addressDetails.rua = `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        addressDetails.bairro = 'Não identificado';
        addressDetails.cep = '';
    }
}


function searchAdress() { // Mantido o nome original para evitar mudar o HTML
    const enderecoField = document.querySelector("#endereco");
    const endereco = enderecoField.value.trim();

    if (!endereco || endereco.startsWith('Lat:')) {
        alert('Por favor, digite um endereço válido para buscar.');
        return;
    }

    let enderecoCompleto = endereco;
    if (!endereco.toLowerCase().includes('belo horizonte') && !endereco.toLowerCase().includes('bh')) {
        enderecoCompleto = endereco + ', Belo Horizonte, MG, Brasil';
    }

    const buscarBtn = document.querySelector('#buscar-btn');
    const originalText = buscarBtn.innerHTML;

    buscarBtn.innerHTML = '🔍 Buscando...';
    buscarBtn.disabled = true;

    const url = `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(enderecoCompleto)}&limit=1&countrycodes=br`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const resultado = data[0];
                const lat = parseFloat(resultado.lat);
                const lng = parseFloat(resultado.lon);

                if (bhBounds.contains([lat, lng])) {
                    map.setView([lat, lng], 16);
                    
                    // O campo de endereço agora é atualizado pelo updateAddressFields, para consistência
                    selectedLocation = { lat: lat, lng: lng };
                    updateAddressFields(lat, lng); 

                    if (marker) {
                        map.removeLayer(marker);
                    }
                    marker = L.marker([lat, lng]).addTo(map);

                    L.popup()
                        .setLatLng([lat, lng])
                        .setContent(`
                            <div style="text-align: center; padding: 10px;">
                                <h4 style="margin: 0 0 10px 0; color: #ce2828;">📍 Endereço Encontrado</h4>
                                <p style="margin: 0; font-size: 14px;">${resultado.display_name}</p>
                                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Localização marcada automaticamente. Você pode clicar no mapa para ajustar.</p>
                            </div>
                        `)
                        .openOn(map);


                } else {
                    alert('O endereço encontrado está fora dos limites de Belo Horizonte. Por favor, tente um endereço dentro da cidade.');
                }
            } else {
                alert('Endereço não encontrado. Verifique se o endereço está correto e dentro de Belo Horizonte.');
            }
        })
        .catch(error => {
            console.error('Erro na busca:', error);
            alert('Erro ao buscar o endereço. Tente novamente.');
        })
        .finally(() => {
            buscarBtn.innerHTML = '🔍 Buscar';
            buscarBtn.disabled = false;
        });
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async function (position) { 
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                const currentLatLng = L.latLng(lat, lng);

                if (bhBounds.contains(currentLatLng)) {
                    map.setView([lat, lng], 15);

                    if (marker) {
                        map.removeLayer(marker);
                    }

                    marker = L.marker([lat, lng]).addTo(map);

                    selectedLocation = { lat: lat, lng: lng };
                    await updateAddressFields(lat, lng); 
                    
                    alert('Localização atual encontrada e marcada em Belo Horizonte!');
                } else {
                    alert('Sua localização atual está fora dos limites de Belo Horizonte. Por favor, selecione uma localização dentro da cidade.');
                }
            },
            function (error) {
                alert('Erro ao obter localização: ' + error.message);
            }
        );
    } else {
        alert('Geolocalização não é suportada por este navegador.');
    }
}

function resetMap() {
    map.setView(bhCenter, 13);

    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }

    selectedLocation = null;
    document.querySelector("#endereco").value = '';
    addressDetails = { // Limpa os detalhes internos
        rua: '',
        bairro: '',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        cep: ''
    };
}

// --- FUNÇÕES DE GERENCIAMENTO DE IMAGEM (Mantidas) ---

function renderPreview() {
    const previewContainer = document.getElementById('imagePreview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    selectedFileDataUrls.forEach((dataUrl, index) => {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'image-preview-item';
        imageDiv.innerHTML = `
            <img src="${dataUrl}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" onclick="removeImage(${index})">×</button>
        `;
        previewContainer.appendChild(imageDiv);
    });
}

function readFileAsDataURL(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = function (e) {
            resolve(e.target.result);
        };
        reader.onerror = () => resolve(null); 
        reader.readAsDataURL(file);
    });
}

async function previewImages(input) {
    imageInput = input || document.querySelector("#imagens");
    if (!imageInput || !imageInput.files) return;

    const maxFiles = 5;
    
    const newFilesToAdd = Array.from(input.files).filter(f => f && f.type && f.type.startsWith('image/'));
    
    // Limpar o input file para permitir selecionar as mesmas fotos novamente se necessário
    imageInput.value = ''; 

    for (let i = 0; i < newFilesToAdd.length && selectedFilesList.length < maxFiles; i++) {
        selectedFilesList.push(newFilesToAdd[i]);
    }
    
    const dataUrlPromises = selectedFilesList.map(file => readFileAsDataURL(file));
    const loadedDataUrls = await Promise.all(dataUrlPromises);
    
    selectedFileDataUrls = loadedDataUrls.filter(url => url !== null);

    renderPreview();
}

function removeImage(index){
    selectedFilesList = selectedFilesList.filter((_, i) => i !== index);
    selectedFileDataUrls = selectedFileDataUrls.filter((_, i) => i !== index);

    renderPreview();
}

// --- FUNÇÕES PARA GERAR CÓDIGO DE OCORRÊNCIA (CORRIGIDAS) ---

// Helper para formatar o número sequencial (0001, 0002, etc.)
function formatarCodigo(numero) {
    // Garante 4 dígitos com zeros à esquerda
    const numeroFormatado = String(numero).padStart(4, '0'); 
    return `OCOR-${numeroFormatado}`;
}

// FUNÇÃO ATUALIZADA: Principal para buscar o próximo número sequencial e formatar o código
async function gerarCodigoOcorrencia() {
    let proximoNumero = 1;

    try {
        // 1. Busca TODAS as denúncias para encontrar o maior codigoOcorrencia existente
        // Remover _sort e _limit para que o json-server retorne todos os registros e possamos
        // fazer a lógica de ordenação numérica corretamente no cliente.
        const response = await fetch(DENUNCIAS_ENDPOINT); 
        
        if (!response.ok) {
            console.warn("Falha ao buscar denúncias para gerar o código. Iniciando com OCOR-0001.");
            return formatarCodigo(proximoNumero);
        }

        const todasDenuncias = await response.json();

        if (todasDenuncias && todasDenuncias.length > 0) {
            let maiorNumero = 0;
            todasDenuncias.forEach(denuncia => {
                if (denuncia.codigoOcorrencia) {
                    // Extrai o número do código (ex: "OCOR-0123" -> 123)
                    const numeroString = denuncia.codigoOcorrencia.split('-')[1];
                    const numeroAtual = parseInt(numeroString);
                    if (!isNaN(numeroAtual) && numeroAtual > maiorNumero) {
                        maiorNumero = numeroAtual;
                    }
                }
            });
            proximoNumero = maiorNumero + 1;
        }

    } catch (error) {
        console.error("Erro na comunicação com o servidor ao gerar o código da ocorrência. Usando OCOR-0001.", error);
        // Em caso de erro na comunicação, inicia-se no 1 para evitar travamento
    }

    return formatarCodigo(proximoNumero);
}

// ATUALIZADA: FUNÇÃO DE ENVIO DO FORMULÁRIO (Usa addressDetails e gera codigoOcorrencia)
async function handleSubmit(event) {
    console.log('handleSubmit chamado', event);
    
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // Desabilitar botão e mostrar loading
    const submitButton = document.querySelector('#reportForm button[type="submit"]');
    const originalButtonText = submitButton?.innerHTML || '';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Enviando...';
    }

    try {
        console.log('Verificando localização selecionada...');
        if (!selectedLocation) {
            alert("Por favor, selecione a localização exata do problema no mapa antes de enviar.");
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
            return;
        }
        
        console.log('Localização OK, gerando código de ocorrência...');

    // --- GERA O CÓDIGO DE OCORRÊNCIA AQUI ---
    const novoCodigoOcorrencia = await gerarCodigoOcorrencia();
    console.log("Novo Código de Ocorrência gerado:", novoCodigoOcorrencia);
    // ----------------------------------------

    // Verifica se há usuário logado
    if (!currentUser || !currentUser.id) {
        alert('Você precisa estar logado para reportar uma ocorrência. Por favor, faça login primeiro.');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
        window.location.href = '../../modulos/login/login.html';
        return;
    }

    const isAnonimo = document.getElementById('anonimo').checked;
    const nomeReal = currentUser?.nomeCompleto || 'Usuário Desconhecido';
    const autorCidadao = isAnonimo ? 'Anônimo' : nomeReal;
    const recebeNotificacoes = document.getElementById('notificacoes')?.checked || false;


    // Faz upload real das imagens selecionadas para o backend e obtém URLs públicas
    let uploadedImageUrls = [];
    if (selectedFilesList && selectedFilesList.length > 0) {
        const fd = new FormData();
        selectedFilesList.forEach(file => fd.append('imagens', file));
        try {
            const upResp = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: fd });
            if (upResp.ok) {
                const upData = await upResp.json();
                if (upData && Array.isArray(upData.urls)) {
                    uploadedImageUrls = upData.urls; // array de strings (ex.: "/uploads/xxx.jpg")
                }
            } else {
                console.warn('Falha no upload de imagens:', upResp.status, upResp.statusText);
            }
        } catch (e) {
            console.warn('Erro no upload de imagens:', e);
        }
    }

    // Coleta os dados do formulário de forma segura
    const tituloEl = document.getElementById('titulo');
    const categoriaEl = document.getElementById('categoria');
    const descricaoEl = document.getElementById('descricao');
    const observacoesEl = document.getElementById('observacoes');
    const contatoEl = document.getElementById('contato');

    if (!tituloEl || !categoriaEl || !descricaoEl) {
        console.error('Campos obrigatórios não encontrados no formulário!');
        alert('Erro: Alguns campos do formulário não foram encontrados. Por favor, recarregue a página.');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
        return;
    }

    const reportData = {
        titulo: tituloEl.value.trim(),
        tipoProblema: categoriaEl.value,
        descricaoCompleta: descricaoEl.value.trim(),
        informacoesAdicionaisCidadao: observacoesEl?.value?.trim() || '',
        
        // --- ADICIONADO O CAMPO codigoOcorrencia ---
        codigoOcorrencia: novoCodigoOcorrencia, 
        // ------------------------------------------

        // --- ADICIONADO O ID DO CIDADÃO QUE REPORTOU ---
        // Garante que o ID seja salvo como string (json-server geralmente usa strings para IDs)
        cidadaoId: currentUser.id ? String(currentUser.id) : null,
        // -----------------------------------------------

        endereco: {
            // Agora usa os dados armazenados pelo reverse geocoding
            rua: addressDetails.rua, 
            numero: '', // Mantido vazio, pois não há campo no HTML
            bairro: addressDetails.bairro,
            cidade: addressDetails.cidade, 
            estado: addressDetails.estado, 
            cep: addressDetails.cep,
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng
        },
        imagens: uploadedImageUrls, 
        prioridadeCidadao: document.getElementById('prioridade')?.value || 'media',
        urgenciaCidadao: document.getElementById('urgencia')?.value || 'media',
        impactoComunidade: document.getElementById('impacto')?.value || 'medio',
        dataRegistro: new Date().toISOString(),
        autorCidadao: autorCidadao,
        isAnonimo: isAnonimo,
        statusAtual: 'Pendente', 
        dataUltimaAtualizacaoStatus: new Date().toISOString(),
        prioridadeInterna: null,
        observacoesInternasServidor: '',
        servidorResponsavelId: null,
        
        contatoCidadao: contatoEl?.value?.trim() || currentUser?.email || '',
        recebeNotificacoes: recebeNotificacoes
    };

    console.log("Dados do relatório para envio (com URLs de imagens):", reportData);
    console.log("[Nova Denúncia] cidadaoId sendo salvo:", reportData.cidadaoId, "tipo:", typeof reportData.cidadaoId, "currentUser.id:", currentUser.id);

    // Validação dos campos obrigatórios
    if (!reportData.titulo || !reportData.titulo.trim()) {
        alert("Por favor, preencha o título do problema.");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
        return;
    }

    if (!reportData.tipoProblema || !reportData.tipoProblema.trim()) {
        alert("Por favor, selecione uma categoria.");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
        return;
    }

    if (!reportData.descricaoCompleta || !reportData.descricaoCompleta.trim()) {
        alert("Por favor, preencha a descrição do problema.");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
        return;
    }

    console.log("Enviando dados para:", DENUNCIAS_ENDPOINT);
    console.log("Dados que serão enviados:", JSON.stringify(reportData, null, 2));
    
    const response = await fetch(DENUNCIAS_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
    });

    console.log("Resposta recebida:", response.status, response.statusText);

    if (!response.ok) {
        let errorMessage = `Erro ao enviar relatório: ${response.status}`;
        let errorDetails = '';
        try {
            const errorData = await response.json();
            errorMessage += ` - ${errorData.message || response.statusText}`;
            errorDetails = JSON.stringify(errorData, null, 2);
            console.error("Detalhes do erro:", errorDetails);
        } catch (e) {
            errorMessage += ` - ${response.statusText}`;
            try {
                const text = await response.text();
                console.error("Resposta de erro (texto):", text);
            } catch (e2) {
                console.error("Não foi possível ler a resposta de erro");
            }
        }
        throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("Relato enviado com sucesso para o json-server:", result);
    alert(`Relato ${result.codigoOcorrencia || novoCodigoOcorrencia} enviado com sucesso, obrigado por denunciar!`);
    
    // Resetar formulário
    const form = document.getElementById('reportForm');
    if (form) {
        form.reset();
    }
    resetMap(); 
    
    selectedFilesList = [];
    selectedFileDataUrls = []; 
    renderPreview();
    
    // Reabilitar botão após sucesso
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }

    } catch (error) {
        console.error("Erro ao enviar relatório:", error);
        alert(`Erro ao enviar o relatório: ${error.message}\n\nPor favor, verifique se o servidor está rodando e tente novamente.`);
    } finally {
        // Reabilitar botão em caso de erro
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    }
}

// ORQUESTRAÇÃO DE INICIALIZAÇÃO

async function initializeApp() {
    try {
        await loadUserData(); 
        
        // Aguarda um pouco para garantir que o DOM está totalmente carregado
        setTimeout(() => {
            initMap();
        }, 100);

        const form = document.getElementById('reportForm');
        if (form) {
            // Remove event listeners anteriores se existirem (usando uma flag)
            if (form._submitHandlerAttached) {
                form.removeEventListener('submit', form._submitHandler);
            }
            
            // Cria o handler e armazena referência
            form._submitHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit(e);
            };
            
            // Adiciona o event listener no formulário
            form.addEventListener('submit', form._submitHandler);
            form._submitHandlerAttached = true;
            console.log('Event listener de submit anexado ao formulário');
            
            // Também adiciona event listener no botão de submit como backup
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                // Garante que o botão não esteja desabilitado
                submitButton.disabled = false;
                
                submitButton.addEventListener('click', (e) => {
                    console.log('Botão de submit clicado');
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit(e);
                });
                console.log('Event listener de submit também anexado ao botão');
            } else {
                console.error('Botão de submit não encontrado no formulário!');
            }
        } else {
            console.error('Formulário reportForm não encontrado!');
        }

        const fileInput = document.querySelector("#imagens");
        if (fileInput) {
            fileInput.addEventListener('change', (e) => previewImages(e.target));
        }
        
        // Adiciona event listener para o botão de buscar (searchAdress)
        const buscarBtn = document.querySelector('#buscar-btn');
        if (buscarBtn) {
            buscarBtn.addEventListener('click', (e) => {
                e.preventDefault();
                searchAdress();
            });
        }

        // Adiciona event listener para o botão de localização atual
        const localizarBtn = document.querySelector('.map-controls .btn-outline-primary');
        if (localizarBtn) {
            localizarBtn.addEventListener('click', (e) => {
                e.preventDefault();
                getCurrentLocation();
            });
        }

        // Adiciona event listener para o botão de resetar mapa
        const resetBtn = document.querySelector('.map-controls .btn-outline-secondary');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                resetMap();
            });
        }
    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
    }
}

// Aguarda o DOM estar completamente carregado antes de inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeApp, 200);
    });
} else {
    // DOM já está carregado, mas aguarda um pouco para garantir que tudo está pronto
    setTimeout(initializeApp, 200);
}