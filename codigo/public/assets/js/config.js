// Configuração centralizada da API
// Detecta automaticamente se está em produção ou desenvolvimento
const API_BASE_URL = window.location.origin;
const API_BASE = window.location.origin;

// Exporta para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_BASE_URL, API_BASE };
}

// Disponibiliza globalmente
window.API_BASE_URL = API_BASE_URL;
window.API_BASE = API_BASE;

