(function(){
  let installPrompt=null;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid=/android/i.test(navigator.userAgent);
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
  const isNative=()=>!!(window.Capacitor && (window.Capacitor.isNativePlatform?.() || window.Capacitor.getPlatform?.()!=='web'));

  function setStatus(){
    const box=document.getElementById('mobileInstallStatus');
    const btn=document.getElementById('installPwaBtn');
    if(!box)return;
    if(isNative()){
      box.innerHTML='نسخه نصب‌شده گوشی در حال اجراست. اطلاعات برنامه روی همین دستگاه نگه‌داری می‌شود.';
      if(btn)btn.classList.add('hidden'); return;
    }
    if(isStandalone()){
      box.innerHTML='کشیک‌یار روی این گوشی نصب شده و مثل برنامه مستقل باز شده است.';
      if(btn)btn.classList.add('hidden'); return;
    }
    if(isIOS){
      box.innerHTML='در iPhone یا iPad با Safari باز کن، دکمه اشتراک‌گذاری را بزن و «Add to Home Screen / افزودن به صفحه اصلی» را انتخاب کن.';
      if(btn)btn.classList.add('hidden'); return;
    }
    if(isAndroid){
      box.innerHTML='در Android با Chrome باز کن. اگر دکمه «نصب روی گوشی» فعال شد همان را بزن؛ در غیر این صورت از منوی مرورگر گزینه Install app یا Add to Home screen را انتخاب کن.';
    } else {
      box.innerHTML='اگر مرورگرت نصب Web App را پشتیبانی کند، می‌توانی کشیک‌یار را مثل یک برنامه روی دستگاه نصب کنی.';
    }
  }

  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault(); installPrompt=e;
    const btn=document.getElementById('installPwaBtn');
    if(btn)btn.classList.remove('hidden');
  });
  window.addEventListener('appinstalled',()=>{installPrompt=null;setStatus();});
  document.addEventListener('DOMContentLoaded',()=>{
    const btn=document.getElementById('installPwaBtn');
    if(btn)btn.addEventListener('click',async()=>{
      if(!installPrompt){setStatus();return;}
      installPrompt.prompt();
      try{await installPrompt.userChoice;}catch(_e){}
      installPrompt=null;setStatus();
    });
    setStatus();
  });
})();
