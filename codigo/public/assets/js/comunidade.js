/* Comunidade — votar e VOLTAR voto (toggle)
   - Persiste votos por post em localStorage
   - Funciona com cards estáticos do HTML ou gerados via <template>
*/

const MAX_FOR_PROGRESS = 50;
const votedKey = "fiscaliza.community.voted";
let currentCategory = "todas";

// Dados de exemplo (só usados quando há <template>)
let POSTS = [
  { id:"p1", author:"Joãozinho da Silva", avatarLetter:"J", createdAt:hoursAgo(2),  title:"Buraco na rua X", excerpt:"Olá, pessoal! ...", category:"transito",     votes:25 },
  { id:"p2", author:"Fernanda Lima",      avatarLetter:"F", createdAt:hoursAgo(4),  title:"Poste de Luz ...",    excerpt:"Boa tarde! ...", category:"sugestoes",    votes:12 },
  { id:"p3", author:"Camila rocha",       avatarLetter:"C", createdAt:hoursAgo(8),  title:"Atenção, Lixo ...",   excerpt:"Pessoal, ...",  category:"meio_ambiente", votes:14 },
  { id:"p4", author:"Rafael Santos",      avatarLetter:"R", createdAt:hoursAgo(12), title:"Calçada Perigosa ...",excerpt:"Olá a todos! ...",category:"sugestoes",    votes:22 },
];

const els = {
  cards: document.getElementById("cards"),
  cats: document.getElementById("cat-list"),
  cardTpl: document.getElementById("post-card-tpl"), // pode ser null
};

/* ========== Init ========== */
init();

function init(){
  wireCategoryClicks();
  renderCards();
  if(!els.cardTpl){
    // cards vieram prontos no HTML
    filterStaticCards();
    bindVotesOnStaticCards();
  }
}

/* ========== Render Dinâmico (com <template>) ========== */
function renderCards(){
  if(!els.cardTpl) return; // se não há template, não renderiza dinamicamente

  els.cards.innerHTML = "";
  const list = currentCategory === "todas"
    ? POSTS
    : POSTS.filter(p => p.category === currentCategory);

  const frag = document.createDocumentFragment();

  list.forEach(p => {
    const node = els.cardTpl.content.cloneNode(true);
    const article = node.querySelector(".card");
    article.dataset.id = p.id;
    article.dataset.category = p.category;

    node.querySelector(".avatar").textContent = p.avatarLetter || initial(p.author);
    node.querySelector(".author").textContent = p.author;
    node.querySelector(".timeago").textContent = timeago(p.createdAt);
    node.querySelector(".card__title").textContent = p.title;
    node.querySelector(".card__excerpt").textContent = p.excerpt;

    const btn = node.querySelector(".vote-btn");
    const votesEl = node.querySelector(".votes__count");
    const bar = node.querySelector(".progress__bar");

    votesEl.textContent = p.votes;
    updateBar(bar, p.votes);
    setBtnState(btn, hasVoted(p.id));

    btn.addEventListener("click", () => {
      const voted = hasVoted(p.id);
      const current = parseInt(votesEl.textContent || "0", 10);

      let next = current;
      if (voted) {
        next = Math.max(0, current - 1);
        unsetVoted(p.id);
      } else {
        next = current + 1;
        setVoted(p.id);
      }
      p.votes = next; // mantém estado em memória

      votesEl.textContent = String(next);
      updateBar(bar, next);
      setBtnState(btn, !voted);
    });

    frag.appendChild(node);
  });

  els.cards.appendChild(frag);
}

/* ========== Votos para cards ESTÁTICOS no HTML ========== */
function bindVotesOnStaticCards(){
  const cards = els.cards.querySelectorAll(".card");
  cards.forEach(card => {
    const id = card.dataset.id || Math.random().toString(36).slice(2,9);
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

/* ========== Categorias ========== */
function wireCategoryClicks(){
  if(!els.cats) return;
  els.cats.querySelectorAll(".cat-item").forEach(li=>{
    li.addEventListener("click", ()=>{
      els.cats.querySelectorAll(".cat-item").forEach(x=>x.classList.remove("is-active"));
      li.classList.add("is-active");
      currentCategory = li.dataset.cat || "todas";

      if(els.cardTpl) renderCards();
      else filterStaticCards();
    });
  });
}
function filterStaticCards(){
  els.cards.querySelectorAll(".card").forEach(card=>{
    const show = currentCategory === "todas" || card.dataset.category === currentCategory;
    card.style.display = show ? "" : "none";
  });
}

/* ========== UI helpers ========== */
function updateBar(el, votes){
  if(!el) return;
  const pct = Math.max(0, Math.min(100, (votes / MAX_FOR_PROGRESS) * 100));
  el.style.width = `${pct}%`;
}
function setBtnState(btn, voted){
  if(!btn) return;
  if(voted){
    btn.textContent = "Voltar voto";
    btn.classList.add("is-voted");
    btn.disabled = false; // nunca desabilita para permitir desfazer
  }else{
    btn.textContent = "Computar voto";
    btn.classList.remove("is-voted");
    btn.disabled = false;
  }
}

/* ========== Persistência ========== */
function getVotedSet(){
  return new Set(JSON.parse(localStorage.getItem(votedKey) || "[]"));
}
function saveVotedSet(set){
  localStorage.setItem(votedKey, JSON.stringify([...set]));
}
function hasVoted(id){
  return getVotedSet().has(id);
}
function setVoted(id){
  const s = getVotedSet(); s.add(id); saveVotedSet(s);
}
function unsetVoted(id){
  const s = getVotedSet(); s.delete(id); saveVotedSet(s);
}

/* ========== Utils ========== */
function hoursAgo(h){ const d=new Date(); d.setHours(d.getHours()-h); return d.toISOString(); }
function timeago(iso){
  const d=new Date(iso), diff=(Date.now()-d.getTime())/1000, h=Math.floor(diff/3600);
  if(h<1){ const m=Math.max(1,Math.floor(diff/60)); return `${m} min atrás`; }
  return `${h}h atrás`;
}
function initial(name=""){ return name.trim().charAt(0).toUpperCase() || "?"; }

/* ====== NOVA DISCUSSÃO (Bootstrap + json-server) ====== */
(() => {
  const API = "http://localhost:3000/api"; // ajuste se usar outra porta
  const form = document.getElementById("new-post-form");
  const modalEl = document.getElementById("newPostModal");
  if (!form || !modalEl) return;

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const fd = new FormData(form);
    const title = (fd.get("title") || "").toString().trim();
    const category = (fd.get("category") || "todas").toString();
    const body = (fd.get("body") || "").toString().trim();

    if (!title || !body) return;

    // tenta pegar o nome exibido no topo: "Olá, Joãozinho"
    const greet = document.getElementById("name-user-lg")?.textContent || "";
    const author = greet.replace(/^Olá,\s*/i, "").trim() || "Cidadão";
    const avatarLetter = author.charAt(0).toUpperCase() || "C";

    // objeto do post
    const newPost = {
      author,
      avatarLetter,
      createdAt: new Date().toISOString(),
      title,
      excerpt: body,
      category,
      votes: 0
    };

    try {
      // envia para o json-server
      const res = await fetch(`${API}/comunidade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPost)
      });
      if (!res.ok) throw new Error("Falha ao criar post");
      const created = await res.json();

      // insere no DOM no topo da lista
      prependCard(created);

      // fecha e limpa modal
      bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      form.reset();

      // garante que o usuário enxergue o novo post (troca categoria se necessário)
      if (category !== "todas") setActiveCategory(category);

    } catch (err) {
      console.error(err);
      // fallback local (sem servidor rodando)
      const created = { id: "p" + Math.random().toString(36).slice(2, 9), ...newPost };
      prependCard(created);
      bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      form.reset();
      if (category !== "todas") setActiveCategory(category);
      alert("Não consegui falar com o servidor. O post foi adicionado localmente.");
    }
  });

  /* ==== helpers ==== */
  function prependCard(p) {
    const cards = document.getElementById("cards");
    if (!cards) return;

    const article = document.createElement("article");
    article.className = "card";
    article.dataset.id = p.id;
    article.dataset.category = p.category;

    article.innerHTML = `
      <header class="card__header">
        <div class="avatar" aria-hidden="true">${(p.avatarLetter || "?")}</div>
        <div class="card__author">
          <strong class="author">${escapeHTML(p.author || "Cidadão")}</strong>
          <small class="timeago">agora</small>
        </div>
      </header>

      <h3 class="card__title">${escapeHTML(p.title)}</h3>
      <p class="card__excerpt">${escapeHTML(p.excerpt)}</p>

      <div class="progress" aria-label="Apoio da comunidade">
        <div class="progress__bar" style="width:0%"></div>
      </div>

      <footer class="card__footer">
        <button class="btn btn--outline vote-btn">Computar voto</button>
        <div class="votes">
          <span class="dot" aria-hidden="true">●</span>
          <span class="votes__count">0</span> <span class="votes__label">Votos</span>
        </div>
      </footer>
    `;

    cards.insertBefore(article, cards.firstChild);

    // se você já tem lógica de voto/voltar voto, reaproveite:
    wireVote(article);
  }

  // liga o botão de voto do card recém-criado
  function wireVote(article) {
    const btn = article.querySelector(".vote-btn");
    const votesEl = article.querySelector(".votes__count");
    const bar = article.querySelector(".progress__bar");

    if (!btn || !votesEl || !bar) return;

    const MAX_FOR_PROGRESS = 50;
    const votedKey = "fiscaliza.community.voted";

    const hasVoted = (id) => new Set(JSON.parse(localStorage.getItem(votedKey) || "[]")).has(id);
    const setVoted = (id) => {
      const s = new Set(JSON.parse(localStorage.getItem(votedKey) || "[]"));
      s.add(id); localStorage.setItem(votedKey, JSON.stringify([...s]));
    };
    const unsetVoted = (id) => {
      const s = new Set(JSON.parse(localStorage.getItem(votedKey) || "[]"));
      s.delete(id); localStorage.setItem(votedKey, JSON.stringify([...s]));
    };
    const updateBar = (n) => {
      const pct = Math.max(0, Math.min(100, (n / MAX_FOR_PROGRESS) * 100));
      bar.style.width = `${pct}%`;
    };
    const setBtnState = (voted) => {
      btn.textContent = voted ? "Voltar voto" : "Computar voto";
      btn.classList.toggle("is-voted", voted);
    };

    const id = article.dataset.id;
    setBtnState(hasVoted(id));
    updateBar(parseInt(votesEl.textContent || "0", 10));

    btn.addEventListener("click", async () => {
      const voted = hasVoted(id);
      let next = parseInt(votesEl.textContent || "0", 10) + (voted ? -1 : +1);
      next = Math.max(0, next);

      // tenta refletir no json-server (se existir)
      try {
        const get = await fetch(`${API}/comunidade/${id}`);
        if (get.ok) {
          const cur = await get.json();
          const patch = await fetch(`${API}/comunidade/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ votes: next })
          });
          if (!patch.ok) throw 0;
        }
      } catch (_e) { /* ok: segue local */ }

      votesEl.textContent = String(next);
      updateBar(next);
      voted ? unsetVoted(id) : setVoted(id);
      setBtnState(!voted);
    });
  }

  function setActiveCategory(cat) {
    const list = document.getElementById("cat-list");
    if (!list) return;
    list.querySelectorAll(".cat-item").forEach(li => {
      li.classList.toggle("is-active", li.dataset.cat === cat);
    });
    document.querySelectorAll("#cards .card").forEach(card => {
      card.style.display = (cat === "todas" || card.dataset.category === cat) ? "" : "none";
    });
  }

  function escapeHTML(str) {
    return (str || "").replace(/[&<>"']/g, m => (
      { "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]
    ));
  }
})();

