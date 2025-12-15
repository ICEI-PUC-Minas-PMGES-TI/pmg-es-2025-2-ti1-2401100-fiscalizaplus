// codigo/public/assets/js/comunidade.js
const API_URL = `${window.location.origin}/comunidade`;

let posts = [];
let currentCategory = "todas";
let currentPage = 1;
const itemsPerPage = 4; // 4 discussões por página
let allPosts = []; // Todas as discussões filtradas

const cardsEl = document.getElementById("cards");
const catListEl = document.getElementById("cat-list");
const newPostForm = document.getElementById("new-post-form");

// ===================== FUNÇÃO PARA OBTER USUÁRIO CORRENTE =====================
function getUsuarioCorrente() {
  try {
    const isGuest = sessionStorage.getItem('isGuest') === 'true';
    if (isGuest) {
      return null;
    }
    
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

// ===================== ATUALIZAR PERFIL NA SIDEBAR =====================
function updateSidebarProfile() {
  const user = getUsuarioCorrente();
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const sidebarName = document.getElementById('sidebar-name');
  const sidebarEmail = document.getElementById('sidebar-email');
  
  if (user && user.id) {
    const nomeCompleto = user.nomeCompleto || user.nome || 'Usuário';
    const email = user.email || '';
    const inicial = nomeCompleto.charAt(0).toUpperCase();
    
    if (sidebarAvatar) sidebarAvatar.textContent = inicial;
    if (sidebarName) sidebarName.textContent = nomeCompleto;
    if (sidebarEmail) sidebarEmail.textContent = email;
  } else {
    if (sidebarAvatar) sidebarAvatar.textContent = 'U';
    if (sidebarName) sidebarName.textContent = 'Usuário';
    if (sidebarEmail) sidebarEmail.textContent = 'Faça login para participar';
  }
}

// ===================== CARREGAR POSTS =====================
async function loadPosts() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) {
      throw new Error("Erro ao buscar comunidade: " + res.status);
    }
    posts = await res.json();
    loadVotedPosts(); // Carrega votos salvos após carregar posts
    renderPosts();
    
    // Verifica se há um parâmetro de post na URL após carregar os posts
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    if (postId) {
      const category = urlParams.get('category');
      handlePostNavigation(postId, category);
    }
  } catch (err) {
    console.error(err);
    cardsEl.innerHTML = `
      <p class="mt-3 text-danger">
        Erro ao carregar discussões. Verifique se o <code>json-server</code>
        está rodando corretamente.
      </p>
    `;
    alert("Não consegui falar com o servidor. Verifique se o json-server está rodando.");
  }
}

// ===================== RENDERIZAR POSTS =====================
function renderPosts() {
  const list =
    currentCategory === "todas"
      ? posts
      : posts.filter((p) => p.category === currentCategory);

  if (!list.length) {
    cardsEl.innerHTML = `
      <p class="mt-3 text-muted">
        Nenhuma discussão encontrada para esta categoria.
      </p>
    `;
    // Remove paginação se não houver posts
    const existingPagination = document.querySelector('.pagination-container');
    if (existingPagination) {
      existingPagination.remove();
    }
    return;
  }

  // ordena por data (mais recente primeiro)
  const sorted = [...list].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  // Salva todas as discussões filtradas
  allPosts = sorted;
  currentPage = 1;

  // Remove paginação existente
  const existingPagination = document.querySelector('.pagination-container');
  if (existingPagination) {
    existingPagination.remove();
  }

  // Renderiza a página atual
  renderPage(currentPage);

  // Cria paginação se houver mais de 4 discussões
  if (sorted.length > itemsPerPage) {
    createPagination(sorted.length);
  }
}

// ===================== RENDERIZAR PÁGINA =====================
function renderPage(page) {
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const postsToShow = allPosts.slice(startIndex, endIndex);

  cardsEl.innerHTML = postsToShow.map(postToCardHtml).join("");

  // Atualiza estado da paginação
  updatePaginationState();
}

// ===================== GERENCIAMENTO DE VOTOS =====================
const votedPosts = new Set(); // Armazena IDs dos posts que o usuário votou

function hasVoted(postId) {
  const key = `voted_${postId}`;
  return localStorage.getItem(key) === 'true' || votedPosts.has(String(postId));
}

function setVoted(postId) {
  const key = `voted_${postId}`;
  localStorage.setItem(key, 'true');
  votedPosts.add(String(postId));
}

function unsetVoted(postId) {
  const key = `voted_${postId}`;
  localStorage.removeItem(key);
  votedPosts.delete(String(postId));
}

// Carrega votos salvos ao iniciar
function loadVotedPosts() {
  posts.forEach(post => {
    if (hasVoted(post.id)) {
      votedPosts.add(String(post.id));
    }
  });
}

function postToCardHtml(p) {
  const created = p.createdAt ? new Date(p.createdAt) : new Date();
  const timeStr =
    created.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }) +
    " " +
    created.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const author = p.author || "Anônimo";
  const firstLetter = author.charAt(0).toUpperCase();
  const votes = p.votes || 0;
  const progressWidth = Math.min((votes / 50) * 100, 100); // Progresso baseado em 50 votos máximo
  const hasUserVoted = hasVoted(p.id);

  return `
    <article class="card" data-id="${p.id}" data-category="${p.category}">
      <header class="card__header">
        <div class="avatar" aria-hidden="true">${firstLetter}</div>
        <div class="card__author">
          <strong class="author">${author}</strong>
          <small class="timeago">${timeStr}</small>
        </div>
      </header>

      <h3 class="card__title">${p.title}</h3>
      <p class="card__excerpt">
        ${p.excerpt}
      </p>

      <div class="progress" aria-label="Apoio da comunidade">
        <div class="progress__bar" style="width:${progressWidth}%"></div>
      </div>

      <footer class="card__footer">
        <button class="btn btn--outline vote-btn ${hasUserVoted ? 'is-voted' : ''}" data-id="${p.id}">
          ${hasUserVoted ? 'Voltar voto' : 'Computar voto'}
        </button>
        <div class="votes">
          <span class="dot" aria-hidden="true">●</span>
          <span class="votes__count">${votes}</span>
          <span class="votes__label">Votos</span>
        </div>
      </footer>
    </article>
  `;
}

// ===================== FILTRO POR CATEGORIA =====================
catListEl?.addEventListener("click", (event) => {
  const li = event.target.closest(".cat-item");
  if (!li) return;

  catListEl
    .querySelectorAll(".cat-item")
    .forEach((item) => item.classList.remove("is-active"));

  li.classList.add("is-active");
  currentCategory = li.dataset.cat || "todas";
  currentPage = 1; // Reset para primeira página ao mudar categoria
  renderPosts();
});

// ===================== NOVA DISCUSSÃO =====================
newPostForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(newPostForm);

  const title = formData.get("title").trim();
  const category = formData.get("category");
  const body = formData.get("body").trim();

  if (!title || !body) {
    alert("Preencha título e descrição.");
    return;
  }

  // Obtém dados do usuário logado para usar como autor
  const user = getUsuarioCorrente();
  const authorName = user && user.nomeCompleto 
    ? user.nomeCompleto 
    : (user && user.nome ? user.nome : "Anônimo");

  const newPost = {
    title,
    category,
    excerpt: body,
    author: authorName,
    createdAt: new Date().toISOString(),
    votes: 0,
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newPost),
    });

    if (!res.ok) {
      throw new Error("Erro ao salvar discussão: " + res.status);
    }

    const saved = await res.json();
    posts.push(saved);

    newPostForm.reset();

    // volta para "Todas"
    currentCategory = "todas";
    document
      .querySelectorAll(".cat-item")
      .forEach((li) => li.classList.toggle("is-active", li.dataset.cat === "todas"));

    // Reset para primeira página ao criar novo post
    currentPage = 1;
    renderPosts();

    // fecha o modal
    const modalEl = document.getElementById("newPostModal");
    if (modalEl && window.bootstrap) {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      modalInstance?.hide();
    }
  } catch (err) {
    console.error(err);
    alert("Não foi possível salvar a discussão. Verifique o json-server.");
  }
});

// ===================== VOTAR =====================
document.addEventListener("click", async (event) => {
  const btn = event.target.closest(".vote-btn");
  if (!btn || btn.classList.contains("is-disabled")) return;

  const id = btn.dataset.id;
  const post = posts.find((p) => String(p.id) === String(id));
  if (!post) return;

  const hasVotedPost = hasVoted(id);
  const currentVotes = post.votes || 0;
  const newVotes = hasVotedPost ? Math.max(0, currentVotes - 1) : currentVotes + 1;

  // Desabilita o botão durante a requisição
  btn.disabled = true;
  btn.classList.add("is-disabled");

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ votes: newVotes }),
    });

    if (!res.ok) {
      throw new Error("Erro ao computar voto: " + res.status);
    }

    // Atualiza o voto no post
    post.votes = newVotes;

    // Atualiza o estado do voto
    if (hasVotedPost) {
      unsetVoted(id);
    } else {
      setVoted(id);
    }

    // Atualiza allPosts com os posts filtrados e ordenados atuais
    const list =
      currentCategory === "todas"
        ? posts
        : posts.filter((p) => p.category === currentCategory);
    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    allPosts = sorted;

    // Re-renderiza apenas a página atual (mantém paginação)
    renderPage(currentPage);
  } catch (err) {
    console.error(err);
    alert("Não foi possível computar o voto. Verifique o json-server.");
  } finally {
    btn.disabled = false;
    btn.classList.remove("is-disabled");
  }
});

// ===================== VALIDAÇÃO DE LOGIN PARA NOVA DISCUSSÃO =====================
const btnNew = document.getElementById("btn-new");
const newPostModal = document.getElementById("newPostModal");
let alertShown = false; // Flag para evitar alert duplicado

if (btnNew) {
  // Intercepta o clique antes do Bootstrap processar
  btnNew.addEventListener("click", (event) => {
    const user = getUsuarioCorrente();
    
    // Se o usuário não estiver logado, mostra alerta e impede a abertura do modal
    if (!user || !user.id) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      // Impede que o Bootstrap abra o modal removendo temporariamente os atributos
      const originalToggle = btnNew.getAttribute("data-bs-toggle");
      const originalTarget = btnNew.getAttribute("data-bs-target");
      
      btnNew.removeAttribute("data-bs-toggle");
      btnNew.removeAttribute("data-bs-target");
      
      // Fecha o modal se estiver aberto
      if (newPostModal && window.bootstrap) {
        const modalInstance = bootstrap.Modal.getInstance(newPostModal);
        if (modalInstance) {
          modalInstance.hide();
        }
      }
      
      // Mostra alerta apenas se ainda não foi mostrado
      if (!alertShown) {
        alertShown = true;
        alert("Você precisa estar logado para iniciar uma nova discussão. Por favor, faça login primeiro.");
        setTimeout(() => {
          alertShown = false;
        }, 1000);
      }
      
      // Restaura os atributos após um pequeno delay
      setTimeout(() => {
        if (originalToggle) btnNew.setAttribute("data-bs-toggle", originalToggle);
        if (originalTarget) btnNew.setAttribute("data-bs-target", originalTarget);
      }, 200);
      
      return false;
    }
  }, true); // Usa capture phase para interceptar antes do Bootstrap
}

// Previne abertura do modal via evento do Bootstrap se o usuário não estiver logado
// Este listener só será acionado se o primeiro não conseguir prevenir completamente
if (newPostModal) {
  newPostModal.addEventListener("show.bs.modal", (event) => {
    const user = getUsuarioCorrente();
    if (!user || !user.id) {
      event.preventDefault();
      event.stopImmediatePropagation();
      
      // Só mostra alerta se o primeiro não foi mostrado
      if (!alertShown) {
        alertShown = true;
        alert("Você precisa estar logado para iniciar uma nova discussão. Por favor, faça login primeiro.");
        setTimeout(() => {
          alertShown = false;
        }, 1000);
      }
      
      return false;
    }
  });
}

// ===================== PAGINAÇÃO =====================
function createPagination(totalItems) {
  // Remove paginação existente
  const existingPagination = document.querySelector('.pagination-container');
  if (existingPagination) {
    existingPagination.remove();
  }
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return; // Não mostra paginação se houver apenas 1 página
  
  // Cria container de paginação
  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'pagination-container';
  paginationContainer.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1.5rem; flex-wrap: wrap;';
  
  // Botão anterior
  const prevButton = document.createElement('button');
  prevButton.className = 'pagination-btn';
  prevButton.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage(currentPage);
      updatePaginationState();
    }
  });
  paginationContainer.appendChild(prevButton);
  
  // Botões de página
  const pagesContainer = document.createElement('div');
  pagesContainer.className = 'pagination-pages';
  pagesContainer.style.cssText = 'display: flex; gap: 0.5rem; flex-wrap: wrap;';
  
  // Calcula quais páginas mostrar (máximo 5 botões visíveis)
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  
  // Ajusta para sempre mostrar 5 botões quando possível
  if (endPage - startPage < 4) {
    if (startPage === 1) {
      endPage = Math.min(totalPages, startPage + 4);
    } else if (endPage === totalPages) {
      startPage = Math.max(1, endPage - 4);
    }
  }
  
  // Botão primeira página
  if (startPage > 1) {
    const firstBtn = createPageButton(1, totalPages);
    pagesContainer.appendChild(firstBtn);
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      ellipsis.style.cssText = 'padding: 0.5rem; color: var(--text-secondary);';
      pagesContainer.appendChild(ellipsis);
    }
  }
  
  // Botões de páginas
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = createPageButton(i, totalPages);
    pagesContainer.appendChild(pageBtn);
  }
  
  // Botão última página
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      ellipsis.style.cssText = 'padding: 0.5rem; color: var(--text-secondary);';
      pagesContainer.appendChild(ellipsis);
    }
    const lastBtn = createPageButton(totalPages, totalPages);
    pagesContainer.appendChild(lastBtn);
  }
  
  paginationContainer.appendChild(pagesContainer);
  
  // Botão próximo
  const nextButton = document.createElement('button');
  nextButton.className = 'pagination-btn';
  nextButton.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPage(currentPage);
      updatePaginationState();
    }
  });
  paginationContainer.appendChild(nextButton);
  
  // Insere após o container de cards
  if (cardsEl && cardsEl.parentNode) {
    cardsEl.parentNode.insertBefore(paginationContainer, cardsEl.nextSibling);
  }
  
  // Salva referências para atualização
  window.paginationElements = {
    prevButton,
    nextButton,
    pagesContainer,
    container: paginationContainer,
    totalPages
  };
}

// Função para criar botão de página
function createPageButton(pageNum, totalPages) {
  const button = document.createElement('button');
  button.className = 'pagination-page-btn';
  button.textContent = pageNum;
  button.dataset.page = pageNum;
  
  if (pageNum === currentPage) {
    button.classList.add('active');
  }
  
  button.addEventListener('click', () => {
    if (pageNum !== currentPage) {
      currentPage = pageNum;
      renderPage(currentPage);
      updatePaginationState();
    }
  });
  
  return button;
}

// Atualiza estado da paginação
function updatePaginationState() {
  if (!window.paginationElements) return;
  
  const { prevButton, nextButton, pagesContainer, totalPages } = window.paginationElements;
  
  // Atualiza botões anterior/próximo
  if (prevButton) prevButton.disabled = currentPage === 1;
  if (nextButton) nextButton.disabled = currentPage === totalPages;
  
  // Atualiza botões de página
  const pageButtons = pagesContainer.querySelectorAll('.pagination-page-btn');
  pageButtons.forEach(btn => {
    const pageNum = parseInt(btn.dataset.page);
    if (pageNum === currentPage) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// ===================== NAVEGAÇÃO PARA POST ESPECÍFICO =====================
function handlePostNavigation(postId, category) {
  // Se houver uma categoria especificada e não estiver nela, muda para ela
  if (category && category !== "todas" && currentCategory !== category) {
    const categoryItem = document.querySelector(`.cat-item[data-cat="${category}"]`);
    if (categoryItem) {
      categoryItem.click();
      // Aguarda renderização e faz scroll
      setTimeout(() => scrollToPost(postId), 500);
      return;
    }
  }
  
  // Faz scroll até o post
  scrollToPost(postId);
}

function scrollToPost(postId) {
  // Aguarda os posts serem renderizados
  setTimeout(() => {
    const postCard = document.querySelector(`.card[data-id="${postId}"]`);
    if (postCard) {
      // Se o post não estiver na página atual, navega para a página correta
      const postIndex = allPosts.findIndex(p => String(p.id) === String(postId));
      if (postIndex >= 0) {
        const targetPage = Math.floor(postIndex / itemsPerPage) + 1;
        if (targetPage !== currentPage) {
          currentPage = targetPage;
          renderPage(currentPage);
          // Aguarda renderização e tenta novamente
          setTimeout(() => scrollToPost(postId), 300);
          return;
        }
      }
      
      // Faz scroll até o card
      postCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Adiciona um destaque visual temporário
      postCard.style.transition = 'all 0.3s ease';
      postCard.style.boxShadow = '0 0 0 4px rgba(193, 18, 31, 0.3)';
      postCard.style.transform = 'scale(1.02)';
      
      setTimeout(() => {
        postCard.style.boxShadow = '';
        postCard.style.transform = '';
      }, 2000);
    }
  }, 300);
}

// ===================== INICIALIZAÇÃO =====================
loadPosts();
updateSidebarProfile();
