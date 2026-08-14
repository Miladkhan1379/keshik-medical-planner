// KeshikYar 1.1 - تکمیل بازه چندماهه و ابزارهای اختیاری
(function(){
  const oldDaysInMonth=daysInMonth, oldWeekdayForDay=weekdayForDay;
  const oldRenderPeople=renderPeople, oldRenderShifts=renderShifts;
  const oldBuildSolverInput=buildSolverInput;

  state.rangeMode=state.rangeMode||'month';
  state.rangeStart=state.rangeStart||{y:state.year||1405,m:state.month||1,d:1};
  state.rangeEnd=state.rangeEnd||{y:state.year||1405,m:state.month||1,d:Jalali.monthLength(state.year||1405,state.month||1)};
  state.tools={manualEdit:false,locking:false,explainEmpty:false,...(state.tools||{})};
  state.lockedAssignments=state.lockedAssignments||{};

  function pad(n){return String(n).padStart(2,'0');}
  function dkey(x){return `${x.y}/${pad(x.m)}/${pad(x.d)}`;}
  function cmpDate(a,b){return a.y-b.y||a.m-b.m||a.d-b.d;}
  function validDate(x){try{return x.y>=1&&x.m>=1&&x.m<=12&&x.d>=1&&x.d<=Jalali.monthLength(x.y,x.m);}catch(e){return false;}}
  function nextDate(x){let y=x.y,m=x.m,d=x.d+1;if(d>Jalali.monthLength(y,m)){d=1;m++;if(m>12){m=1;y++;}}return {y,m,d};}
  function buildDateEntries(){
    if(state.rangeMode!=='custom'){
      const n=state.calendarMode==='manual'?Math.max(28,Math.min(31,Number(state.manualDays||31))):Jalali.monthLength(state.year,state.month);
      return Array.from({length:n},(_,i)=>({index:i+1,y:state.year,m:state.month,d:i+1,key:`${state.year}/${pad(state.month)}/${pad(i+1)}`}));
    }
    let a={...state.rangeStart},b={...state.rangeEnd};
    if(!validDate(a)||!validDate(b)||cmpDate(a,b)>0)return [];
    const out=[];let cur=a,guard=0;
    while(cmpDate(cur,b)<=0&&guard<93){out.push({index:out.length+1,...cur,key:dkey(cur)});cur=nextDate(cur);guard++;}
    return out;
  }
  function entries(){return buildDateEntries();}
  function entry(day){return entries()[Number(day)-1]||null;}
  function dateLabel(day){const e=entry(day);if(!e)return String(day);return state.rangeMode==='custom'?`${e.y}/${pad(e.m)}/${pad(e.d)}`:String(e.d);}
  function fullDateLabel(day){const e=entry(day);return e?`${e.y}/${pad(e.m)}/${pad(e.d)}`:String(day);}
  function rangeLength(){return Math.max(1,entries().length||1);}
  function periodOptions(selected){return entries().map(e=>`<option value="${e.index}" ${Number(selected)===e.index?'selected':''}>${e.key}</option>`).join('');}
  function positionForDateString(v,def){const s=latinDigits(v).trim();const m=s.match(/(\d{3,4})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})/);if(m){const key=`${+m[1]}/${pad(+m[2])}/${pad(+m[3])}`;const hit=entries().find(e=>e.key===key);return hit?hit.index:def;}const n=Number(s);return Number.isFinite(n)&&n>=1&&n<=rangeLength()?n:def;}
  function parsePeriodDaysText(text){
    const s=latinDigits(text||'').trim();if(!s)return [];
    const out=new Set();
    // بازه تاریخ کامل: 1405/6/20 تا 1405/7/5 یا با خط تیره
    const rangeRe=/(\d{3,4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\s*(?:تا|\s+-\s+)\s*(\d{3,4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/g;
    let cleaned=s,m;
    while((m=rangeRe.exec(s))){const a={y:+m[1],m:+m[2],d:+m[3]},b={y:+m[4],m:+m[5],d:+m[6]};for(const e of entries())if(cmpDate(e,a)>=0&&cmpDate(e,b)<=0)out.add(e.index);cleaned=cleaned.replace(m[0],' ');}
    // تاریخ‌های کامل تکی
    const dateRe=/(\d{3,4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/g;
    while((m=dateRe.exec(cleaned))){const key=`${+m[1]}/${pad(+m[2])}/${pad(+m[3])}`;const e=entries().find(x=>x.key===key);if(e)out.add(e.index);}
    cleaned=cleaned.replace(dateRe,' ');
    // اعداد و بازه‌های شماره‌ای برای حالت تک ماه یا شماره روز بازه
    for(const d of parseDays(cleaned))if(d>=1&&d<=rangeLength())out.add(d);
    return [...out].sort((a,b)=>a-b);
  }
  function displayPeriodDays(arr){return (arr||[]).map(d=>state.rangeMode==='custom'?fullDateLabel(d):String(d)).join(', ');}

  // توابع مرکزی تاریخ را به بازه جدید وصل کن
  daysInMonth=function(){return rangeLength();};
  periodBounds=function(){return {start:1,end:rangeLength()};};
  activeDays=function(){return Array.from({length:rangeLength()},(_,i)=>i+1);};
  weekdayForDay=function(d){
    if(state.rangeMode!=='custom'&&state.calendarMode==='manual')return (Number(state.manualStartWeek||0)+d-1)%7;
    const e=entry(d);return e?Jalali.weekday(e.y,e.m,e.d):0;
  };
  weekdaysArray=function(){const a=[];for(const d of activeDays())a[d]=weekdayForDay(d);return a;};
  effectiveHolidays=function(){const set=new Set((state.holidays||[]).filter(d=>d>=1&&d<=rangeLength())),off=new Set(state.nonHolidays||[]);if(state.fridaysHoliday)for(const d of activeDays())if(weekdayForDay(d)===5&&!off.has(d))set.add(d);for(const d of off)set.delete(d);return [...set].sort((a,b)=>a-b);};

  function clearForNewRange(){state.holidays=[];state.nonHolidays=[];state.holidayEvents={};state.dayConfig={};state.assignments=[];state.lockedAssignments={};selectedCalendarDay=1;lastPenalty=null;}
  function normalizeRangeDependent(){const n=rangeLength();for(const p of state.people){p.startDay=Math.max(1,Math.min(n,Number(p.startDay||1)));p.endDay=Math.max(p.startDay,Math.min(n,Number(p.endDay||n)));p.unavailableDays=(p.unavailableDays||[]).filter(d=>d<=n);p.preferredDays=(p.preferredDays||[]).filter(d=>d<=n);}for(const sh of state.shifts){sh.startDay=Math.max(1,Math.min(n,Number(sh.startDay||1)));sh.endDay=Math.max(sh.startDay,Math.min(n,Number(sh.endDay||n)));}}

  // حالت ساده واقعاً ساده بماند
  const baseApplyModeUI=applyModeUI;
  applyModeUI=function(){baseApplyModeUI();const adv=state.mode==='advanced';
    const hideIds=['mapTarget','mapHoliday','mapAllow48','mapPreferred','mapPrevMorning','mapAllowedShifts','mapMaxConsecutive','mapPrevShifts','mapPrevHolidays','mapWUnavailable','mapWPreferred','mapWTogether','mapWAvoid','mapWMorning','mapStartDay','mapEndDay'];
    hideIds.forEach(id=>{const el=$('#'+id);if(el?.closest('.field'))el.closest('.field').classList.toggle('mode-hidden',!adv);});
    const pri=$('#people .panel:nth-of-type(2)');if(pri)pri.classList.toggle('mode-hidden',!adv);
    const note=$('#people .panel-note');if(note)note.classList.toggle('mode-hidden',!adv);
    const navShift=$('.nav button[data-page="shifts"]');if(navShift)navShift.classList.toggle('mode-hidden',!adv);
  };

  // کارت افراد: تاریخ‌ها و روزهای ممنوع در بازه چندماهه قابل فهم باشند
  renderPeople=function(){oldRenderPeople();const n=rangeLength();
    $$('#peopleCards .person-card').forEach((card,i)=>{const p=state.people[i];if(!p)return;
      for(const k of ['unavailableDays','preferredDays']){const inp=card.querySelector(`[data-k="${k}"]`);if(inp){inp.value=displayPeriodDays(p[k]);inp.placeholder=state.rangeMode==='custom'?'مثال: 1405/06/24, 1405/07/03':'مثال: 3,7,12-15';inp.onchange=()=>{p[k]=parsePeriodDaysText(inp.value);state.assignments=[];save();};}}
      for(const k of ['startDay','endDay']){const old=card.querySelector(`input[data-k="${k}"]`);if(old){const sel=document.createElement('select');sel.dataset.k=k;sel.innerHTML=periodOptions(p[k]|| (k==='startDay'?1:n));old.replaceWith(sel);const lab=sel.closest('.field')?.querySelector('label');if(lab)lab.textContent=k==='startDay'?'از تاریخ':'تا تاریخ';sel.onchange=()=>{p[k]=Number(sel.value);if(p.endDay<p.startDay)p.endDay=p.startDay;state.assignments=[];save();renderPeople();};}}
    });
  };

  // بخش‌ها: شروع و پایان با تاریخ کامل
  renderShifts=function(){oldRenderShifts();const n=rangeLength();$$('#shiftBody tr').forEach((tr,i)=>{const sh=state.shifts[i];if(!sh)return;const ins=tr.querySelectorAll('input');const start=ins[4],end=ins[5];if(start&&end){const ss=document.createElement('select'),ee=document.createElement('select');ss.innerHTML=periodOptions(sh.startDay||1);ee.innerHTML=periodOptions(sh.endDay||n);start.replaceWith(ss);end.replaceWith(ee);ss.onchange=()=>{sh.startDay=Number(ss.value);if(sh.endDay<sh.startDay)sh.endDay=sh.startDay;state.assignments=[];save();renderShifts();renderCalendar();};ee.onchange=()=>{sh.endDay=Number(ee.value);if(sh.endDay<sh.startDay)sh.startDay=sh.endDay;state.assignments=[];save();renderShifts();renderCalendar();};}});};

  function calendarEvent(d){return (state.holidayEvents||{})[d]||'';}
  renderCalendar=function(){
    const n=rangeLength(),hol=new Set(effectiveHolidays());selectedCalendarDay=Math.min(Math.max(1,selectedCalendarDay),n);
    $('#rangeMode').value=state.rangeMode;$('#singleMonthRange').classList.toggle('hidden',state.rangeMode==='custom');$('#customDateRange').classList.toggle('hidden',state.rangeMode!=='custom');
    $('#manualCalendarBox').classList.toggle('hidden',state.rangeMode==='custom'||state.calendarMode!=='manual');$('#manualDays').value=state.manualDays;$('#manualStartWeek').value=state.manualStartWeek;$('#manualHolidayDays').value=(state.holidays||[]).join(', ');$('#simpleDailyPeople').value=state.simpleDailyPeople;
    $('#jy').value=state.year;$('#jm').value=state.month;$('#fridaysHoliday').value=state.fridaysHoliday?'1':'0';$('#calendarMode').value=state.calendarMode;
    $('#rangeStartY').value=state.rangeStart.y;$('#rangeStartM').value=state.rangeStart.m;$('#rangeStartD').value=state.rangeStart.d;$('#rangeEndY').value=state.rangeEnd.y;$('#rangeEndM').value=state.rangeEnd.m;$('#rangeEndD').value=state.rangeEnd.d;
    const grid=$('#calendarGrid');grid.innerHTML='';for(let d=1;d<=n;d++){const wd=weekdayForDay(d),cfg=getDayConfig(d),event=calendarEvent(d),el=document.createElement('div');el.className='day'+(hol.has(d)?' holiday':'')+(wd===5?' friday':'')+(d===selectedCalendarDay?' selected-day':'');const special=state.mode==='simple'?(cfg.simpleSlots!==undefined?'<span class="pill">تعداد ویژه</span>':''):(Object.keys(cfg.mainSlots||{}).length||Object.keys(cfg.coverSlots||{}).length?'<span class="pill">تعداد ویژه</span>':'');el.innerHTML=`<div class="d">${dateLabel(d)}</div><div class="w">${week[wd]}</div><div class="day-pills">${state.mode==='advanced'&&hol.has(d)?'<span class="pill red">تعطیل</span>':''}${state.mode==='advanced'&&cfg.morningRisk?'<span class="pill gold">مورنینگ روز</span>':''}${special}</div>${event?`<div class="event">${escHtml(event)}</div>`:''}`;el.onclick=()=>{selectedCalendarDay=d;renderCalendar();};grid.appendChild(el);}renderDayEditor();
  };

  renderDayEditor=function(){const box=$('#dayEditor'),d=selectedCalendarDay,cfg=getDayConfig(d);if(!d||d>rangeLength())return;const title=`${fullDateLabel(d)} — ${week[weekdayForDay(d)]}`;
    if(state.mode==='simple'){box.innerHTML=`<h3>${title}</h3><div class="grid g2"><div class="field"><label>چند نفر این روز کشیک باشند؟</label><input id="editSimpleSlots" type="number" min="0" max="30" value="${cfg.simpleSlots===undefined?'':cfg.simpleSlots}" placeholder="پیش‌فرض: ${state.simpleDailyPeople}"></div><div class="field"><label>راهنما</label><div class="muted">خالی یعنی همان تعداد پیش‌فرض. صفر یعنی این روز کشیک نداشته باشد.</div></div></div>`;$('#editSimpleSlots').onchange=e=>{const x=ensureDayConfig(d);if(e.target.value==='')delete x.simpleSlots;else x.simpleSlots=Math.max(0,Number(e.target.value)||0);state.assignments=[];save();renderCalendar();};return;}
    const hol=new Set(effectiveHolidays()),event=calendarEvent(d);box.innerHTML=`<h3>${title}</h3>${event?`<div class="notice">مناسبت: ${escHtml(event)}</div>`:''}<div class="grid g3 top-gap"><div class="field"><label>تعطیل</label><div class="check-line"><input id="editHoliday" type="checkbox" ${hol.has(d)?'checked':''}><span>این روز تعطیل است</span></div></div><div class="field"><label>مورنینگ خود روز</label><div class="check-line"><input id="editMorningDay" type="checkbox" ${cfg.morningRisk?'checked':''}><span>برای کشیک‌های این روز یک امتیاز مورنینگ جدا حساب شود</span></div></div><div class="field"><label>تعداد نفرات</label><div class="muted">برای هر بخش نفر اصلی و کاور جداست.</div></div></div><div class="day-cap-grid top-gap">${state.shifts.map(s=>{const rm=cfg.mainSlots?.[s.id],rc=cfg.coverSlots?.[s.id],mo=cfg.morningByShift?.[s.id];return `<div class="day-shift-box"><b>${escHtml(s.name)}</b><div class="grid g3"><div class="field"><label>اصلی</label><input type="number" min="0" data-day-main="${s.id}" value="${rm===undefined?'':rm}" placeholder="${s.mainSlots}"></div><div class="field"><label>کاور</label><input type="number" min="0" data-day-cover="${s.id}" value="${rc===undefined?'':rc}" placeholder="${s.coverSlots}"></div><div class="field"><label>مورنینگ این بخش در این روز</label><select data-day-morning="${s.id}">${morningOverrideOptions(mo)}</select></div></div></div>`;}).join('')}</div><div class="actions top-gap"><button class="btn light" id="resetDay">برگرداندن تنظیم این روز به حالت عادی</button></div>`;
    $('#editHoliday').onchange=e=>{const manual=new Set(state.holidays||[]),off=new Set(state.nonHolidays||[]);if(e.target.checked){manual.add(d);off.delete(d);}else{manual.delete(d);off.add(d);}state.holidays=[...manual];state.nonHolidays=[...off];state.assignments=[];save();renderCalendar();};$('#editMorningDay').onchange=e=>{ensureDayConfig(d).morningRisk=e.target.checked;state.assignments=[];save();renderCalendar();};
    $$('[data-day-main]').forEach(inp=>inp.onchange=()=>{const x=ensureDayConfig(d),id=inp.dataset.dayMain;if(inp.value==='')delete x.mainSlots[id];else x.mainSlots[id]=Math.max(0,Number(inp.value)||0);state.assignments=[];save();renderCalendar();});$$('[data-day-cover]').forEach(inp=>inp.onchange=()=>{const x=ensureDayConfig(d),id=inp.dataset.dayCover;if(inp.value==='')delete x.coverSlots[id];else x.coverSlots[id]=Math.max(0,Number(inp.value)||0);state.assignments=[];save();renderCalendar();});$$('[data-day-morning]').forEach(sel=>sel.onchange=()=>{const x=ensureDayConfig(d),id=sel.dataset.dayMorning;if(sel.value==='inherit')delete x.morningByShift[id];else x.morningByShift[id]=sel.value==='1';state.assignments=[];save();renderCalendar();});$('#resetDay').onclick=()=>{state.dayConfig[d]={mainSlots:{},coverSlots:{},morningByShift:{}};state.assignments=[];save();renderCalendar();};
  };

  // بازه زمانی
  months.forEach((m,i)=>{$('#rangeStartM').insertAdjacentHTML('beforeend',`<option value="${i+1}">${m}</option>`);$('#rangeEndM').insertAdjacentHTML('beforeend',`<option value="${i+1}">${m}</option>`);});
  $('#rangeMode').onchange=()=>{state.rangeMode=$('#rangeMode').value;if(state.rangeMode==='month'){state.rangeStart={y:state.year,m:state.month,d:1};state.rangeEnd={y:state.year,m:state.month,d:Jalali.monthLength(state.year,state.month)};}clearForNewRange();normalizeRangeDependent();save();renderAll();};
  $('#applyDateRange').onclick=()=>{const a={y:Number($('#rangeStartY').value),m:Number($('#rangeStartM').value),d:Number($('#rangeStartD').value)},b={y:Number($('#rangeEndY').value),m:Number($('#rangeEndM').value),d:Number($('#rangeEndD').value)};if(!validDate(a)||!validDate(b))return toast('تاریخ شروع یا پایان درست نیست');if(cmpDate(a,b)>0)return toast('تاریخ پایان باید بعد از شروع باشد');let count=0,cur=a;while(cmpDate(cur,b)<=0&&count<=93){count++;cur=nextDate(cur);}if(count>93)return toast('فعلاً بازه را حداکثر ۹۳ روز انتخاب کن');state.rangeMode='custom';state.rangeStart=a;state.rangeEnd=b;state.year=a.y;state.month=a.m;clearForNewRange();for(const p of state.people){p.startDay=1;p.endDay=count;}for(const sh of state.shifts){sh.startDay=1;sh.endDay=count;}save();renderAll();toast(`${count} روز برای چیدمان انتخاب شد`);};
  const oldJy=$('#jy').onchange,oldJm=$('#jm').onchange;
  $('#jy').onchange=()=>{state.year=Number($('#jy').value);state.rangeMode='month';state.rangeStart={y:state.year,m:state.month,d:1};state.rangeEnd={y:state.year,m:state.month,d:Jalali.monthLength(state.year,state.month)};clearForNewRange();for(const p of state.people){p.startDay=1;p.endDay=Jalali.monthLength(state.year,state.month);}for(const sh of state.shifts){sh.startDay=1;sh.endDay=Jalali.monthLength(state.year,state.month);}save();renderAll();};
  $('#jm').onchange=()=>{state.month=Number($('#jm').value);state.rangeMode='month';state.rangeStart={y:state.year,m:state.month,d:1};state.rangeEnd={y:state.year,m:state.month,d:Jalali.monthLength(state.year,state.month)};clearForNewRange();for(const p of state.people){p.startDay=1;p.endDay=Jalali.monthLength(state.year,state.month);}for(const sh of state.shifts){sh.startDay=1;sh.endDay=Jalali.monthLength(state.year,state.month);}save();renderAll();};

  // تعطیلات داخلی ۱۴۰۵ در چند ماه
  $('#loadOfficial').onclick=()=>{const hol=[],events={};for(const e of entries()){if(e.y!==1405)continue;if((window.IRAN_HOLIDAYS_1405[e.m]||[]).includes(e.d))hol.push(e.index);}state.holidays=hol;state.nonHolidays=[];state.holidayEvents=events;state.assignments=[];save();renderCalendar();toast(`${hol.length} تعطیلی داخلی پیدا شد`);};
  $('#fetchHolidays').onclick=async()=>{const source=$('#holidaySource').value,status=$('#holidayStatus');status.textContent='در حال دریافت...';try{const pairs=[...new Set(entries().map(e=>`${e.y}-${e.m}`))].map(x=>x.split('-').map(Number));const found=[];for(const [y,m] of pairs){const url=source==='pnldev'?`https://pnldev.com/api/calender?year=${y}&month=${m}&holiday=true`:`https://persian-calendar-api.sajjadth.workers.dev/?year=${y}&month=${m}`;const r=await fetch(url,{cache:'no-store'});if(!r.ok)continue;for(const x of extractHolidayEntries(await r.json())){const e=entries().find(z=>z.y===y&&z.m===m&&z.d===x.day);if(e)found.push({index:e.index,event:x.event});}}if(!found.length)throw new Error();state.holidays=[...new Set(found.map(x=>x.index))];state.nonHolidays=[];state.holidayEvents=Object.fromEntries(found.filter(x=>x.event).map(x=>[x.index,x.event]));state.assignments=[];save();renderCalendar();status.textContent=`${state.holidays.length} روز تعطیل پیدا شد.`;}catch(e){status.textContent='دریافت خودکار انجام نشد. می‌توانی روزها را دستی علامت بزنی.';}};

  // ورودی Excel: تاریخ حضور می‌تواند تاریخ کامل یا شماره روز بازه باشد
  $('#doImport').onclick=()=>{if(!importedRows)return;const mapIds2=['mapName','mapTarget','mapHoliday','mapAllow48','mapUnavailable','mapPreferred','mapTogether','mapAvoid','mapStartDay','mapEndDay','mapPrevMorning','mapAllowedShifts','mapMaxConsecutive','mapPrevShifts','mapPrevHolidays','mapWUnavailable','mapWPreferred','mapWTogether','mapWAvoid','mapWMorning'];const get=id=>$('#'+id)?.value===''||!$('#'+id)?null:Number($('#'+id).value),m=Object.fromEntries(mapIds2.map(id=>[id,get(id)]));if(m.mapName==null)return toast('ستون نام را انتخاب کن');const val=(r,i)=>i==null?'':r[i],num=(r,i,d=0)=>{if(i==null)return d;const n=Number(latinDigits(val(r,i)));return Number.isFinite(n)&&String(val(r,i)).trim()!==''?n:d;};if(state.seededDemo){state.people=[];state.seededDemo=false;}const pending=[];for(const r of importedRows.slice(1)){const name=String(val(r,m.mapName)||'').trim();if(!name)continue;const p=newPerson({name});if(state.mode==='advanced'){p.targetShifts=num(r,m.mapTarget,0);p.targetHolidays=num(r,m.mapHoliday,0);p.allow48=m.mapAllow48==null?false:truthy(val(r,m.mapAllow48));p.preferredDays=parsePeriodDaysText(val(r,m.mapPreferred));p.startDay=positionForDateString(val(r,m.mapStartDay),1);p.endDay=positionForDateString(val(r,m.mapEndDay),rangeLength());p.previousMorning=num(r,m.mapPrevMorning,0);p.maxConsecutiveDays=num(r,m.mapMaxConsecutive,0);p.previousShifts=num(r,m.mapPrevShifts,0);p.previousHolidays=num(r,m.mapPrevHolidays,0);p.ruleWeights={unavailable:m.mapWUnavailable==null||String(val(r,m.mapWUnavailable)).trim()===''?null:clampWeight(num(r,m.mapWUnavailable)),preferred:m.mapWPreferred==null||String(val(r,m.mapWPreferred)).trim()===''?null:clampWeight(num(r,m.mapWPreferred)),together:m.mapWTogether==null||String(val(r,m.mapWTogether)).trim()===''?null:clampWeight(num(r,m.mapWTogether)),avoid:m.mapWAvoid==null||String(val(r,m.mapWAvoid)).trim()===''?null:clampWeight(num(r,m.mapWAvoid)),morning:m.mapWMorning==null||String(val(r,m.mapWMorning)).trim()===''?null:clampWeight(num(r,m.mapWMorning))};}p.unavailableDays=parsePeriodDaysText(val(r,m.mapUnavailable));pending.push({p,together:splitNames(val(r,m.mapTogether)),avoid:splitNames(val(r,m.mapAvoid)),allowed:splitNames(val(r,m.mapAllowedShifts))});}for(const x of pending){let p=state.people.find(q=>q.name.trim()===x.p.name);if(!p){p=x.p;state.people.push(p);}else Object.assign(p,x.p);}for(const x of pending){const p=state.people.find(q=>q.name.trim()===x.p.name);p.togetherIds=x.together.map(n=>state.people.find(q=>q.name.trim()===n)?.id).filter(Boolean);p.avoidIds=x.avoid.map(n=>state.people.find(q=>q.name.trim()===n)?.id).filter(Boolean);p.allowedShiftIds=x.allowed.map(n=>state.shifts.find(s=>s.name.trim()===n)?.id).filter(Boolean);}normalizePeopleLinks();state.assignments=[];save();renderPeople();go('people');toast(`${pending.length} نفر وارد شد`);};

  buildSolverInput=function(){const input=oldBuildSolverInput();input.daysInMonth=rangeLength();input.periodStart=1;input.periodEnd=rangeLength();input.weekdays=weekdaysArray();input.holidays=state.mode==='advanced'?effectiveHolidays():[];input.lockedAssignments={...(state.lockedAssignments||{})};input.dateLabels=Object.fromEntries(activeDays().map(d=>[d,fullDateLabel(d)]));return input;};

  function slotKey(a){return `${a.day}|${a.shiftId}|${a.role}|${a.slot}`;}
  function personOptions(selected){return '<option value="">خالی</option>'+state.people.filter(p=>p.active&&p.name.trim()).map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${escHtml(p.name)}</option>`).join('');}
  function updateWarnings(){const box=$('#scheduleWarnings');if(!state.assignments?.length){box.classList.add('hidden');return;}const a=getAnalysis();if(!a){box.classList.add('hidden');return;}if(!a.hard&&!a.empty){box.classList.add('hidden');return;}box.classList.remove('hidden');box.innerHTML=`${a.empty?`<b>${a.empty}</b> خانه خالی داریم. `:''}${a.hard?`<b>${a.hard}</b> نفر حداقل یک خط قرمز نقض‌شده دارند. `:''}برای جزئیات صفحه «تحلیل و گزارش» را ببین.`;}

  renderSchedule=function(){const box=$('#scheduleTable');if(!state.assignments?.length){box.innerHTML='<div class="notice">هنوز برنامه‌ای ساخته نشده.</div>';updateWarnings();return;}const names=Object.fromEntries(state.people.map(p=>[p.id,p.name])),by=assignmentsByDayShift(),shifts=currentShifts(),hol=new Set(effectiveHolidays());
    function cell(a,extra=''){if(!a)return `<td class="${extra}"><span class="danger">خالی</span></td>`;const key=slotKey(a),locked=Boolean(state.lockedAssignments?.[key]);let body='';if(state.tools.manualEdit){body=`<select data-manual-slot="${key}" ${locked?'disabled':''}>${personOptions(a.personId||'')}</select>`;}else body=a.personId?escHtml(names[a.personId]||'؟'):'<span class="danger">خالی</span>';if(state.tools.locking)body+=`<div><button class="btn sm ${locked?'primary':'light'}" data-lock-slot="${key}">${locked?'قفل است':'قفل'}</button></div>`;if(state.tools.explainEmpty&&!a.personId)body+=`<div><button class="btn sm light" data-explain-slot="${key}">چرا خالی؟</button></div>`;return `<td class="${extra}">${body}</td>`;}
    let h='<table><thead><tr><th>تاریخ</th><th>روز هفته</th>'+(state.mode==='advanced'?'<th>تعطیل</th>':'')+shifts.map(s=>{if(state.mode==='simple'){const mx=Math.max(1,...activeDays().map(simpleCount));return `<th colspan="${mx}">کشیک</th>`;}return `<th colspan="${Math.max(1,slotMaxForShift(s,'main')+slotMaxForShift(s,'cover'))}">${escHtml(s.name)}</th>`;}).join('')+'</tr></thead><tbody>';
    for(const d of activeDays()){h+=`<tr><td>${fullDateLabel(d)}</td><td>${week[weekdayForDay(d)]}</td>${state.mode==='advanced'?`<td>${hol.has(d)?'●':''}</td>`:''}`;for(const s of shifts){const arr=(by[d]?.[s.id]||[]);if(state.mode==='simple'){const mx=Math.max(1,...activeDays().map(simpleCount));for(let k=1;k<=mx;k++){if(k>simpleCount(d)){h+='<td class="disabled-slot">—</td>';continue;}h+=cell(arr.find(x=>x.role==='main'&&x.slot===k));}}else{for(let k=1;k<=slotMaxForShift(s,'main');k++){if(k>mainCount(d,s)){h+='<td class="disabled-slot">—</td>';continue;}h+=cell(arr.find(x=>x.role==='main'&&x.slot===k));}for(let k=1;k<=slotMaxForShift(s,'cover');k++){if(k>coverCount(d,s)){h+='<td class="disabled-slot">—</td>';continue;}h+=cell(arr.find(x=>x.role==='cover'&&x.slot===k),'cover-cell');}}}h+='</tr>';}h+='</tbody></table>';box.innerHTML=h;
    $$('[data-manual-slot]').forEach(sel=>sel.onchange=()=>{const a=state.assignments.find(x=>slotKey(x)===sel.dataset.manualSlot);if(!a)return;a.personId=sel.value||null;if(state.lockedAssignments?.[sel.dataset.manualSlot])state.lockedAssignments[sel.dataset.manualSlot]=a.personId;lastPenalty=KeshikSolver.totalPenalty(state.assignments,buildSolverInput());save();renderSchedule();renderAnalysis();updateWarnings();toast('تغییر انجام شد؛ هشدارها را بررسی کن');});
    $$('[data-lock-slot]').forEach(btn=>btn.onclick=()=>{const a=state.assignments.find(x=>slotKey(x)===btn.dataset.lockSlot);if(!a?.personId)return toast('خانه خالی را نمی‌شود قفل کرد');if(state.lockedAssignments[btn.dataset.lockSlot])delete state.lockedAssignments[btn.dataset.lockSlot];else state.lockedAssignments[btn.dataset.lockSlot]=a.personId;save();renderSchedule();toast(state.lockedAssignments[btn.dataset.lockSlot]?'این خانه قفل شد':'قفل باز شد');});
    $$('[data-explain-slot]').forEach(btn=>btn.onclick=()=>{const a=state.assignments.find(x=>slotKey(x)===btn.dataset.explainSlot);if(!a)return;const rows=KeshikSolver.explainSlot?KeshikSolver.explainSlot(a,state.assignments,buildSolverInput()):[];const ok=rows.filter(x=>!x.reasons.length),bad=rows.filter(x=>x.reasons.length);$('#slotExplainPanel').classList.remove('hidden');$('#slotExplainBox').innerHTML=`<b>${fullDateLabel(a.day)} · ${escHtml(a.shiftName)} ${a.role==='cover'?'کاور':'اصلی'}</b><br>${ok.length?`${ok.length} نفر از نظر خط قرمز قابل انتخاب هستند؛ ممکن است با تلاش بیشتر یا تنظیم تعداد کشیک بهتر پر شود.`:'هیچ فردی بدون نقض خط قرمز برای این خانه پیدا نشد.'}<div class="top-gap">${bad.slice(0,12).map(x=>`<div><b>${escHtml(x.name)}:</b> ${x.reasons.map(escHtml).join('، ')}</div>`).join('')}</div>`;$('#slotExplainPanel').scrollIntoView({behavior:'smooth',block:'start'});});updateWarnings();
  };

  scheduleRows=function(){const names=Object.fromEntries(state.people.map(p=>[p.id,p.name])),by=assignmentsByDayShift(),shifts=currentShifts(),hol=new Set(effectiveHolidays());let headers=['تاریخ','روز هفته'];if(state.mode==='advanced')headers.push('تعطیل');const defs=[];for(const s of shifts){if(state.mode==='simple'){const mx=Math.max(1,...activeDays().map(simpleCount));for(let k=1;k<=mx;k++){headers.push(`کشیک ${k}`);defs.push({s,role:'main',slot:k});}}else{for(let k=1;k<=slotMaxForShift(s,'main');k++){headers.push(`${s.name} اصلی ${k}`);defs.push({s,role:'main',slot:k});}for(let k=1;k<=slotMaxForShift(s,'cover');k++){headers.push(`${s.name} کاور ${k}`);defs.push({s,role:'cover',slot:k});}}}const rows=[headers];for(const d of activeDays()){const row=[fullDateLabel(d),week[weekdayForDay(d)]];if(state.mode==='advanced')row.push(hol.has(d)?'بله':'');for(const def of defs){const actual=state.mode==='simple'?simpleCount(d):(def.role==='main'?mainCount(d,def.s):coverCount(d,def.s));if(def.slot>actual){row.push('—');continue;}const a=(by[d]?.[def.s.id]||[]).find(x=>x.role===def.role&&x.slot===def.slot);row.push(names[a?.personId]||'');}rows.push(row);}return rows;};

  // ابزارهای اختیاری
  for(const [id,key] of [['toolManualEdit','manualEdit'],['toolLocking','locking'],['toolExplainEmpty','explainEmpty']]){const el=$('#'+id);if(el){el.checked=Boolean(state.tools[key]);el.onchange=()=>{state.tools[key]=el.checked;save();renderSchedule();};}}

  // متن‌های خروجی و داشبورد
  const baseDashboard=renderDashboard;renderDashboard=function(){baseDashboard();$('#dashDays').textContent=rangeLength();};
  const baseRenderAll=renderAll;renderAll=function(){normalizeRangeDependent();baseRenderAll();applyModeUI();renderCalendar();renderPeople();renderShifts();renderSchedule();renderDashboard();for(const [id,key] of [['toolManualEdit','manualEdit'],['toolLocking','locking'],['toolExplainEmpty','explainEmpty']])if($('#'+id))$('#'+id).checked=Boolean(state.tools[key]);};

  // فایل خروجی نام خواناتر در بازه دلخواه
  const oldExportProgram=exportProgram;exportProgram=function(full){if(!state.assignments.length)return toast('اول برنامه را بچین');const sr=scheduleRows(),sheets={'کشیک':{rows:sr,styles:sr.map((r,i)=>r.map(()=>i===0?1:0))}};if(full)sheets['تحلیل']=analysisRows();const tag=state.rangeMode==='custom'?`${dkey(state.rangeStart).replaceAll('/','-')}_تا_${dkey(state.rangeEnd).replaceAll('/','-')}`:`${state.year}_${state.month}`;download(XLSXLite.createWorkbook(sheets),`keshikyar_1_1_${tag}.xlsx`);};$('#exportSchedule').onclick=()=>exportProgram(false);$('#exportAnalysis').onclick=()=>exportProgram(true);

  // ذخیره نسخه جدید
  if((location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')&&'serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js').catch(()=>{});}
  save();renderAll();
})();
