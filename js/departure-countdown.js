(function(){
  let timer = null;
  function zero(n){ return String(n).padStart(2,"0"); }
  function fmt(ms){
    const s = Math.floor(Math.abs(ms)/1000);
    const hh = Math.floor(s/3600);
    const mm = Math.floor((s%3600)/60);
    const ss = s%60;
    return `${zero(hh)}:${zero(mm)}:${zero(ss)}`;
  }
  function getCard(){
    if (window.currentCard) return window.currentCard;
    try{ const ls = localStorage.getItem("lastCard"); if(ls) return JSON.parse(ls);}catch(e){}
    return null;
  }
  function parseDep(card){
    if(!card || !card.Date || !card.DepartureTime) return null;
    const mdy = card.Date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if(!mdy) return null;
    let m=parseInt(mdy[1],10), d=parseInt(mdy[2],10), y=parseInt(mdy[3],10);
    if(y<100) y=2000+y;
    const depStr=String(card.DepartureTime);
    const z=depStr.match(/(\d{4})Z/i);
    if(z){ const hh=parseInt(z[1].slice(0,2),10), mm=parseInt(z[1].slice(2),10);
      return new Date(Date.UTC(y,m-1,d,hh,mm,0,0)); }
    const l=depStr.match(/(\d{4})L/i);
    if(l){ const hh=parseInt(l[1].slice(0,2),10), mm=parseInt(l[1].slice(2),10);
      return new Date(y,m-1,d,hh,mm,0,0); }
    return null;
  }
  function ensureEl(){
    const parent=document.querySelector("#results #Depaturetime");
    if(!parent) return null;
    let el=document.getElementById("dep-countdown");
    if(!el){
      el=document.createElement("div");
      el.id="dep-countdown";
      el.className="countdown";
      el.textContent="--:--:--";
      parent.insertAdjacentElement("afterend",el);
    }
    return el;
  }
  function tick(){
    const el=ensureEl(), card=getCard();
    if(!el||!card) return;
    const dep=parseDep(card);
    if(!dep){ el.textContent="--:--:--"; el.className="countdown"; return; }
    const diff=Date.now()-dep.getTime();
    el.textContent=(diff<0?"-":"+")+fmt(diff);
    el.className="countdown "+(diff<0?"negative":"positive");
  }
  function start(){
    if(timer) clearInterval(timer);
    tick();
    timer=setInterval(tick,1000);
  }
  const obs=new MutationObserver(()=>{
    const res=document.getElementById("results");
    if(res && res.style.display!=="none"){ start(); }
  });
  obs.observe(document.body,{childList:true,subtree:true,attributes:true});
})();