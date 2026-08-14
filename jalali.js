// Minimal Jalali/Gregorian conversion utilities based on the well-known 2820/33-year arithmetic approach.
// No external dependency. Sufficient for modern dates used by the scheduler.
(function(global){
  const div=(a,b)=>Math.trunc(a/b), mod=(a,b)=>a-Math.trunc(a/b)*b;
  function jalCal(jy){
    const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
    const bl=breaks.length; let gy=jy+621, leapJ=-14, jp=breaks[0], jm=0,jump=0;
    if(jy<jp||jy>=breaks[bl-1]) throw new Error('Invalid Jalali year');
    for(let i=1;i<bl;i++){jm=breaks[i];jump=jm-jp;if(jy<jm)break;leapJ+=div(jump,33)*8+div(mod(jump,33),4);jp=jm;}
    let n=jy-jp; leapJ+=div(n,33)*8+div(mod(n,33)+3,4); if(mod(jump,33)===4&&jump-n===4) leapJ++;
    const leapG=div(gy,4)-div((div(gy,100)+1)*3,4)-150; const march=20+leapJ-leapG;
    if(jump-n<6) n=n-jump+div(jump+4,33)*33;
    let leap=mod(mod(n+1,33)-1,4); if(leap===-1) leap=4;
    return {leap,gy,march};
  }
  function g2d(gy,gm,gd){let d=div((gy+div(gm-8,6)+100100)*1461,4)+div(153*mod(gm+9,12)+2,5)+gd-34840408; d=d-div(div(gy+100100+div(gm-8,6),100)*3,4)+752; return d;}
  function d2g(jdn){let j=4*jdn+139361631; j=j+div(div(4*jdn+183187720,146097)*3,4)*4-3908; const i=div(mod(j,1461),4)*5+308; const gd=div(mod(i,153),5)+1; const gm=mod(div(i,153),12)+1; const gy=div(j,1461)-100100+div(8-gm,6); return {gy,gm,gd};}
  function j2d(jy,jm,jd){const r=jalCal(jy); return g2d(r.gy,3,r.march)+(jm-1)*31-div(jm,7)*(jm-7)+jd-1;}
  function d2j(jdn){const g=d2g(jdn), gy=g.gy; let jy=gy-621, r=jalCal(jy), jdn1f=g2d(gy,3,r.march), k=jdn-jdn1f;
    let jd,jm; if(k>=0){if(k<=185){jm=1+div(k,31);jd=mod(k,31)+1;return {jy,jm,jd};}k-=186;} else {jy--;k+=179;if(r.leap===1)k++;}
    jm=7+div(k,30);jd=mod(k,30)+1;return {jy,jm,jd};
  }
  function toGregorian(jy,jm,jd){return d2g(j2d(jy,jm,jd));}
  function toJalali(gy,gm,gd){return d2j(g2d(gy,gm,gd));}
  function monthLength(jy,jm){if(jm<=6)return 31;if(jm<=11)return 30;return jalCal(jy).leap===0?30:29;}
  function weekday(jy,jm,jd){const g=toGregorian(jy,jm,jd); return new Date(Date.UTC(g.gy,g.gm-1,g.gd)).getUTCDay();}
  global.Jalali={toGregorian,toJalali,monthLength,weekday};
})(window);
