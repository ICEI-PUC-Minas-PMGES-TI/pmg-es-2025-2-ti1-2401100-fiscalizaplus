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
