// Trabalho Interdisciplinar 1 - Aplicações Web
//
// Esse módulo implementa uma API RESTful baseada no JSONServer
// O servidor JSONServer fica hospedado na seguinte URL
// https://jsonserver.rommelpuc.repl.co/contatos
//
// Para montar um servidor para o seu projeto, acesse o projeto 
// do JSONServer no Replit, faça o FORK do projeto e altere o 
// arquivo db.json para incluir os dados do seu projeto.
//
// URL Projeto JSONServer: https://replit.com/@rommelpuc/JSONServer
//
// Autor: Rommel Vieira Carneiro
// Data: 03/10/2023

const jsonServer = require('json-server')
const path = require('path')
const fs = require('fs')
const multer = require('multer')

const server = jsonServer.create()
const router = jsonServer.router('db/db.json')
  
// Para permitir que os dados sejam alterados, altere a linha abaixo
// colocando o atributo readOnly como false.
// Configuração de CORS para produção (Render)
const middlewares = jsonServer.defaults({ 
  static: 'public', 
  noCors: process.env.NODE_ENV === 'production' ? false : true 
})
server.use(middlewares)

// Adiciona headers CORS manualmente para produção
if (process.env.NODE_ENV === 'production') {
  server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }
    next()
  })
}

// Configuração de upload local (sem validações avançadas)
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now()
    const safe = String(file.originalname || 'arquivo').replace(/[^\w.\-]/g, '_')
    cb(null, `${ts}-${safe}`)
  }
})

const upload = multer({ storage })

// Rota para upload de múltiplas imagens (campo: "imagens")
server.post('/upload', upload.array('imagens', 5), (req, res) => {
  const files = req.files || []
  if (!files.length) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado' })
  }
  const urls = files.map(f => `/uploads/${f.filename}`)
  return res.json({ urls })
})

server.use(router)

// Porta configurável para produção (Render) ou desenvolvimento
const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`JSON Server is running em http://localhost:${PORT}`)
})