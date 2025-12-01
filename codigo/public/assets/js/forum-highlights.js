// /codigo/public/assets/js/forum-highlights.js
(() => {
  const root = document.getElementById("forum-highlights");
  if (!root) return;

  // 1) Skeleton
  root.innerHTML = `
    <div class="forum-mini__skeleton">
      <div class="forum-mini__sk"></div><div class="forum-mini__sk"></div><div class="forum-mini__sk"></div>
    </div>
  `;

  // 2) Bases e rotas candidatas
  const bases = [
    window.FP_API_BASE || "", // permite override: window.FP_API_BASE="http://localhost:3333"
    "http://localhost:3000/api",
    "http://127.0.0.1:3000/api",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ].filter(Boolean);

  const collections = ["/comunidade", "/posts"]; // com routes.json / sem routes.json

  (async function load() {
    const found = await findWorking();
    if (!found) {
      root.innerHTML = `
        <div class="text-muted small">Não foi possível carregar os tópicos (API offline ou rota incorreta).</div>
      `;
      console.warn("[Forum] Nenhum endpoint respondeu. Verifique json-server / rotas.");
      return;
    }

    const { base, path } = found;
    try {
      const res = await fetch(`${base}${path}?_sort=createdAt&_order=desc&_limit=5`, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const posts = await res.json();
      render(posts, base, path);
    } catch (err) {
      root.innerHTML = `
        <div class="text-muted small">Erro ao buscar tópicos: ${String(err)}</div>
      `;
      console.error("[Forum] Falha ao buscar posts:", err);
    }
  })();

  async function findWorking() {
    for (const base of bases) {
      for (const path of collections) {
        try {
          const test = await fetch(`${base}${path}?_limit=1`, { cache: "no-store" });
          if (test.ok) return { base, path };
        } catch { /* tenta próxima */ }
      }
    }
    return null;
  }

  function render(list, base, path) {
    root.setAttribute("aria-busy", "false");
    if (!Array.isArray(list) || list.length === 0) {
      root.innerHTML = `
        <div class="text-muted small">Nenhum tópico encontrado.</div>
        <div class="forum-mini__footer">
          <a href="/codigo/public/pages/comunidade/comunidade.html">Abrir Comunidade →</a>
        </div>
      `;
      return;
    }

    root.innerHTML = `
      <ul class="forum-mini__list">
        ${list.map(liHTML).join("")}
      </ul>
      <div class="forum-mini__footer">
        <a href="/codigo/public/pages/comunidade/comunidade.html">Abrir Comunidade →</a>
      </div>
    `;

    // votes
    root.querySelectorAll(".forum-mini__vote").forEach((btn) => {
      btn.addEventListener("click", (ev) => onVoteClick(ev, base, path));
      const id = btn.closest(".forum-mini__item").dataset.id;
      setBtnState(btn, hasVoted(id));
    });
  }

  // ----- UI itens -----
  function liHTML(p) {
    const votes = Number(p.votes || 0);
    const pct = Math.max(0, Math.min(100, (votes / 50) * 100));
    const letter = (p.avatarLetter || initial(p.author || "?"));
    return `
      <li class="forum-mini__item" data-id="${esc(p.id)}" data-category="${esc(p.category || "todas")}">
        <div class="forum-mini__avatar" aria-hidden="true">${esc(letter)}</div>
        <div class="forum-mini__meta">
          <strong>${esc(p.author || "Cidadão")}</strong>
          <small>${esc(timeago(p.createdAt || new Date().toISOString()))}</small>
          <span class="forum-mini__titlepost">${esc(p.title || "")}</span>
        </div>
        <div class="forum-mini__right">
          <button class="btn forum-mini__vote">Computar voto</button>
          <div class="forum-mini__votes"><span class="votes__count">${votes}</span> votos</div>
        </div>
        <div class="forum-mini__bar"><i style="width:${pct}%"></i></div>
      </li>
    `;
  }

  async function onVoteClick(ev, base, path) {
    const btn = ev.currentTarget;
    const item = btn.closest(".forum-mini__item");
    const id = item.dataset.id;
    const countEl = item.querySelector(".votes__count");
    const bar = item.querySelector(".forum-mini__bar > i");

    const current = parseInt(countEl.textContent || "0", 10);
    const already = hasVoted(id);
    const next = Math.max(0, current + (already ? -1 : +1));

    try {
      btn.disabled = true;
      // tenta PATCH; se 404/erro, apenas atualiza local
      const get = await fetch(`${base}${path}/${id}`);
      if (get.ok) {
        await fetch(`${base}${path}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ votes: next })
        });
      }
      countEl.textContent = String(next);
      bar.style.width = `${Math.max(0, Math.min(100, (next/50)*100))}%`;
      already ? unsetVoted(id) : setVoted(id);
      setBtnState(btn, !already);
    } catch (e) {
      console.error("[Forum] toggle vote falhou:", e);
      alert("Não consegui atualizar seu voto agora.");
    } finally {
      btn.disabled = false;
    }
  }

  function setBtnState(btn, voted) {
    btn.textContent = voted ? "Voltar voto" : "Computar voto";
    btn.classList.toggle("is-voted", voted);
  }

    // ----- helpers -----
  const votedInSession = new Set(); // controla votos só enquanto a aba estiver aberta

  function hasVoted(id){ return votedInSession.has(String(id)); }
  function setVoted(id){ votedInSession.add(String(id)); }
  function unsetVoted(id){ votedInSession.delete(String(id)); }

  function initial(n=""){ return n.trim().charAt(0).toUpperCase() || "?"; }
  function esc(s=""){ return String(s).replace(/[&<>"']/g, c => (
    { "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]
  )); }
  function timeago(iso){
    const d=new Date(iso), diff=(Date.now()-d.getTime())/1000, h=Math.floor(diff/3600);
    if(h<1){ const m=Math.max(1,Math.floor(diff/60)); return `${m} min atrás`; }
    return `${h}h atrás`;
  }
})();

