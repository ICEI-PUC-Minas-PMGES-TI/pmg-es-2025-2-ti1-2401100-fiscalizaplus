// comunidade.js - versão integrada com JSON Server (rota /comunidade)
// - Carrega os posts do json-server
// - Permite votar (com toggle) e atualizar no servidor
// - Cadastra novas discussões via modal Bootstrap

const API_BASE = window.FP_API_BASE || "http://localhost:3000";
const COMUNIDADE_ENDPOINT = `${API_BASE}/comunidade`;
const MAX_FOR_PROGRESS = 50;

let currentCategory = "todas";
let POSTS = [];         // sempre virá do servidor
const votedInSession = new Set(); // controla votos só na sessão

const els = {
  cards: document.getElementById("cards"),
  cats: document.getElementById("cat-list"),
  cardTpl: document.getElementById("post-card-tpl"), // <template> do card
};

// Função para verificar se há usuário logado
function getUsuarioCorrente() {
  try {
    // Verifica se é visitante (entrou sem login)
    const isGuest = sessionStorage.getItem('isGuest') === 'true';
    if (isGuest) {
      return null; // Retorna null para visitante
    }
    
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

// ========== Init ==========
init();

async function init() {
  wireCategoryClicks();
  
  // Bloqueia criação de mensagens se não houver login
  const btnNew = document.getElementById('btn-new');
  const newPostForm = document.getElementById('new-post-form');
  
  if (btnNew) {
    btnNew.addEventListener('click', function(e) {
      const user = getUsuarioCorrente();
      if (!user || !user.id) {
        e.preventDefault();
        e.stopPropagation();
        // Só mostra mensagem, não redireciona
        alert('Você precisa estar registrado para criar uma nova discussão. Por favor, registre-se primeiro.');
        return false;
      }
    });
  }
  
  if (newPostForm) {
    newPostForm.addEventListener('submit', function(e) {
      const user = getUsuarioCorrente();
      if (!user || !user.id) {
        e.preventDefault();
        e.stopPropagation();
        // Só mostra mensagem, não redireciona
        alert('Você precisa estar registrado para criar uma nova discussão. Por favor, registre-se primeiro.');
        // Fecha o modal
        const modalEl = document.getElementById('newPostModal');
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }
        return false;
      }
    });
  }

  if (els.cardTpl && els.cards) {
    // Comunidade dinâmica vinda do servidor
    await loadPostsFromServer();
  } else {
    // Fallback: cards já prontos no HTML
    filterStaticCards();
    bindVotesOnStaticCards();
  }
}

// ========== Carregar posts do JSON Server ==========
async function loadPostsFromServer() {
  try {
    const res = await fetch(`${COMUNIDADE_ENDPOINT}?_sort=createdAt&_order=desc`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    POSTS = await res.json();
  } catch (err) {
    console.error("[Comunidade] Falha ao buscar posts do json-server:", err);
    POSTS = []; // vazio, sem mock local
  }

  renderCards();
}

// ========== Renderização dos cards ==========
function renderCards() {
  if (!els.cards || !els.cardTpl) return;

  els.cards.innerHTML = "";

  const list =
    currentCategory === "todas"
      ? POSTS
      : POSTS.filter((p) => p.category === currentCategory);

  const frag = document.createDocumentFragment();

  list.forEach((p) => {
    const node = els.cardTpl.content.cloneNode(true);
    const article = node.querySelector(".card");
    article.dataset.id = p.id;
    article.dataset.category = p.category || "todas";

    node.querySelector(".avatar").textContent = initial(p.author);
    node.querySelector(".author").textContent = p.author || "Cidadão";
    node.querySelector(".timeago").textContent = timeago(p.createdAt);
    node.querySelector(".card__title").textContent = p.title || "";
    node.querySelector(".card__excerpt").textContent =
      p.excerpt || p.body || "";

    const btn = node.querySelector(".vote-btn");
    const votesEl = node.querySelector(".votes__count");
    const bar = node.querySelector(".progress__bar");

    const startVotes = parseInt(p.votes ?? 0, 10) || 0;
    votesEl.textContent = startVotes;
    updateBar(bar, startVotes);
    setBtnState(btn, hasVoted(p.id));

    btn.addEventListener("click", () =>
      handleVoteClick(article, btn, votesEl, bar)
    );

    frag.appendChild(node);
  });

  els.cards.appendChild(frag);
}

// ========== Votos (cards dinâmicos) ==========
async function handleVoteClick(article, btn, votesEl, bar) {
  const id = article.dataset.id;
  const voted = hasVoted(id);
  let next = parseInt(votesEl.textContent || "0", 10) + (voted ? -1 : +1);
  next = Math.max(0, next);

  // atualiza UI imediatamente
  votesEl.textContent = String(next);
  updateBar(bar, next);
  voted ? unsetVoted(id) : setVoted(id);
  setBtnState(btn, !voted);

  // tenta refletir no servidor (PATCH /comunidade/:id)
  try {
    await fetch(`${COMUNIDADE_ENDPOINT}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ votes: next }),
    });
  } catch (err) {
    console.warn("[Comunidade] Não foi possível atualizar votos no servidor:", err);
  }
}

// ========== Votos para cards ESTÁTICOS no HTML ==========
function bindVotesOnStaticCards() {
  const cards = els.cards?.querySelectorAll(".card") || [];
  cards.forEach((card) => {
    const id = card.dataset.id || Math.random().toString(36).slice(2, 9);
    const btn = card.querySelector(".vote-btn");
    const votesEl = card.querySelector(".votes__count");
    const bar = card.querySelector(".progress__bar");

    const start = parseInt(votesEl?.textContent || "0", 10);
    updateBar(bar, start);
    setBtnState(btn, hasVoted(id));

    btn?.addEventListener("click", () => {
      const voted = hasVoted(id);
      const current = parseInt(votesEl.textContent || "0", 10);
      const next = voted ? Math.max(0, current - 1) : current + 1;

      votesEl.textContent = String(next);
      updateBar(bar, next);

      voted ? unsetVoted(id) : setVoted(id);
      setBtnState(btn, !voted);
    });
  });
}

// ========== Filtro por categoria (cards estáticos) ==========
function filterStaticCards() {
  els.cards
    ?.querySelectorAll(".card")
    .forEach((card) => {
      const show =
        currentCategory === "todas" ||
        card.dataset.category === currentCategory;
      card.style.display = show ? "" : "none";
    });
}

// ========== UI helpers ==========
function updateBar(el, votes) {
  if (!el) return;
  const pct = Math.max(0, Math.min(100, (votes / MAX_FOR_PROGRESS) * 100));
  el.style.width = `${pct}%`;
}

function setBtnState(btn, voted) {
  if (!btn) return;
  btn.textContent = voted ? "Voltar voto" : "Computar voto";
  btn.classList.toggle("is-voted", voted);
}

// ========== Votos em memória (sem localStorage) ==========
function hasVoted(id) {
  return votedInSession.has(String(id));
}
function setVoted(id) {
  votedInSession.add(String(id));
}
function unsetVoted(id) {
  votedInSession.delete(String(id));
}

// ========== Categorias ==========
function wireCategoryClicks() {
  if (!els.cats) return;

  els.cats.addEventListener("click", (ev) => {
    const li = ev.target.closest("[data-cat]");
    if (!li) return;

    currentCategory = li.dataset.cat || "todas";

    if (els.cardTpl) {
      renderCards();
    } else {
      filterStaticCards();
    }

    els.cats.querySelectorAll("[data-cat]").forEach((el) => {
      el.classList.toggle("is-active", el === li);
    });
  });
}

// ========== Utilitários ==========
function timeago(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  const h = Math.floor(diff / 3600);
  if (h < 1) {
    const m = Math.max(1, Math.floor(diff / 60));
    return `${m} min atrás`;
  }
  return `${h}h atrás`;
}

function initial(name = "") {
  return name.trim().charAt(0).toUpperCase() || "?";
}

// ========== NOVA DISCUSSÃO (Bootstrap + JSON Server) ==========
(() => {
  const form = document.getElementById("new-post-form");
  const modalEl = document.getElementById("newPostModal");
  if (!form || !modalEl) return;

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    
    // Verifica se há usuário logado
    const user = getUsuarioCorrente();
    if (!user || !user.id) {
      // Só mostra mensagem, não redireciona
      alert('Você precisa estar registrado para criar uma nova discussão. Por favor, registre-se primeiro.');
      // Fecha o modal
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      return;
    }

    const fd = new FormData(form);
    const title = (fd.get("title") || "").toString().trim();
    const category = (fd.get("category") || "todas").toString();
    const body = (fd.get("body") || "").toString().trim();

    if (!title || !body) return;

    // aqui você pode depois trocar pelo usuário logado
    const author = "Cidadão Anônimo";
    const createdAt = new Date().toISOString();

    const newPost = {
      author,
      createdAt,
      title,
      excerpt: body,
      category,
      votes: 0,
    };

    try {
      const res = await fetch(COMUNIDADE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPost),
      });
      if (!res.ok) throw new Error("Falha ao criar post");

      const created = await res.json();

      // adiciona ao array em memória e re-renderiza
      POSTS.unshift(created);
      renderCards();

      bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      form.reset();

      // garante que o usuário veja o post
      currentCategory = category || "todas";
    } catch (err) {
      console.error("[Comunidade] Erro ao criar post:", err);
      alert("Não consegui falar com o servidor. Verifique se o json-server está rodando.");
    }
  });
})();
