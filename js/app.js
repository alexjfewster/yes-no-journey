// Yes/No Journey — client-side navigation and rendering
// Lightweight, accessible, mobile-first.
// Features: hash routing (#q=id), keyboard nav, settings, share, progress, graceful fallback.

// Immediately invoked to avoid globals
(() => {
  const questionsScript = document.getElementById('questions');
  if (!questionsScript) return;
  let model;
  try { model = JSON.parse(questionsScript.textContent); } catch (e) { console.error('Invalid questions JSON', e); return; }

  const qList = model.questions || [];
  const startId = model.start_id || (qList[0] && qList[0].id) || "1";

  // Map for quick lookup
  const qMap = new Map(qList.map(q => [q.id, q]));

  // Elements
  const pagesRoot = document.getElementById('pages');
  const canvas = document.getElementById('canvas');
  const pageTemplate = document.getElementById('page-template');
  const endTemplate = document.getElementById('end-template');
  const missingPage = document.getElementById('missing-page');
  const startCard = document.getElementById('start-card');

  // Settings UI
  const settingsBtn = document.getElementById('open-settings');
  const settingsPanel = document.getElementById('settings-panel');
  const closeSettingsBtn = document.getElementById('close-settings');
  const toggleAnimations = document.getElementById('toggle-animations');
  const toggleSound = document.getElementById('toggle-sound');
  const toggleCompact = document.getElementById('toggle-compact');
  const themeSelect = document.getElementById('theme-select');
  const resetProgress = document.getElementById('reset-progress');

  // Back nav
  const backBtn = document.getElementById('nav-back');

  // State
  let historyStack = []; // ids visited
  let currentId = null;

  // Respect prefers-reduced-motion initial value
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    document.body.setAttribute('data-animations','off');
    if (toggleAnimations) toggleAnimations.checked = false;
  } else {
    if (toggleAnimations) toggleAnimations.checked = true;
  }

  // Persist small preferences
  try {
    const prefs = JSON.parse(localStorage.getItem('ynj:prefs') || '{}');
    if (prefs.compact) {
      document.body.setAttribute('data-compact','on'); toggleCompact.checked = true;
    }
    if (prefs.animations === false) {
      document.body.setAttribute('data-animations','off'); toggleAnimations.checked = false;
    }
    if (prefs.theme) {
      document.body.className = `theme-${prefs.theme}`;
      themeSelect.value = prefs.theme;
    }
  } catch(e){}

  function savePrefs(){
    const prefs = {
      compact: document.body.getAttribute('data-compact') === 'on',
      animations: document.body.getAttribute('data-animations') === 'on',
      theme: (themeSelect && themeSelect.value) || 'default'
    };
    try { localStorage.setItem('ynj:prefs', JSON.stringify(prefs)); } catch(e){}
  }

  // Build pages from model
  function buildPages(){
    pagesRoot.innerHTML = '';
    qList.forEach((q, idx) => {
      const isEnd = !q.yes_target && !q.no_target;
      if (isEnd) {
        const node = endTemplate.content.cloneNode(true);
        const art = node.querySelector('article');
        art.id = `q-${q.id}`;
        const img = art.querySelector('.hero img');
        img.src = q.image;
        img.alt = q.alt || '';
        img.srcset = `${q.image} 600w`;
        art.querySelector('.question-title').textContent = q.question || '';
        art.querySelector('.result-summary').textContent = (q.meta && (q.meta.summary || q.meta.explanation)) || '';
        const tags = q.meta && q.meta.tags ? q.meta.tags.map(t => `#${t}`).join(' ') : '';
        art.querySelector('.meta-tags').textContent = tags;
        const restartBtn = art.querySelector('.restart');
        restartBtn.addEventListener('click', () => { navigateTo(startId, { replace: true }); });
        // share buttons
        const copyBtn = art.querySelector('.share-copy');
        copyBtn.addEventListener('click', () => copyLinkFor(q.id));
        const tweetBtn = art.querySelector('.share-tweet');
        tweetBtn.href = makeTweetLink(q);
        pagesRoot.appendChild(art);
      } else {
        const node = pageTemplate.content.cloneNode(true);
        const art = node.querySelector('article');
        art.id = `q-${q.id}`;
        const img = art.querySelector('.hero img');
        img.src = q.image;
        img.alt = q.alt || '';
        img.srcset = `${q.image} 600w`;
        art.querySelector('.question-title').textContent = q.question || '';
        art.querySelector('.explanation').textContent = (q.meta && q.meta.explanation) || '';
        // progress
        const label = art.querySelector('.progress-label');
        label.textContent = `Question ${idx+1} of ${qList.length}`;
        const dots = art.querySelector('.progress-dots');
        dots.innerHTML = '';
        for (let i=0;i<Math.min(6,qList.length);i++){
          const sp = document.createElement('span');
          if (i === Math.min(5, idx)) sp.classList.add('active');
          dots.appendChild(sp);
        }
        const yesBtn = art.querySelector('.btn-yes');
        const noBtn = art.querySelector('.btn-no');
        yesBtn.textContent = "Yes — let’s go";
        noBtn.textContent = "No — show me another";
        // Use anchor hrefs so links work with JS disabled (fragment navigation)
        yesBtn.setAttribute('href', `#q-${q.yes_target || 'missing'}`);
        noBtn.setAttribute('href', `#q-${q.no_target || 'missing'}`);
        // data attributes for analytics hooks
        yesBtn.dataset.qid = q.id; yesBtn.dataset.choice = 'yes';
        noBtn.dataset.qid = q.id; noBtn.dataset.choice = 'no';

        pagesRoot.appendChild(art);
      }
    });
  }

  // Create a tweet link for an end page
  function makeTweetLink(q){
    const text = encodeURIComponent(`${q.question} — My Yes/No Journey result`);
    const url = encodeURIComponent(location.origin + location.pathname + `#q-${q.id}`);
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  }

  function copyLinkFor(id){
    const url = location.origin + location.pathname + `#q-${id}`;
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(()=> {
        showToast('Link copied to clipboard');
      }, ()=> {
        fallbackCopy(url);
      });
    } else fallbackCopy(url);
  }
  function fallbackCopy(text){
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.left='-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast('Link copied to clipboard'); } catch(e){ showToast('Copy failed'); }
    document.body.removeChild(ta);
  }

  // Simple ephemeral toast
  function showToast(msg=''){
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    Object.assign(t.style, {
      position:'fixed', left:'50%', transform:'translateX(-50%)', bottom:'56px',
      background:'rgba(0,0,0,0.7)', color:'#fff', padding:'8px 12px', borderRadius:'999px', zIndex:9999
    });
    document.body.appendChild(t);
    setTimeout(()=> t.style.opacity='0.0', 1600);
    setTimeout(()=> t.remove(), 2600);
  }

  // Navigation: read hash and route
  function parseHash(){
    const h = decodeURIComponent(location.hash || '');
    if (h.startsWith('#q-')) return h.slice(3);
    return null;
  }

  function showMissing(){
    // hide other pages, show missing page
    hideAllPages();
    missingPage.hidden = false;
    missingPage.scrollIntoView({behavior:'smooth', block:'center'});
  }

  function hideAllPages(){
    // hide everything under pagesRoot and other templates
    missingPage.hidden = true;
    startCard.hidden = true;
    Array.from(pagesRoot.children).forEach(ch => ch.hidden = true);
  }

  function getPageElementFor(id){
    return document.getElementById(`q-${id}`);
  }

  function navigateTo(id, opts = {}){
    // opts.replace = true to replace history instead of push
    if (!id) { showMissing(); return; }
    const q = qMap.get(id);
    if (!q) { showMissing(); return; }

    const el = getPageElementFor(id);
    if (!el) { showMissing(); return; }

    // Animation settings
    const animations = document.body.getAttribute('data-animations') === 'on' && !(reduceMotion);

    hideAllPages();
    el.hidden = false;
    // Manage history stack
    if (!opts.replace) {
      if (currentId) historyStack.push(currentId);
    }
    currentId = id;

    // update fragment if needed
    const desiredHash = `#q-${id}`;
    if (location.hash !== desiredHash) {
      if (opts.replace) history.replaceState({id}, '', desiredHash);
      else location.hash = desiredHash;
    }

    // focus heading for screen readers
    const heading = el.querySelector('.question-title');
    if (heading) heading.setAttribute('tabindex','-1'), heading.focus();

    // optional subtle enter animation
    if (animations) {
      el.style.opacity = 0;
      el.style.transform = 'translateY(6px)';
      requestAnimationFrame(()=> {
        el.style.transition = 'opacity 230ms ease, transform 230ms ease';
        el.style.opacity = 1;
        el.style.transform = 'translateY(0)';
        setTimeout(()=> { el.style.transition=''; el.style.transform=''; }, 240);
      });
    } else {
      el.style.opacity = '';
    }
  }

  // Back navigation (chevron) or keyboard left
  function goBack(){
    if (historyStack.length > 0){
      const prev = historyStack.pop();
      navigateTo(prev, { replace: true });
    } else {
      // go to start
      navigateTo(startId, { replace: true });
    }
  }

  // Event delegation for choice clicks (so we can intercept and animate)
  pagesRoot.addEventListener('click', (ev) => {
    const a = ev.target.closest('a');
    if (!a) return;
    if (a.classList.contains('btn-yes') || a.classList.contains('btn-no')){
      // extract target id from href (#q-xxx) or data attribute
      ev.preventDefault();
      const href = a.getAttribute('href') || '';
      let target = null;
      if (href.startsWith('#q-')) target = href.slice(3);
      // if the target is 'q-missing' or empty -> missing
      if (!target || !qMap.has(target)) {
        showMissing();
      } else {
        // animate press (tiny bounce)
        if (document.body.getAttribute('data-animations') === 'on' && !reduceMotion) {
          a.animate([{transform:'scale(0.98)'},{transform:'scale(1)'}], {duration:180, easing:'cubic-bezier(.2,.8,.2,1)'});
        }
        // record analytics hooks via data attributes (no-op)
        // data-qid and data-choice exist as attributes for future analytics

        navigateTo(target);
      }
    }
  });

  // Back / start / missing buttons
  backBtn.addEventListener('click', (e) => { e.preventDefault(); goBack(); });
  document.getElementById('missing-back').addEventListener('click', (e) => { e.preventDefault(); goBack(); });
  document.getElementById('missing-restart').addEventListener('click', (e) => { e.preventDefault(); navigateTo(startId, { replace: true }); });

  // Hashchange handling (user navigated by anchor or browser history)
  window.addEventListener('hashchange', () => {
    const id = parseHash();
    if (!id) { // no hash -> show start
      hideAllPages(); startCard.hidden = false; currentId = null; return;
    }
    if (currentId !== id){
      // Do not push current onto historyStack here — handled in navigateTo
      navigateTo(id, { replace: true });
    }
  });

  // Keyboard navigation: left (back), right (proceed via yes), Enter on focused button
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); goBack(); }
    if (ev.key === 'ArrowRight') {
      // try to click the "Yes" button on current page
      if (currentId){
        const el = getPageElementFor(currentId);
        const yes = el && el.querySelector('.btn-yes');
        if (yes) { yes.click(); }
      } else {
        // start
        const start = document.querySelector('[data-start]');
        if (start) start.click();
      }
    }
  });

  // Settings toggles
  settingsBtn.addEventListener('click', (e) => {
    const open = settingsPanel.classList.toggle('open');
    settingsBtn.setAttribute('aria-expanded', String(open));
  });
  closeSettingsBtn.addEventListener('click', () => { settingsPanel.classList.remove('open'); settingsBtn.setAttribute('aria-expanded','false'); });

  toggleAnimations.addEventListener('change', () => {
    const on = toggleAnimations.checked;
    document.body.setAttribute('data-animations', on ? 'on' : 'off');
    savePrefs();
  });
  toggleCompact.addEventListener('change', () => {
    const on = toggleCompact.checked;
    document.body.setAttribute('data-compact', on ? 'on' : 'off');
    savePrefs();
  });
  themeSelect.addEventListener('change', () => {
    const v = themeSelect.value || 'default';
    document.body.className = `theme-${v}`;
    savePrefs();
  });
  resetProgress.addEventListener('click', () => {
    historyStack = []; navigateTo(startId, { replace: true });
  });

  // Build and initialize
  buildPages();

  // Append generated pages into DOM (they already appended)
  // Show start or hash target
  const initial = parseHash();
  if (initial && qMap.has(initial)) navigateTo(initial, { replace: true });
  else {
    // show start card (start visible)
    hideAllPages();
    startCard.hidden = false;
  }

  // Expose a small API for debugging from console (optional)
  window.YNJ = {
    model,
    navigateTo: (id) => navigateTo(id),
    getCurrent: () => currentId,
    qMap
  };

})();