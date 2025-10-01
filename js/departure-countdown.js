(function(){
  // Config: results container selectors you likely have
  const RESULTS_SELECTORS = ['#results', '.screen#results', '.screen.results', '[data-screen="results"]'];

  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function findResultsRoot(){
    for (const s of RESULTS_SELECTORS){
      const el = $(s);
      if (el) return el;
    }
    // Fallback to body if we can't find a dedicated "results" screen
    return document.body;
  }

  function zero(n){ return String(n).padStart(2,'0'); }
  function fmt(ms){
    const s = Math.floor(Math.abs(ms)/1000);
    const hh = Math.floor(s/3600);
    const mm = Math.floor((s%3600)/60);
    const ss = s%60;
    return `${zero(hh)}:${zero(mm)}:${zero(ss)}`;
  }

  // Try to get the current card (for Date/DepartureTime) from common places
  function getCard(){
    if (window.currentCard) return window.currentCard;
    if (window.card) return window.card;
    if (window.CARD) return window.CARD;
    try {
      const ls = localStorage.getItem('lastCard');
      if (ls) return JSON.parse(ls);
    } catch(e){}
    return null;
  }

  // Pull Date + DepartureTime from either the object or the visible DOM text
  function readDateAndTime(root){
    const card = getCard();
    let dateStr = card && card.Date ? String(card.Date) : null;
    let depStr  = card && card.DepartureTime ? String(card.DepartureTime) : null;

    // If not available from the object, attempt to scrape from the results text
    const text = root.textContent || '';

    if (!depStr){
      // Look for Z first, then L
      const z = text.match(/\b(\d{4})Z\b/i);
      if (z) depStr = z[0];
      else {
        const l = text.match(/\b(\d{4})L\b/i);
        if (l) depStr = l[0];
      }
    }

    if (!dateStr){
      const mdy = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
      if (mdy) dateStr = mdy[0];
    }

    return { dateStr, depStr };
  }

  function parseDepUTC(dateStr, depStr){
    // Parse date as MM/DD/YY(YY)
    let y,m,d;
    if (dateStr){
      const mdy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (mdy){
        m = parseInt(mdy[1],10);
        d = parseInt(mdy[2],10);
        y = parseInt(mdy[3],10);
        if (y < 100) y = 2000 + y;
      }
    }
    if (!(y&&m&&d)){
      const now = new Date();
      y = now.getUTCFullYear(); m = now.getUTCMonth()+1; d = now.getUTCDate();
    }

    if (!depStr) return null;

    const z = depStr.match(/(\d{4})Z/i);
    if (z){
      const hh = parseInt(z[1].slice(0,2),10);
      const mm = parseInt(z[1].slice(2),10);
      return new Date(Date.UTC(y, m-1, d, hh, mm, 0, 0));
    }
    const l = depStr.match(/(\d{4})L/i);
    if (l){
      const hh = parseInt(l[1].slice(0,2),10);
      const mm = parseInt(l[1].slice(2),10);
      // Treat "L" as the device's local time zone (best-effort)
      return new Date(y, m-1, d, hh, mm, 0, 0);
    }
    return null;
  }

  function ensureBadgeNearTime(root){
    // Try to append badge immediately after the first visible ####Z or ####L occurrence.
    // We’ll search for a text node that contains it and inject a span after it.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let textNode = null, match = null;
    while(walker.nextNode()){
      const t = walker.currentNode.nodeValue;
      if (!t) continue;
      const m = t.match(/\b(\d{4})([ZL])\b/i);
      if (m){
        textNode = walker.currentNode;
        match = m;
        break;
      }
    }
    const existing = $('#dep-countdown');
    if (existing) return existing;

    const badge = document.createElement('span');
    badge.id = 'dep-countdown';
    badge.className = 'countdown';
    if (textNode){
      // Split the text node around the match to insert our badge right after it
      const idx = textNode.nodeValue.indexOf(match[0]) + match[0].length;
      const tail = textNode.splitText(idx);
      const space = document.createTextNode(' ');
      textNode.parentNode.insertBefore(space, tail);
      textNode.parentNode.insertBefore(badge, tail);
      return badge;
    } else {
      // Fallback: pin to top-right of results screen
      let fixed = $('#dep-countdown-fixed');
      if (!fixed){
        fixed = document.createElement('div');
        fixed.id = 'dep-countdown-fixed';
        fixed.innerHTML = '<span class="countdown" id="dep-countdown"></span>';
        root.appendChild(fixed);
      }
      return $('#dep-countdown', fixed);
    }
  }

  function setState(ms, badge){
    // We want negative BEFORE departure (green), positive AFTER (red).
    const neg = ms < 0;
    const sign = ms === 0 ? '' : (neg ? '-' : '+');
    badge.textContent = sign + fmt(ms);
    badge.classList.toggle('negative', neg);
    badge.classList.toggle('positive', !neg);
  }

  function start(){
    const root = findResultsRoot();
    if (!root) return;

    // Observe for when results are rendered/changed
    const boot = () => {
      const { dateStr, depStr } = readDateAndTime(root);
      const dep = parseDepUTC(dateStr, depStr);
      if (!dep) return; // Not enough info yet

      const badge = ensureBadgeNearTime(root);
      if (!badge) return;

      // Avoid multiple timers
      if (window.__depCountdownTimer) clearInterval(window.__depCountdownTimer);

      const tick = () => {
        // NOTE: We compute NOW - DEP so it's negative before departure (as requested)
        const diff = Date.now() - dep.getTime();
        setState(diff, badge);
      };
      tick();
      window.__depCountdownTimer = setInterval(tick, 1000);
    };

    // Kick once now, then observe mutations
    boot();

    const mo = new MutationObserver(() => boot());
    mo.observe(root, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
