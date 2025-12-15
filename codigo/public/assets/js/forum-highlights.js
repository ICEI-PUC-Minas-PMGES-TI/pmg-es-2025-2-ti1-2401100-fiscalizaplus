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
    `${window.location.origin}/api`,
    `${window.location.origin}`
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
      // Busca todos os posts (sem limite para filtrar por semana)
      const res = await fetch(`${base}${path}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const allPosts = await res.json();
      
      // Filtra posts da última semana (7 dias)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const postsFromWeek = allPosts.filter(post => {
        const postDate = new Date(post.createdAt || post.created_at || 0);
        return postDate >= oneWeekAgo;
      });
      
      // Ordena por votos (mais votado primeiro) e limita a 5
      const topPosts = postsFromWeek
        .sort((a, b) => {
          const votesA = Number(a.votes || 0);
          const votesB = Number(b.votes || 0);
          return votesB - votesA; // Ordem decrescente
        })
        .slice(0, 5);
      
      render(topPosts, base, path);
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
      // Determina o caminho relativo correto baseado na localização atual
      const communityPath = window.location.pathname.includes('modulos/painel-cidadao') 
        ? 'comunidade/comunidade.html' 
        : 'modulos/painel-cidadao/comunidade/comunidade.html';
      
      root.innerHTML = `
        <div class="text-muted small">Nenhum tópico encontrado.</div>
        <div class="forum-mini__footer">
          <a href="${communityPath}">Abrir Comunidade →</a>
        </div>
      `;
      return;
    }

    // Determina o caminho relativo correto baseado na localização atual
    const communityPath = window.location.pathname.includes('modulos/painel-cidadao') 
      ? 'comunidade/comunidade.html' 
      : 'modulos/painel-cidadao/comunidade/comunidade.html';

    root.innerHTML = `
      <ul class="forum-mini__list">
        ${list.map(liHTML).join("")}
      </ul>
      <div class="forum-mini__footer">
        <a href="${communityPath}">Abrir Comunidade →</a>
      </div>
    `;

    // votes - carrega estado dos votos do localStorage
    root.querySelectorAll(".forum-mini__vote").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation(); // Previne que o clique no botão dispare o clique no item
        onVoteClick(ev, base, path);
      });
      const id = btn.closest(".forum-mini__item").dataset.id;
      // Verifica se o usuário já votou (usando localStorage)
      const hasVotedPost = hasVoted(id);
      setBtnState(btn, hasVotedPost);
    });

    // Adiciona evento de clique nos itens para navegar para a discussão
    root.querySelectorAll(".forum-mini__item").forEach((item) => {
      item.style.cursor = "pointer";
      item.addEventListener("click", (ev) => {
        // Não navega se o clique foi no botão de voto
        if (ev.target.closest(".forum-mini__vote")) {
          return;
        }
        const id = item.dataset.id;
        const category = item.dataset.category || "todas";
        // Determina o caminho relativo correto
        const communityPath = window.location.pathname.includes('modulos/painel-cidadao') 
          ? 'comunidade/comunidade.html' 
          : 'modulos/painel-cidadao/comunidade/comunidade.html';
        // Redireciona para a página de comunidade com o ID do post
        window.location.href = `${communityPath}?post=${id}&category=${category}`;
      });
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
      // Salva no localStorage para persistir entre páginas
      if (already) {
        unsetVoted(id);
      } else {
        setVoted(id);
      }
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
  // Usa localStorage para persistir votos entre páginas (compartilhado com comunidade.js)
  function hasVoted(id) {
    const key = `voted_${id}`;
    return localStorage.getItem(key) === 'true';
  }
  
  function setVoted(id) {
    const key = `voted_${id}`;
    localStorage.setItem(key, 'true');
  }
  
  function unsetVoted(id) {
    const key = `voted_${id}`;
    localStorage.removeItem(key);
  }

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

