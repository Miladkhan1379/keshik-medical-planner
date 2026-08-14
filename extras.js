(function(){
  const excluded=new Set();
  const history=[];
  let pending=null;

  const $=s=>document.querySelector(s);
  const esc=s=>{const d=document.createElement('div');d.textContent=s??'';return d.innerHTML;};
  const currentPeople=()=>{
    try{return (state?.people||[]).filter(p=>p && p.active!==false && String(p.name||'').trim());}
    catch(_e){return [];}
  };
  const randomIndex=n=>{
    if(n<=1)return 0;
    if(window.crypto?.getRandomValues){
      const max=Math.floor(0x100000000/n)*n;
      const a=new Uint32Array(1);let x;
      do{crypto.getRandomValues(a);x=a[0];}while(x>=max);
      return x%n;
    }
    return Math.floor(Math.random()*n);
  };
  const available=()=>currentPeople().filter(p=>!excluded.has(p.id));

  function syncSets(){
    const valid=new Set(currentPeople().map(p=>p.id));
    for(const id of [...excluded])if(!valid.has(id))excluded.delete(id);
    if(pending && !valid.has(pending.id))pending=null;
  }
  function renderHistory(){
    const box=$('#randomHistory');if(!box)return;
    if(!history.length){box.innerHTML='<div class="muted">هنوز قرعه‌ای انجام نشده.</div>';return;}
    box.innerHTML=history.map((h,i)=>`<div class="random-history-row"><span>${i+1}</span><b>${esc(h.name)}</b><span class="pill ${h.removed?'red':'gold'}">${h.removed?'از ادامه خارج شد':'در قرعه ماند'}</span></div>`).join('');
  }
  function render(){
    syncSets();
    const people=currentPeople(), left=available();
    const total=$('#randomTotal'),remain=$('#randomRemain'),winner=$('#randomWinner'),draw=$('#randomDrawBtn'),decision=$('#randomDecision');
    if(total)total.textContent=people.length;
    if(remain)remain.textContent=left.length;
    if(winner){
      if(pending)winner.innerHTML=`<span>اسم انتخاب‌شده</span><strong>${esc(pending.name)}</strong>`;
      else winner.innerHTML='<span>برای شروع روی «قرعه کن» بزن.</span>';
    }
    if(draw){draw.disabled=!!pending || !left.length;draw.textContent=!left.length?'اسمی نمانده':'قرعه کن';}
    if(decision)decision.classList.toggle('hidden',!pending);
    const demo=$('#randomDemoNote');if(demo)demo.classList.toggle('hidden',!state?.seededDemo);
    renderHistory();
  }
  function finalize(remove){
    if(!pending)return;
    if(remove)excluded.add(pending.id); else excluded.delete(pending.id);
    history.push({id:pending.id,name:pending.name,removed:remove});
    pending=null;render();
  }
  function draw(){
    syncSets();const pool=available();
    if(!pool.length){render();return;}
    pending=pool[randomIndex(pool.length)];render();
  }
  function reset(){excluded.clear();history.length=0;pending=null;render();}

  document.addEventListener('DOMContentLoaded',()=>{
    $('#randomDrawBtn')?.addEventListener('click',draw);
    $('#randomKeepBtn')?.addEventListener('click',()=>finalize(false));
    $('#randomRemoveBtn')?.addEventListener('click',()=>finalize(true));
    $('#randomResetBtn')?.addEventListener('click',reset);
    render();
  });
  window.KeshikExtras={render,reset};
})();
