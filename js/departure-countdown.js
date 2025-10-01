(function(){
  function zero(n){ return String(n).padStart(2,'0'); }
  function fmt(ms){
    const s = Math.floor(Math.abs(ms)/1000);
    const hh = Math.floor(s/3600);
    const mm = Math.floor((s%3600)/60);
    const ss = s%60;
    return `${zero(hh)}:${zero(mm)}:${zero(ss)}`;
  }

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

  function readDateAndTime(){
    const card = getCard();
    let dateStr = card && card.Date ? String(card.Date) : null;
    let depStr  = card && card.DepartureTime ? String(card.DepartureTime) : null;

    // Fallback: scrape from visible text if needed
    const root = document.querySelector('#results') || document.body;
    const text = (root && root.textContent) || '';

    if (!depStr){
      const mz = text.match(/\b(\d{4})Z\b/i) || text.match(/\b(\d{4})L\b/i);
      if (mz) depStr = mz[0];
    }
    if (!dateStr){
      const dm = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
      if (dm) dateStr = dm[0];
    }
    return { dateStr, depStr };
  }

  function parseDepUTC(dateStr, depStr){
    const now = new Date();
    let y = now.getUTCFullYear(), m = now.getUTCMonth()+1, d = now.getUTCDate();

    if (dateStr){
      const mdy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (mdy){
        m = parseInt(mdy[1],10);
        d = parseInt(mdy[2],10);
        let yy = parseInt(mdy[3],10);
        if (yy < 100) yy = 2000 + yy;
        y = yy;
      }
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
      return new Date(y, m-1, d, hh, mm, 0, 0); // device local
    }
    return null;
  }

  function update(){
    const el = document.getElementById('dep-countdown-fixed');
    if (!el) return;

    const { dateStr, depStr } = readDateAndTime();
    const dep = parseDepUTC(dateStr, depStr);

    if (!dep){
      el.textContent = '—:—:—';
      el.classList.remove('negative','positive');
      return;
    }

    // Neg before departure (green), pos after (red)
    const diff = Date.now() - dep.getTime();
    el.textContent = (diff < 0 ? '-' : '+') + fmt(diff);
    el.classList.toggle('negative', diff < 0);
    el.classList.toggle('positive', diff >= 0);
  }

  update();
  setInterval(update, 1000);
})();
