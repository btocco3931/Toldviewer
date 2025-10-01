(function(){
  const SELECTORS = [
    '[data-field="DepartureTime"] .value',
    '.dep-time',
    '#departure-time',
    '.departure-time',
    '[data-field="DepartureTime"]',
  ];

  function zeroPad(n){ return String(n).padStart(2,'0'); }

  function formatDuration(ms){
    const s = Math.floor(Math.abs(ms)/1000);
    const hh = Math.floor(s/3600);
    const mm = Math.floor((s%3600)/60);
    const ss = s%60;
    return `${zeroPad(hh)}:${zeroPad(mm)}:${zeroPad(ss)}`;
  }

  function findTargetEl(){
    // Try common selectors
    for(const sel of SELECTORS){
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // Fallback: look for a label "Departure Time" and grab the value next to it
    const all = Array.from(document.querySelectorAll('*, * *'));
    const label = all.find(n => /departure\s*time/i.test(n.textContent || ''));
    return label || null;
  }

  // Try to obtain the current card object from common globals or localStorage
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

  function parseDepUTC(card, targetEl){
    // Prefer Z time: e.g., "2001Z / 1601L"
    const dtStr = (card && card.DepartureTime) ? String(card.DepartureTime) : (targetEl ? String(targetEl.textContent||'') : '');
    const dateStr = card && card.Date ? String(card.Date) : '';

    // Parse date as MM/DD/YY -> yyyy-mm-dd
    let y=NaN,m=NaN,d=NaN;
    const mdy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (mdy){
      m = parseInt(mdy[1],10);
      d = parseInt(mdy[2],10);
      let yy = parseInt(mdy[3],10);
      if (yy < 100) yy = 2000 + yy; // assume 20xx
      y = yy;
    } else {
      // If date missing, use today's date in UTC
      const now = new Date();
      y = now.getUTCFullYear();
      m = now.getUTCMonth()+1;
      d = now.getUTCDate();
    }

    // Try Zulu first
    const z = dtStr.match(/(\d{4})Z/i);
    if (z){
      const hh = parseInt(z[1].slice(0,2),10);
      const mm = parseInt(z[1].slice(2),10);
      // Construct UTC date
      return new Date(Date.UTC(y, m-1, d, hh, mm, 0, 0));
    }
    // Fallback to local time if "####L"
    const l = dtStr.match(/(\d{4})L/i);
    if (l){
      const hh = parseInt(l[1].slice(0,2),10);
      const mm = parseInt(l[1].slice(2),10);
      return new Date(y, m-1, d, hh, mm, 0, 0); // local
    }
    return null;
  }

  function ensureBadge(targetEl){
    let badge = document.getElementById('dep-countdown');
    if (!badge){
      badge = document.createElement('span');
      badge.id = 'dep-countdown';
      badge.className = 'countdown';
      // place right after the target element’s text
      targetEl.appendChild(document.createTextNode(' '));
      targetEl.appendChild(badge);
    }
    return badge;
  }

  function render(diffMs, badge){
    const isNegative = diffMs < 0; // before departure -> negative
    badge.textContent = (isNegative ? '-' : '') + formatDuration(diffMs);
    badge.classList.toggle('negative', isNegative);
    badge.classList.toggle('positive', !isNegative);
  }

  function start(){
    const targetEl = findTargetEl();
    if (!targetEl) return;

    const card = getCard();
    const dep = parseDepUTC(card, targetEl);
    if (!dep) return;

    const badge = ensureBadge(targetEl);
    function tick(){
      const now = Date.now();
      const diffMs = dep.getTime() - now; // negative when in the past (i.e., before departure is negative)
      render(diffMs, badge);
    }
    tick();
    setInterval(tick, 1000);
  }

  // If you have a renderCard(card) in your app, hook into it
  if (typeof window.renderCard === 'function'){
    const orig = window.renderCard;
    window.renderCard = function(card){
      const ret = orig.apply(this, arguments);
      setTimeout(start, 0);
      return ret;
    };
  } else {
    // Otherwise, start once the DOM is ready
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }
})();
