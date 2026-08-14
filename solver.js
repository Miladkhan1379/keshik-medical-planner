(function(global){
  const uniq=a=>[...new Set(a)];
  const HARD_PENALTY=1000000;
  const DEFAULT_WEIGHTS={unavailable:100,preferred:50,together:75,avoid:50,morning:50};

  function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,Number(v)||0));}
  function ruleWeight(person,key,config){
    const pv=person?.ruleWeights?.[key];
    if(pv!==null&&pv!==undefined&&pv!=='')return clamp(pv);
    const gv=config?.globalRuleWeights?.[key];
    return gv===undefined?DEFAULT_WEIGHTS[key]:clamp(gv);
  }
  function ruleHard(person,key,config){return ruleWeight(person,key,config)>=100;}
  function dayCfg(config,day){return config.dayConfig?.[day]||config.dayConfig?.[String(day)]||{};}
  function inRange(day,start,end){return day>=Number(start||1)&&day<=Number(end||configSafeEnd(end));}
  function configSafeEnd(v){return Number(v||31)||31;}
  function shiftActive(shift,day,config){
    const a=Math.max(Number(config.periodStart||1),Number(shift.startDay||1));
    const b=Math.min(Number(config.periodEnd||config.daysInMonth),Number(shift.endDay||config.daysInMonth));
    return day>=a&&day<=b;
  }
  function personActive(person,day,config){
    const a=Math.max(Number(config.periodStart||1),Number(person.startDay||1));
    const b=Math.min(Number(config.periodEnd||config.daysInMonth),Number(person.endDay||config.daysInMonth));
    return day>=a&&day<=b;
  }
  function countFor(config,day,shift,key){
    if(!shiftActive(shift,day,config))return 0;
    const raw=dayCfg(config,day)?.[key]?.[shift.id];
    if(raw!==undefined&&raw!==null&&raw!=='')return clamp(raw,0,30);
    const base=key==='coverSlots'?shift.coverSlots:shift.mainSlots;
    return clamp(base,0,30);
  }
  function slotsFor(config,day,shift){return countFor(config,day,shift,'mainSlots')+countFor(config,day,shift,'coverSlots');}
  function weekdayFor(config,day){
    if(Array.isArray(config.weekdays)&&config.weekdays[day]!=null)return Number(config.weekdays[day]);
    return null;
  }
  function sectionMorningRisk(slot,config){
    const shift=config.shiftById?.[slot.shiftId];
    if(!shift)return false;
    const dc=dayCfg(config,slot.day);
    const direct=dc?.morningByShift?.[slot.shiftId];
    if(typeof direct==='boolean')return direct;
    const wd=weekdayFor(config,slot.day);
    const weekly=wd==null?undefined:config.weeklyMorning?.[wd]?.[slot.shiftId];
    if(typeof weekly==='boolean')return weekly;
    return Boolean(shift.morningRisk);
  }
  function morningUnitsForSlot(slot,config){
    return (sectionMorningRisk(slot,config)?1:0)+(dayCfg(config,slot.day)?.morningRisk?1:0);
  }
  function makeSlots(config){
    const out=[];
    const start=Math.max(1,Number(config.periodStart||1)),end=Math.min(Number(config.daysInMonth||31),Number(config.periodEnd||config.daysInMonth||31));
    for(let d=start;d<=end;d++)for(const sh of config.shifts){
      const main=countFor(config,d,sh,'mainSlots'),cover=countFor(config,d,sh,'coverSlots');
      for(let k=1;k<=main;k++)out.push({day:d,shiftId:sh.id,shiftName:sh.name,slot:k,role:'main'});
      for(let k=1;k<=cover;k++)out.push({day:d,shiftId:sh.id,shiftName:sh.name,slot:k,role:'cover'});
    }
    return out;
  }
  function buildIndex(assignments){
    const byPerson={},byDay={},byPersonDay={};
    assignments.forEach((a,i)=>{if(!a.personId)return;(byPerson[a.personId]??=[]).push(i);(byDay[a.day]??=[]).push(i);(byPersonDay[`${a.personId}:${a.day}`]??=[]).push(i);});
    return {byPerson,byDay,byPersonDay};
  }
  function longestConsecutive(days){
    const a=uniq(days).sort((x,y)=>x-y);let best=0,cur=0,prev=null;
    for(const d of a){cur=prev!==null&&d===prev+1?cur+1:1;best=Math.max(best,cur);prev=d;}return best;
  }
  function currentMorning(personId,assignments,config,idx){return (idx.byPerson[personId]||[]).reduce((sum,i)=>sum+morningUnitsForSlot(assignments[i],config),0);}
  function relationship(person,otherId,key){return (person?.[key]||[]).includes(otherId);}

  function hardReasons(person,slot,assignments,config,idx,ignore=[]){
    const reasons=[];
    if(!person||person.active===false){reasons.push('فرد غیرفعال است');return reasons;}
    if(!personActive(person,slot.day,config))reasons.push('خارج از بازه حضور فرد');
    const ignoreSet=new Set(ignore);
    if((person.unavailableDays||[]).includes(slot.day)&&ruleHard(person,'unavailable',config))reasons.push('این تاریخ برای فرد خط قرمز است');
    if((person.preferredDays||[]).length&&ruleHard(person,'preferred',config)&&!(person.preferredDays||[]).includes(slot.day))reasons.push('خارج از روزهای ترجیحیِ خط قرمز');
    if(ruleHard(person,'morning',config)&&morningUnitsForSlot(slot,config)>0)reasons.push('مورنینگ برای این فرد خط قرمز است');
    if(person.allowedShiftIds?.length&&!person.allowedShiftIds.includes(slot.shiftId))reasons.push('این بخش برای فرد مجاز نیست');
    const ids=idx.byPerson[person.id]||[],days=[];
    for(const i of ids){
      if(ignoreSet.has(i))continue;const a=assignments[i];if(a.personId!==person.id)continue;
      if(a.day===slot.day)reasons.push('همان روز یک کشیک دیگر دارد');
      days.push(a.day);
      if(!person.allow48&&Math.abs(a.day-slot.day)<=1)reasons.push('دو روز پشت سر هم برایش مجاز نیست');
    }
    const configuredMax=Number(person.maxConsecutiveDays||0),maxCons=configuredMax>0?configuredMax:(person.allow48?2:1);
    if(longestConsecutive([...days,slot.day])>maxCons)reasons.push('حداکثر روزهای پشت سر هم رد می‌شود');
    for(const i of (idx.byDay[slot.day]||[])){
      if(ignoreSet.has(i))continue;const otherId=assignments[i].personId;if(!otherId)continue;const other=config.peopleById?.[otherId];
      if(relationship(person,otherId,'avoidIds')&&ruleHard(person,'avoid',config))reasons.push('با یکی از افراد ممنوع هم‌روز می‌شود');
      if(relationship(other,person.id,'avoidIds')&&ruleHard(other,'avoid',config))reasons.push('برای فرد دیگر، هم‌روز بودن با این شخص ممنوع است');
    }
    return uniq(reasons);
  }
  function hardValid(person,slot,assignments,config,idx,ignore=[]){return hardReasons(person,slot,assignments,config,idx,ignore).length===0;}

  function candidateScore(person,slot,assignments,config,idx){
    const ids=idx.byPerson[person.id]||[],total=ids.length,target=Number(person.targetShifts||0);let s=0;
    if(target>0)s+=(target-total)*34;else s-=total*16;
    s-=Number(person.previousShifts||0)*1.6;
    if(config.holidays.has(slot.day)){
      const h=ids.filter(i=>config.holidays.has(assignments[i].day)).length,ht=Number(person.targetHolidays||0);
      if(ht>0)s+=(ht-h)*24;else s-=h*5;
      s-=Number(person.previousHolidays||0)*3;
    }
    const unavailable=(person.unavailableDays||[]).includes(slot.day);
    if(unavailable&&!ruleHard(person,'unavailable',config))s-=ruleWeight(person,'unavailable',config)*1.4;
    if((person.preferredDays||[]).includes(slot.day))s+=ruleWeight(person,'preferred',config)*.8;
    for(const i of (idx.byDay[slot.day]||[])){
      const otherId=assignments[i].personId;if(!otherId)continue;
      if((person.togetherIds||[]).includes(otherId))s+=ruleWeight(person,'together',config)*(ruleHard(person,'together',config)?5:1);
      if((person.avoidIds||[]).includes(otherId)&&!ruleHard(person,'avoid',config))s-=ruleWeight(person,'avoid',config)*1.8;
      const other=config.peopleById?.[otherId];if(other&&(other.avoidIds||[]).includes(person.id)&&!ruleHard(other,'avoid',config))s-=ruleWeight(other,'avoid',config)*1.2;
    }
    const sameShift=ids.filter(i=>assignments[i].shiftId===slot.shiftId).length;s-=sameShift*2;
    if(slot.role==='cover')s-=ids.filter(i=>assignments[i].role==='cover').length*4;
    const units=morningUnitsForSlot(slot,config);if(units){const current=currentMorning(person.id,assignments,config,idx)+Number(person.previousMorning||0);s-=units*(current+1)*(ruleWeight(person,'morning',config)/9);}
    s+=Math.random()*8;return s;
  }

  function countPairViolations(person,ids,assignments,idx,key){
    let n=0;for(const other of person[key]||[])for(const i of ids){const d=assignments[i].day,present=(idx.byPersonDay[`${other}:${d}`]||[]).length>0;if(key==='togetherIds'?!present:present)n++;}return n;
  }

  function totalPenalty(assignments,config){
    const idx=buildIndex(assignments);let p=0;const cumulative=[],cumHoliday=[],cumMorning=[],cumCover=[];
    for(const a of assignments)if(!a.personId)p+=25000;
    for(const person of config.people){
      const ids=idx.byPerson[person.id]||[],total=ids.length,target=Number(person.targetShifts||0),ht=Number(person.targetHolidays||0);
      if(target>0)p+=Math.abs(total-target)*55;
      const hs=ids.filter(i=>config.holidays.has(assignments[i].day)).length;if(ht>0)p+=Math.abs(hs-ht)*42;
      const assignedDays=new Set(ids.map(i=>assignments[i].day));
      const unavail=(person.unavailableDays||[]).filter(d=>assignedDays.has(d)).length;if(unavail)p+=unavail*(ruleHard(person,'unavailable',config)?HARD_PENALTY:ruleWeight(person,'unavailable',config)*3);
      if((person.preferredDays||[]).length){
        if(ruleHard(person,'preferred',config)){const outside=ids.filter(i=>!(person.preferredDays||[]).includes(assignments[i].day)).length;p+=outside*HARD_PENALTY;}
        else{const hit=(person.preferredDays||[]).filter(d=>assignedDays.has(d)).length,possible=Math.min((person.preferredDays||[]).length,total);p+=Math.max(0,possible-hit)*ruleWeight(person,'preferred',config)*1.2;}
      }
      const pair=countPairViolations(person,ids,assignments,idx,'togetherIds');if(pair)p+=pair*(ruleHard(person,'together',config)?HARD_PENALTY:ruleWeight(person,'together',config)*2.2);
      const avoid=countPairViolations(person,ids,assignments,idx,'avoidIds');if(avoid)p+=avoid*(ruleHard(person,'avoid',config)?HARD_PENALTY:ruleWeight(person,'avoid',config)*2.6);
      let morning=0;for(const i of ids)morning+=morningUnitsForSlot(assignments[i],config);if(ruleHard(person,'morning',config)&&morning)p+=morning*HARD_PENALTY;
      const covers=ids.filter(i=>assignments[i].role==='cover').length;
      cumulative.push({value:total+Number(person.previousShifts||0),weight:50});cumHoliday.push({value:hs+Number(person.previousHolidays||0),weight:25});cumMorning.push({value:morning+Number(person.previousMorning||0),weight:ruleWeight(person,'morning',config)});cumCover.push({value:covers,weight:30});
    }
    function fairness(items,scale){if(!items.length)return;const avg=items.reduce((a,b)=>a+b.value,0)/items.length;for(const it of items)p+=Math.abs(it.value-avg)*scale*(Math.max(0,it.weight)/50);}
    fairness(cumulative,12);fairness(cumHoliday,9);fairness(cumMorning,8);fairness(cumCover,5);return p;
  }

  function slotKey(a){return `${a.day}|${a.shiftId}|${a.role}|${a.slot}`;}
  function initial(config){
    const assignments=makeSlots(config).map(s=>({...s,personId:null}));
    const locked=config.lockedAssignments||{};
    for(const a of assignments){const pid=locked[slotKey(a)];if(pid&&config.peopleById?.[pid])a.personId=pid;}
    const order=[...assignments.keys()].sort((a,b)=>{const A=assignments[a],B=assignments[b],am=morningUnitsForSlot(A,config),bm=morningUnitsForSlot(B,config);if(bm!==am)return bm-am;const ah=config.holidays.has(A.day)?1:0,bh=config.holidays.has(B.day)?1:0;if(bh!==ah)return bh-ah;if(A.role!==B.role)return A.role==='main'?-1:1;return Math.random()-.5;});
    for(const ix of order){const slot=assignments[ix];if(slot.personId)continue;const idx=buildIndex(assignments),cand=config.people.filter(p=>hardValid(p,slot,assignments,config,idx));if(!cand.length)continue;cand.sort((a,b)=>candidateScore(b,slot,assignments,config,idx)-candidateScore(a,slot,assignments,config,idx));assignments[ix].personId=cand[0].id;}return assignments;
  }
  function improve(assignments,config,iterations=7000){
    let best=assignments.map(x=>({...x})),bestP=totalPenalty(best,config),cur=best.map(x=>({...x})),curP=bestP;const n=cur.length;if(n<2)return {assignments:best,penalty:bestP};
    for(let it=0;it<iterations;it++){const i=Math.floor(Math.random()*n),j=Math.floor(Math.random()*n);if(i===j)continue;const ai=cur[i],aj=cur[j];if((config.lockedAssignments||{})[slotKey(ai)]||(config.lockedAssignments||{})[slotKey(aj)])continue;const pi=ai.personId,pj=aj.personId;if(pi===pj)continue;const idx=buildIndex(cur),personI=config.peopleById[pj],personJ=config.peopleById[pi];if(pj&&!hardValid(personI,ai,cur,config,idx,[i,j]))continue;if(pi&&!hardValid(personJ,aj,cur,config,idx,[i,j]))continue;ai.personId=pj;aj.personId=pi;const np=totalPenalty(cur,config),temp=Math.max(.1,36*(1-it/iterations));if(np<curP||Math.random()<Math.exp((curP-np)/temp)){curP=np;if(np<bestP){bestP=np;best=cur.map(x=>({...x}));}}else{ai.personId=pi;aj.personId=pj;}}
    return {assignments:best,penalty:bestP};
  }
  function solve(input,onProgress){
    const config={...input,holidays:new Set(input.holidays||[]),dayConfig:input.dayConfig||{},weeklyMorning:input.weeklyMorning||{}};config.peopleById=Object.fromEntries(config.people.map(p=>[p.id,p]));config.shiftById=Object.fromEntries(config.shifts.map(s=>[s.id,s]));
    let best=null;const runs=Math.max(8,Math.min(80,Number(input.runs||28)));for(let r=0;r<runs;r++){const a=initial(config),res=improve(a,config,Math.max(2600,Math.floor(14000/runs)));if(!best||res.penalty<best.penalty)best=res;if(onProgress)onProgress(Math.round((r+1)*100/runs),best.penalty);if(best.penalty===0)break;}return best;
  }

  function analyze(assignments,input){
    const config={...input,holidays:new Set(input.holidays||[]),dayConfig:input.dayConfig||{},weeklyMorning:input.weeklyMorning||{}};config.peopleById=Object.fromEntries(input.people.map(p=>[p.id,p]));config.shiftById=Object.fromEntries(input.shifts.map(s=>[s.id,s]));const idx=buildIndex(assignments),rows=[];let hard=0,soft=0;
    for(const p of input.people){
      const ids=idx.byPerson[p.id]||[],days=ids.map(i=>assignments[i].day).sort((a,b)=>a-b),shiftCounts={};ids.forEach(i=>shiftCounts[assignments[i].shiftName]=(shiftCounts[assignments[i].shiftName]||0)+1);
      const duplicate=uniq(days).length!==days.length,consecutive=uniq(days).some((d,k,a)=>k&&d-a[k-1]===1),forbidden48=consecutive&&!p.allow48;
      const violated=(p.unavailableDays||[]).filter(d=>days.includes(d));const preferredOutside=ruleHard(p,'preferred',config)?ids.filter(i=>(p.preferredDays||[]).length&&!(p.preferredDays||[]).includes(assignments[i].day)).length:0;
      const pairViol=countPairViolations(p,ids,assignments,idx,'togetherIds'),avoidViol=countPairViolations(p,ids,assignments,idx,'avoidIds');let allowedViol=0,outsideRange=0;
      for(const i of ids){const a=assignments[i];if(p.allowedShiftIds?.length&&!p.allowedShiftIds.includes(a.shiftId))allowedViol++;if(!personActive(p,a.day,config))outsideRange++;}
      const maxConsSeen=longestConsecutive(days),configuredMax=Number(p.maxConsecutiveDays||0),maxConsLimit=configuredMax>0?configuredMax:(p.allow48?2:1),maxConsViol=maxConsSeen>maxConsLimit;
      const holiday=days.filter(d=>config.holidays.has(d)).length,total=ids.length,cover=ids.filter(i=>assignments[i].role==='cover').length;
      let morningSection=0,morningDay=0;for(const i of ids){const a=assignments[i];if(sectionMorningRisk(a,config))morningSection++;if(dayCfg(config,a.day)?.morningRisk)morningDay++;}const morning=morningSection+morningDay;
      const hardUnavailable=ruleHard(p,'unavailable',config)?violated.length:0,hardPair=ruleHard(p,'together',config)?pairViol:0,hardAvoid=ruleHard(p,'avoid',config)?avoidViol:0,hardMorning=ruleHard(p,'morning',config)?morning:0,hardPreferred=preferredOutside;
      const hasHard=duplicate||forbidden48||hardUnavailable||hardPair||hardAvoid||hardMorning||hardPreferred||allowedViol||maxConsViol||outsideRange;if(hasHard)hard++;
      const targetSoft=(Number(p.targetShifts||0)>0&&Math.abs(total-Number(p.targetShifts||0))>1)||(Number(p.targetHolidays||0)>0&&Math.abs(holiday-Number(p.targetHolidays||0))>1);const softFactors=(!ruleHard(p,'unavailable',config)&&violated.length)||(!ruleHard(p,'together',config)&&pairViol)||(!ruleHard(p,'avoid',config)&&avoidViol)||targetSoft;if(softFactors)soft++;
      rows.push({id:p.id,name:p.name,total,holiday,cover,consecutive,forbidden48,duplicate,pairViol,avoidViol,allowedViol,outsideRange,maxConsSeen,maxConsLimit,limitCount:(p.unavailableDays||[]).length,violatedDays:violated.join('، '),preferredOutside,hardUnavailable,hardPair,hardAvoid,hardMorning,hardPreferred,morningSection,morningDay,morning,previousMorning:Number(p.previousMorning||0),morningTotal:morning+Number(p.previousMorning||0),previousShifts:Number(p.previousShifts||0),cumulativeShifts:total+Number(p.previousShifts||0),previousHolidays:Number(p.previousHolidays||0),cumulativeHolidays:holiday+Number(p.previousHolidays||0),shiftCounts});
    }
    return {rows,hard,soft,empty:assignments.filter(a=>!a.personId).length};
  }
  function explainSlot(slot,assignments,input){const config={...input,holidays:new Set(input.holidays||[]),dayConfig:input.dayConfig||{},weeklyMorning:input.weeklyMorning||{}};config.peopleById=Object.fromEntries(input.people.map(p=>[p.id,p]));config.shiftById=Object.fromEntries(input.shifts.map(s=>[s.id,s]));const idx=buildIndex(assignments);return input.people.map(p=>({id:p.id,name:p.name,reasons:hardReasons(p,slot,assignments,config,idx)}));}
  global.KeshikSolver={solve,analyze,totalPenalty,slotsFor,morningUnitsForSlot,sectionMorningRisk,explainSlot};
})(window);
