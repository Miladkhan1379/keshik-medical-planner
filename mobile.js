(function(){
  let installPrompt=null;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid=/android/i.test(navigator.userAgent);
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
  const isNative=()=>!!(window.Capacitor && (window.Capacitor.isNativePlatform?.() || window.Capacitor.getPlatform?.()!=='web'));

  function cleanFileName(name){return String(name||'keshikyar-file').replace(/[\\/:*?\"<>|]+/g,'_');}
  function blobToBase64(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',')[1]||'');r.onerror=()=>reject(r.error||new Error('خواندن فایل ناموفق بود'));r.readAsDataURL(blob);});}

  window.KeshikNativeSave=async function(blob,name){
    if(!isNative())throw new Error('Not native');
    const register=window.Capacitor?.registerPlugin;
    const plugins=window.Capacitor?.Plugins||{};
    const Filesystem=register?register('Filesystem'):plugins.Filesystem;
    const Share=register?register('Share'):plugins.Share;
    if(!Filesystem)throw new Error('Filesystem plugin is not available');
    const safeName=cleanFileName(name);
    const data=await blobToBase64(blob);
    const written=await Filesystem.writeFile({path:safeName,data,directory:'CACHE',recursive:true});
    if(Share){await Share.share({title:'ذخیره فایل کشیک‌یار',text:'فایل خروجی کشیک‌یار',files:[written.uri],dialogTitle:'ذخیره یا ارسال فایل'});}
    else{alert('فایل ساخته شد. مسیر موقت فایل:\n'+written.uri);}
  };

  document.addEventListener('click',async e=>{
    const a=e.target.closest?.('a[download]');
    if(!a || !isNative())return;
    e.preventDefault();
    try{
      const res=await fetch(a.href);if(!res.ok)throw new Error('فایل پیدا نشد');
      const blob=await res.blob();
      const fallback=(a.getAttribute('href')||'file').split('/').pop()||'file';
      await window.KeshikNativeSave(blob,a.getAttribute('download')||fallback);
    }catch(err){console.error(err);alert('ذخیره فایل انجام نشد. یک‌بار برنامه را ببند و دوباره امتحان کن.');}
  });

  function setStatus(){
    const box=document.getElementById('mobileInstallStatus');const btn=document.getElementById('installPwaBtn');if(!box)return;
    if(isNative()){box.innerHTML='نسخه نصب‌شده گوشی در حال اجراست. خروجی Excel و فایل پشتیبان از پنجره ذخیره/اشتراک خود گوشی تحویل داده می‌شوند.';if(btn)btn.classList.add('hidden');return;}
    if(isStandalone()){box.innerHTML='کشیک‌یار روی این گوشی نصب شده و مثل برنامه مستقل باز شده است.';if(btn)btn.classList.add('hidden');return;}
    if(isIOS){box.innerHTML='در iPhone یا iPad با Safari باز کن، دکمه اشتراک‌گذاری را بزن و «Add to Home Screen / افزودن به صفحه اصلی» را انتخاب کن.';if(btn)btn.classList.add('hidden');return;}
    if(isAndroid){box.innerHTML='در Android با Chrome باز کن. اگر دکمه «نصب روی گوشی» فعال شد همان را بزن؛ در غیر این صورت از منوی مرورگر گزینه Install app یا Add to Home screen را انتخاب کن.';}
    else{box.innerHTML='اگر مرورگرت نصب Web App را پشتیبانی کند، می‌توانی کشیک‌یار را مثل یک برنامه روی دستگاه نصب کنی.';}
  }

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;const btn=document.getElementById('installPwaBtn');if(btn)btn.classList.remove('hidden');});
  window.addEventListener('appinstalled',()=>{installPrompt=null;setStatus();});
  document.addEventListener('DOMContentLoaded',()=>{const btn=document.getElementById('installPwaBtn');if(btn)btn.addEventListener('click',async()=>{if(!installPrompt){setStatus();return;}installPrompt.prompt();try{await installPrompt.userChoice;}catch(_e){}installPrompt=null;setStatus();});setStatus();});
})();
