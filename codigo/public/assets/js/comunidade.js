// codigo/public/assets/js/comunidade.js
const API_URL = "http://localhost:3000/comunidade";

let posts = [];
let currentCategory = "todas";

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
    renderPosts();
  } catch (err) {
    console.error(err);
    cardsEl.innerHTML = `
      <p class="mt-3 text-danger">
        Erro ao carregar discussões. Verifique se o <code>json-server</code>
        está rodando em <code>http://localhost:3000</code>.
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
    return;
  }

  // ordena por data (mais recente primeiro)
  const sorted = [...list].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  cardsEl.innerHTML = sorted.map(postToCardHtml).join("");
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
  const progressWidth = Math.min(votes * 3, 100); // só pra dar uma barra bonitinha

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
        <button class="btn btn--outline vote-btn" data-id="${p.id}">
          Computar voto
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
  if (!btn) return;

  const id = btn.dataset.id;
  const post = posts.find((p) => String(p.id) === String(id));
  if (!post) return;

  const newVotes = (post.votes || 0) + 1;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ votes: newVotes }),
    });

    if (!res.ok) {
      throw new Error("Erro ao computar voto: " + res.status);
    }

    post.votes = newVotes;
    renderPosts();
  } catch (err) {
    console.error(err);
    alert("Não foi possível computar o voto. Verifique o json-server.");
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

// ===================== INICIALIZAÇÃO =====================
loadPosts();
updateSidebarProfile();
