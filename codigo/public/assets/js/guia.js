document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('guia-grid');
  const modalRoot = document.getElementById('guia-modal');
  // will hold denuncias loaded from the local DB (codigo/db/db.json)
  window._dbDenuncias = window._dbDenuncias || null;

  function createCard(item) {
    // container for card + expandable content
    const container = document.createElement('div');
    container.className = 'guia-item';

    const btn = document.createElement('button');
    btn.className = 'guia-card';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `
      <div class="guia-icon">${item.icon || '🗂️'}</div>
      <h3>${item.title}</h3>
      <p>${item.description}</p>
    `;

    const details = document.createElement('div');
    details.className = 'guia-details';
    details.setAttribute('aria-hidden', 'true');
    details.innerHTML = `
      <p class="guia-modal-desc">${item.longDescription || item.description}</p>
      <div class="guia-tips">
        <h4>Dicas para relatar</h4>
        <ol>${(item.tips || []).map(t => `<li>${t}</li>`).join('')}</ol>
      </div>
      <div class="guia-example" data-placeholder>
        <h4>Exemplo de denúncia</h4>
        <div class="guia-example-db">Carregando exemplo...</div>
      </div>
    `;

    // Toggle details in-place (accordion behavior: close others). When opening,
    // move the selected item to top and highlight it; when closing, restore order.
    btn.addEventListener('click', () => {
      const isOpen = details.classList.contains('open');
      if (isOpen) {
        // close this and restore original order
        closeDetails(details);
        btn.setAttribute('aria-expanded', 'false');
        // remove featured on this container
        container.classList.remove('featured');
        // restore original order by re-rendering items from stored data
        if (window._guiaItems) renderData({ items: window._guiaItems });
      } else {
        // close any other open details
        document.querySelectorAll('.guia-details.open').forEach(d => {
          closeDetails(d);
          const b = d.previousElementSibling;
          if (b && b.classList) b.setAttribute('aria-expanded', 'false');
        });

        // mark featured: remove existing featured
        document.querySelectorAll('.guia-item.featured').forEach(f => f.classList.remove('featured'));

        openDetails(details);
        btn.setAttribute('aria-expanded', 'true');
        // move the selected container to the top of the grid so it appears centered
        if (grid.firstChild !== container) grid.prepend(container);
        container.classList.add('featured');
        // scroll a bit so the featured item is centered in viewport
        setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
      }
    });

    container.appendChild(btn);
    container.appendChild(details);
    // attempt to populate example from DB (if already loaded)
    if (window._dbDenuncias) populateExampleFromDB(details, item);
    return container;
  }

  function openDetails(detailsEl) {
    detailsEl.classList.add('open');
    detailsEl.setAttribute('aria-hidden', 'false');
    // set max-height to scrollHeight for transition
    detailsEl.style.maxHeight = detailsEl.scrollHeight + 'px';
  }

  function closeDetails(detailsEl) {
    detailsEl.classList.remove('open');
    detailsEl.setAttribute('aria-hidden', 'true');
    // remove max-height to allow transition to 0
    detailsEl.style.maxHeight = '0px';
    // also collapse any images that might load later
  }

  // Populate the example area with a matching denuncia from the DB
  function populateExampleFromDB(detailsEl, item) {
    try {
      const container = detailsEl.querySelector('.guia-example-db');
      if (!container) return;
      const denuncias = window._dbDenuncias || [];

      // selection strategy by item.id
      let found = null;
      if (item.id === 'orgaos') {
        // prefer concluded with servidorResponsavelId
        found = denuncias.find(d => d.statusAtual && d.statusAtual.toLowerCase() === 'concluido' && d.servidorResponsavelId);
      } else if (item.id === 'tipos') {
        // try to find concluded 'limpeza' or any concluded
        found = denuncias.find(d => d.statusAtual && d.statusAtual.toLowerCase() === 'concluido' && d.tipoProblema && d.tipoProblema.toLowerCase().includes('limpeza')) || denuncias.find(d => d.statusAtual && d.statusAtual.toLowerCase() === 'concluido');
      } else if (item.id === 'comoFazer') {
        // any concluded example that shows full fluxo
        found = denuncias.find(d => d.statusAtual && d.statusAtual.toLowerCase() === 'concluido');
      } else if (item.id === 'direitos') {
        // a concluded case showing observacoesInternasServidor
        found = denuncias.find(d => d.statusAtual && d.statusAtual.toLowerCase() === 'concluido' && d.observacoesInternasServidor && d.observacoesInternasServidor.trim().length>0) || denuncias.find(d => d.statusAtual && d.statusAtual.toLowerCase() === 'concluido');
      }

      if (!found) {
        container.innerHTML = '<p class="small">Nenhum exemplo disponível no momento.</p>';
        return;
      }

      // build snippet: image, title, codigo, resumo
      const img = (found.imagens && found.imagens.length) ? `<img src="${found.imagens[0]}" alt="Exemplo: ${escapeHtml(found.titulo)}"/>` : '';
      const titulo = escapeHtml(found.titulo || 'Exemplo');
      const codigo = escapeHtml(found.codigoOcorrencia || '');
      const resumo = escapeHtml((found.descricaoCompleta || '').slice(0, 200));

      container.innerHTML = `
        <div class="guia-example-card">
          <div class="guia-example-media">${img}</div>
          <div class="guia-example-meta">
            <strong>${titulo}</strong>
            <div class="example-code">${codigo}</div>
            <p class="example-desc">${resumo}${(found.descricaoCompleta && found.descricaoCompleta.length>200)?'...':''}</p>
            <div class="guia-example-reason">${generateReasonHtml(item, found)}</div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error('Erro ao popular exemplo do DB', err);
    }
  }

  function generateReasonHtml(item, found) {
    const reasons = [];
    // status
    if (found.statusAtual) {
      reasons.push(`<strong>Status:</strong> ${escapeHtml(found.statusAtual)}.`);
    }
    // server responsible
    if (found.servidorResponsavelId) {
      reasons.push(`<strong>Atendimento:</strong> caso tratado por servidor (ID ${escapeHtml(found.servidorResponsavelId)}) e com observações internas.`);
    }
    // match by tipo for 'tipos' card
    if (item.id === 'tipos' && found.tipoProblema) {
      reasons.push(`<strong>Tipo:</strong> este exemplo é do tipo "${escapeHtml(found.tipoProblema)}", que ilustra bem a classificação mencionada.`);
    }
    // images and protocol for 'comoFazer'
    if (item.id === 'comoFazer') {
      if (found.imagens && found.imagens.length) reasons.push('<strong>Provas:</strong> contém imagens que ajudam na comprovação.');
      if (found.codigoOcorrencia) reasons.push(`<strong>Protocolo:</strong> número ${escapeHtml(found.codigoOcorrencia)} disponível para acompanhamento.`);
    }
    // internal observations for 'direitos'
    if (item.id === 'direitos' && found.observacoesInternasServidor) {
      reasons.push('<strong>Transparência:</strong> existem observações internas que mostram o andamento e providências tomadas.');
    }

    // fallback reason when none matched
    if (reasons.length === 0) {
      reasons.push('Este relato foi escolhido por ser um exemplo resolvido que ilustra o fluxo completo até a conclusão.');
    }

    return `<div>${reasons.map(r => `<p class="reason-line">${r}</p>`).join('')}</div>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Prefer a preloaded window.guiaData (works when page opened via file://). Fallback to fetch when available.
  function renderData(data) {
    // store original dataset for possible restoration
    window._guiaItems = (data.items || []).slice();
    grid.innerHTML = '';
    (data.items || []).forEach((item, idx) => {
      const c = createCard(item);
      // keep original index for stable ordering (not strictly required)
      c.setAttribute('data-original-index', idx);
      grid.appendChild(c);
    });
  }

  if (window.guiaData) {
    try {
      renderData(window.guiaData);
    } catch (err) {
      grid.innerHTML = `<div class="guia-error">Erro ao processar dados do guia: ${err.message}</div>`;
      console.error(err);
    }
  } else {
    // Fetch JSON data (path relative to this file when served from modulos/guia)
    fetch('../../assets/js/guiaData.json')
      .then(r => {
        if (!r.ok) throw new Error('Não foi possível carregar dados do guia');
        return r.json();
      })
      .then(data => renderData(data))
      .catch(err => {
        grid.innerHTML = `<div class="guia-error">Erro ao carregar conteúdo: ${err.message}</div>`;
        console.error(err);
      });
  }

  // load DB of denuncias (optional, used to fill examples). Path is relative to the page (modulos/guia)
  (function loadDb() {
    // If a public JS fallback set window._publicDenuncias (for file://), use it.
    if (window._publicDenuncias && Array.isArray(window._publicDenuncias)) {
      window._dbDenuncias = window._publicDenuncias.slice();
      document.querySelectorAll('.guia-details').forEach(detailsEl => {
        const prev = detailsEl.previousElementSibling;
        if (!prev) return;
        const titleEl = prev.querySelector('h3');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const item = (window._guiaItems || []).find(i => i.title === title);
        if (item) populateExampleFromDB(detailsEl, item);
      });
      return;
    }

    // otherwise try to fetch the public JSON file (works when served via HTTP)
    fetch('../../assets/js/denuncias_examples.json')
      .then(r => {
        if (!r.ok) throw new Error('Não foi possível carregar exemplos públicos');
        return r.json();
      })
      .then(data => {
        window._dbDenuncias = data || [];
        document.querySelectorAll('.guia-details').forEach(detailsEl => {
          const prev = detailsEl.previousElementSibling;
          if (!prev) return;
          const titleEl = prev.querySelector('h3');
          const title = titleEl ? titleEl.textContent.trim() : '';
          const item = (window._guiaItems || []).find(i => i.title === title);
          if (item) populateExampleFromDB(detailsEl, item);
        });
      })
      .catch(err => {
        console.warn('não foi possível carregar exemplos públicos para exemplos:', err.message);
      });
  })();
});
