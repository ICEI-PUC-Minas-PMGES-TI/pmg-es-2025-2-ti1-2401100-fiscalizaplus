// Dados do projeto - FiscalizaPlus
window.DB_DATA = {
  "usuarios": [
    { "id": 1, "login": "admin", "senha": "123", "nome": "Administrador do Sistema", "email": "admin@abc.com", "cidadeId": 1, "bairroId": 1 },
    { "id": 2, "login": "user", "senha": "123", "nome": "Usuario Comum", "email": "user@abc.com", "cidadeId": 1, "bairroId": 2 },
    { "id": 3, "login": "joaozinho", "senha": "123", "nome": "Joãozinho", "email": "joaozinho@gmail.com", "cidadeId": 1, "bairroId": 1 },
    { "id": 4, "login": "rommel", "senha": "123", "nome": "Rommel", "email": "rommel@gmail.com", "cidadeId": 1, "bairroId": 3 },
    { "id": 5, "login": "maria.silva", "senha": "456", "nome": "Maria Silva", "email": "maria.silva@email.com", "cidadeId": 1, "bairroId": 2 },
    { "id": 6, "login": "carlos.santos", "senha": "789", "nome": "Carlos Santos", "email": "carlos.santos@email.com", "cidadeId": 1, "bairroId": 4 },
    { "id": 7, "login": "ana.costa", "senha": "321", "nome": "Ana Costa", "email": "ana.costa@email.com", "cidadeId": 1, "bairroId": 1 },
    { "id": 8, "login": "pedro.oliveira", "senha": "654", "nome": "Pedro Oliveira", "email": "pedro.oliveira@email.com", "cidadeId": 1, "bairroId": 3 },
    { "id": 9, "login": "lucia.ferreira", "senha": "987", "nome": "Lúcia Ferreira", "email": "lucia.ferreira@email.com", "cidadeId": 1, "bairroId": 2 },
    { "id": 10, "login": "bruno.alves", "senha": "147", "nome": "Bruno Alves", "email": "bruno.alves@email.com", "cidadeId": 1, "bairroId": 4 }
  ],
  "cidades": [
    { "id": 1, "nome": "Belo Horizonte", "uf": "MG", "lat": -19.9191, "lng": -43.9386 },
    { "id": 2, "nome": "Contagem", "uf": "MG", "lat": -19.9317, "lng": -44.0536 },
    { "id": 3, "nome": "Betim", "uf": "MG", "lat": -19.9677, "lng": -44.1987 }
  ],
  "bairros": [
    { "id": 1, "nome": "Savassi", "cidadeId": 1, "lat": -19.9366, "lng": -43.9332, "raio": 800 },
    { "id": 2, "nome": "Funcionários", "cidadeId": 1, "lat": -19.9295, "lng": -43.9222, "raio": 800 },
    { "id": 3, "nome": "Lourdes", "cidadeId": 1, "lat": -19.9290, "lng": -43.9405, "raio": 800 },
    { "id": 4, "nome": "Santo Antônio", "cidadeId": 1, "lat": -19.9540, "lng": -43.9500, "raio": 800 },
    { "id": 5, "nome": "Centro", "cidadeId": 1, "lat": -19.9245, "lng": -43.9352, "raio": 1000 },
    { "id": 6, "nome": "Pampulha", "cidadeId": 1, "lat": -19.8626, "lng": -43.9653, "raio": 1200 },
    { "id": 7, "nome": "Cidade Industrial", "cidadeId": 2, "lat": -19.9500, "lng": -44.0800, "raio": 1500 },
    { "id": 8, "nome": "Eldorado", "cidadeId": 2, "lat": -19.9200, "lng": -44.0400, "raio": 900 }
  ],
  "ocorrencias": [
    { "id": 1,  "usuarioId": 3, "cidadeId": 1, "bairroId": 1, "tipo": "buraco",      "titulo": "Buraco na Rua X",            "descricao": "Buraco grande na esquina.", "status": "em_andamento", "lat": -19.9362, "lng": -43.9329, "createdAt": "2025-01-18T10:00:00Z" },
    { "id": 2,  "usuarioId": 2, "cidadeId": 1, "bairroId": 2, "tipo": "sinalizacao", "titulo": "Sinalização apagada",       "descricao": "Faixa apagada.",          "status": "aberto",       "lat": -19.9302, "lng": -43.9226, "createdAt": "2025-01-18T09:00:00Z" },
    { "id": 3,  "usuarioId": 3, "cidadeId": 1, "bairroId": 1, "tipo": "calcada",     "titulo": "Calçada quebrada",         "descricao": "Trinca extensa.",         "status": "aberto",       "lat": -19.9357, "lng": -43.9322, "createdAt": "2025-01-17T14:30:00Z" },
    { "id": 4,  "usuarioId": 1, "cidadeId": 1, "bairroId": 1, "tipo": "lixo",        "titulo": "Lixo acumulado",           "descricao": "Sacos na calçada.",       "status": "resolvido",    "lat": -19.9371, "lng": -43.9340, "createdAt": "2025-01-16T11:20:00Z", "resolvedAt": "2025-01-17T08:00:00Z" },
    { "id": 5,  "usuarioId": 2, "cidadeId": 1, "bairroId": 2, "tipo": "buraco",      "titulo": "Asfalto afundando",        "descricao": "Depressão no leito.",     "status": "em_andamento", "lat": -19.9293, "lng": -43.9218, "createdAt": "2025-01-16T12:00:00Z" },
    { "id": 6,  "usuarioId": 4, "cidadeId": 1, "bairroId": 3, "tipo": "iluminacao",  "titulo": "Poste apagado",            "descricao": "Rua escura.",             "status": "aberto",       "lat": -19.9292, "lng": -43.9398, "createdAt": "2025-01-15T19:00:00Z" },
    { "id": 7,  "usuarioId": 3, "cidadeId": 1, "bairroId": 1, "tipo": "buraco",      "titulo": "Tampa de bueiro solta",    "descricao": "Risco a pedestres.",      "status": "aberto",       "lat": -19.9369, "lng": -43.9326, "createdAt": "2025-01-15T08:45:00Z" },
    { "id": 8,  "usuarioId": 2, "cidadeId": 1, "bairroId": 2, "tipo": "calcada",     "titulo": "Desnível em calçada",      "descricao": "Altura perigosa.",        "status": "aberto",       "lat": -19.9306, "lng": -43.9234, "createdAt": "2025-01-14T10:15:00Z" },
    { "id": 9,  "usuarioId": 4, "cidadeId": 1, "bairroId": 3, "tipo": "sinalizacao", "titulo": "Placa caída",              "descricao": "Placa no chão.",          "status": "em_andamento", "lat": -19.9287, "lng": -43.9411, "createdAt": "2025-01-14T17:40:00Z" },
    { "id": 10, "usuarioId": 1, "cidadeId": 1, "bairroId": 4, "tipo": "buraco",      "titulo": "Buraco próximo à praça",   "descricao": "Buraco médio.",           "status": "aberto",       "lat": -19.9548, "lng": -43.9503, "createdAt": "2025-01-13T09:00:00Z" }
  ]
};
