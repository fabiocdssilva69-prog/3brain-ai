// -*- coding: utf-8 -*-
// reactor.js — REACTOR ARC: o instrumento v3 do Pointer, COPIADO tal e qual de
// 3brain-ai/pointer-4f1c/index.html (bloco <script> "MEDIDOR v3", 13/09/2026) para a TORRE STARK.
//
// PORQUE E COPIA E NAO IMPORT: o instrumento vive dentro do index.html do site publico, que o painel.py
// reescreve e EMPURRA. A Torre e local e nunca se publica; depender do ficheiro do site ligaria uma sala
// privada a uma pasta que faz push. Copia-se — e o painel.py nao se toca (regra da peca 11).
//
// O QUE MUDOU EM RELACAO AO ORIGINAL — duas linhas, e so estas:
//   1. SANS: 'Inter, ...' -> '"Segoe UI Variable Text", ...'. Ordem dele: NUNCA a fonte Inter. E sem CDN,
//      a Torre so pode usar fontes do sistema (o site carrega-as do Google Fonts; aqui isso e proibido).
//   2. document.fonts.load(...) -> setTimeout(redesenho,0). Nao ha webfont a esperar; o redesenho que o
//      site fazia quando a fonte chegava continua a fazer-se, uma vez, no fim do arranque.
//
// COMO E ALIMENTADO: exactamente como no site — window.medidorVivo(v), chamado pelo torre.js com
// torre.json["reactor"] (os mesmos campos do vivo.json: ganho, cartao_plano, posicoes, medidor, limites,
// alocacao, ja_entrou, precos, t_iso). Continua a ler a Binance ao segundo: e mercado, 0 tokens.
// ==== MEDIDOR v3 — INSTRUMENTO DE PRECISÃO (13/09/2026). O porquê está em PARA_OPUS.md "13/09 medidor v3".
// Todas as leituras vêm do vivo.json; entre dois minutos a cripto mexe pelo livro da Binance (ancorada ao preço da Alpaca),
// e BTC/ETH chegam pelo miniTicker de 24 h. Base do mostrador em cache (só redesenha com escala/tamanho); por frame só a
// banda, os índices, os ponteiros e a janela digital.
(function(){
'use strict';
const cv=document.getElementById('md_cv'); if(!cv||!cv.getContext) return;
const g=cv.getContext('2d'), palco=document.getElementById('md_palco'), secao=document.getElementById('medidor'), dica=document.getElementById('md_tip');
const $=id=>document.getElementById(id);
const calmo=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const telemovel=!!(window.matchMedia&&matchMedia('(pointer: coarse)').matches);   // 13/09: o telemóvel trava com DOM a 4 Hz e redesenho a cada preço
const TAXA=0.0025, PI2=Math.PI*2, VARRE=Math.PI*0.75;
const clamp=(x,a,b)=>x<a?a:(x>b?b:x);
const sgn=(x,c)=>(x>=0?'+':'−')+Math.abs(x).toFixed(c==null?2:c);
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
const hoje=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const hhmm=()=>new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});
const hms=()=>new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'});
const escH=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const K={f0:'#161a20',f1:'#0a0c0f',pista:'#171b21',tMin:'#39424d',tMed:'#6a7583',tMaj:'#cfd6de',num:'#a7b0bb',txt:'#e6e9ee',mut:'#8a94a3',dim:'#5b6573',up:'#3ecf8e',dn:'#ff5a5f',am:'#e8b04b',cy:'#5ac8fa',br:'#f2f4f7'};
const MONO='"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', SANS='"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif';
const fEsc=x=>x>=10?x.toFixed(0):(x>=1?String(Math.round(x*10)/10):x.toFixed(2));
function escala(x){ if(!(x>0)) return 1; const p=Math.pow(10,Math.floor(Math.log10(x))); for(const k of [1,1.5,2,2.5,3,4,5,6,8,10]) if(k*p>=x) return k*p; return 10*p; }
const fmtP=p=>{ p=Number(p); if(!isFinite(p)) return '—'; return Math.abs(p)>=100?p.toFixed(2):(Math.abs(p)>=1?p.toFixed(4):p.toPrecision(4)); };

const S={fech:null,pos:[],cr:{},plano:null,alvoPor:{},nAcoes:0,bolsa:false,esp:null,alvos:null,limite:null,limAc:null,limCr:null,capital:null,
  herd:null,herdDesde:'',herdErro:'',stopP:null,trava:{},
  pico:null,picoT:'',vale:null,valeT:'',serie:[],dataDia:'',je:{},aloc:{},gn:{},meta:null,metaUser:false,
  real:null,val:0,vel:0,disp:0,esc:10,escAlvo:10,ritmo:0,ritmoV:0,ritEsc:5,
  simOn:false,simM:0,simVis:0,simValor:0,simInfo:[],teste:0,flash:0,
  vib:LS.get('md_vib','0')==='1',ultVib:0,cruz:{},cruzX:{},ultTick:0,visivel:true,hist:[],hits:[],anelPts:[],mira:null,tipAte:0,foco:null,ultPico:0,pronto:false,
  txtT:0,segT:0,posT:0,srT:0,log:[],mercado:{},spread:{},corAg:[205,211,218],fxBrilho:0,fxDelta:null,fxVarre:null,fxRastro:null,trend:0};
{ const m=parseFloat(LS.get('md_meta_'+hoje(),'')); if(isFinite(m)){ S.meta=m; S.metaUser=true; } }

// ---------- geometria ----------
const W={s:400,dpr:1,c:200,R:160}; let forcar=true, ultDesenho=0;
const base=document.createElement('canvas'), gb=base.getContext('2d'); let baseChave='';
function medir(){ const b=palco.getBoundingClientRect(), s=Math.max(220,Math.round(b.width)), dpr=Math.min(telemovel?1.5:2,window.devicePixelRatio||1);
  W.s=s; W.dpr=dpr; W.c=s/2; W.R=s*0.42; const px=Math.round(s*dpr); if(cv.width!==px){ cv.width=cv.height=px; base.width=base.height=px; } baseChave=''; forcar=true; }
medir(); if(window.ResizeObserver) new ResizeObserver(medir).observe(palco); else addEventListener('resize',medir);
const ang=(v,esc)=>-Math.PI/2+(v/esc)*VARRE;
const angSub=u=>-Math.PI/2+u*(2*Math.PI/3);
const P=(r,a)=>[W.c+r*Math.cos(a),W.c+r*Math.sin(a)];
const SUBS=[{id:'ritmo',dx:-0.44,dy:0.1,tit:'RITMO'},{id:'capital',dx:0.44,dy:0.1,tit:'CAPITAL'},{id:'meta',dx:0,dy:0.5,tit:'META'}];
const SUB_R=0.2;
function caixa(x,a,b,w,h,r){ x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }
function espacado(x,txt,px,py,sp){ if('letterSpacing' in x){ x.letterSpacing=sp+'px'; x.fillText(txt,px,py); x.letterSpacing='0px'; } else x.fillText(txt,px,py); }
function traco(x,lista,cor,lw){ if(!lista.length) return; x.strokeStyle=cor; x.lineWidth=lw; x.beginPath(); for(const l of lista){ x.moveTo(l[0],l[1]); x.lineTo(l[2],l[3]); } x.stroke(); }

// ---------- base do mostrador (em cache) ----------
function desenharBase(){
  const s=W.s, c=W.c, R=W.R, esc=S.esc; gb.setTransform(W.dpr,0,0,W.dpr,0,0); gb.clearRect(0,0,s,s);
  let gr; if(gb.createConicGradient){ gr=gb.createConicGradient(-Math.PI/4,c,c); [['#4a525e',0],['#1b2027',0.12],['#3d4550',0.25],['#161a20',0.38],['#454d58',0.5],['#1a1e24',0.62],['#3a414b',0.75],['#171b21',0.88],['#4a525e',1]].forEach(z=>gr.addColorStop(z[1],z[0])); } else { gr=gb.createLinearGradient(c-R,c-R,c+R,c+R); gr.addColorStop(0,'#3b434e'); gr.addColorStop(0.5,'#171b21'); gr.addColorStop(1,'#353c46'); }
  gb.beginPath(); gb.arc(c,c,R*1.06,0,PI2); gb.fillStyle=gr; gb.fill(); gb.beginPath(); for(let i=0;i<180;i++){ const a=i/180*PI2; gb.moveTo(c+R*1.043*Math.cos(a),c+R*1.043*Math.sin(a)); gb.lineTo(c+R*1.058*Math.cos(a),c+R*1.058*Math.sin(a)); } gb.strokeStyle='rgba(0,0,0,.28)'; gb.lineWidth=0.7; gb.stroke();
  gr=gb.createRadialGradient(c,c-R*0.3,R*0.05,c,c,R*1.04); gr.addColorStop(0,K.f0); gr.addColorStop(1,K.f1);
  gb.beginPath(); gb.arc(c,c,R*1.04,0,PI2); gb.fillStyle=gr; gb.fill(); gb.save(); gb.beginPath(); gb.arc(c,c,R*1.035,0,PI2); gb.clip(); { const sh=gb.createLinearGradient(c,c-R*1.04,c,c+R*0.2); sh.addColorStop(0,'rgba(255,255,255,.055)'); sh.addColorStop(0.45,'rgba(255,255,255,.012)'); sh.addColorStop(1,'rgba(255,255,255,0)'); gb.fillStyle=sh; gb.beginPath(); gb.ellipse(c,c-R*0.62,R*1.1,R*0.62,0,0,PI2); gb.fill(); } gb.restore();
  for(const [r,cor] of [[1.04,'rgba(255,255,255,.07)'],[0.975,'#1c2128'],[0.715,'rgba(255,255,255,.035)']]){ gb.beginPath(); gb.arc(c,c,R*r,0,PI2); gb.strokeStyle=cor; gb.lineWidth=1; gb.stroke(); }
  gb.lineCap='butt'; gb.lineWidth=R*0.024; gb.strokeStyle=K.pista; gb.beginPath(); gb.arc(c,c,R*0.905,ang(-esc,esc),ang(esc,esc)); gb.stroke();
  
  const L=[[],[],[]];
  for(let i=-50;i<=50;i++){ const k=i%10===0?2:(i%5===0?1:0), a=ang(esc*i/50,esc), r0=R*0.972, r1=R*(0.972-[0.03,0.052,0.08][k]); L[k].push([c+r0*Math.cos(a),c+r0*Math.sin(a),c+r1*Math.cos(a),c+r1*Math.sin(a)]); }
  traco(gb,L[0],K.tMin,0.8); traco(gb,L[1],K.tMed,1.15); traco(gb,L[2],K.tMaj,1.7); gb.fillStyle='rgba(190,198,208,.55)'; gb.beginPath(); for(let i=-5;i<=5;i++){ const a=ang(esc*i/5,esc), x=c+R*0.986*Math.cos(a), y=c+R*0.986*Math.sin(a); gb.moveTo(x+R*0.0055,y); gb.arc(x,y,R*0.0055,0,PI2); } gb.fill();
  gb.font='500 '+Math.max(9,Math.round(R*0.055))+'px '+MONO; gb.textAlign='center'; gb.textBaseline='middle';
  for(let i=-5;i<=5;i++){ const v=esc*i/5, a=ang(v,esc); gb.fillStyle=(S.stopP!=null&&v<S.stopP-1e-9)?K.dn:(i===0?K.br:K.num); gb.fillText((v>0?'+':v<0?'−':'')+fEsc(Math.abs(v)),c+R*0.8*Math.cos(a),c+R*0.8*Math.sin(a)); }
  for(const d of SUBS) baseSub(d);
  const jw=R*0.8, jh=R*0.215, jx=c-jw/2, jy=c-R*0.53;
  caixa(gb,jx,jy,jw,jh,R*0.028); gb.fillStyle='#07090c'; gb.fill(); gb.strokeStyle='#262d36'; gb.lineWidth=1; gb.stroke();
  gb.font='600 '+Math.max(7,Math.round(R*0.03))+'px '+SANS; gb.fillStyle=K.dim; gb.textBaseline='top';
  gb.textAlign='center'; espacado(gb,'RESULTADO DO DIA · US$',c,jy+R*0.024,1.2);
  gb.textAlign='center'; gb.textBaseline='middle'; gb.font='600 '+Math.max(7,Math.round(R*0.028))+'px '+SANS; gb.fillStyle='#3e4753'; espacado(gb,'ESCALA ±'+fEsc(esc)+' US$ · CONTA DE TREINO',c,c+R*0.84,1.4);
  baseChave=chave(); }
function baseSub(d){ const R=W.R, x=W.c+d.dx*R, y=W.c+d.dy*R, r=R*SUB_R;
  gb.beginPath(); gb.arc(x,y,r,0,PI2); gb.fillStyle='#0b0d11'; gb.fill(); gb.strokeStyle='#272e37'; gb.lineWidth=1; gb.stroke();
  gb.beginPath(); gb.arc(x,y,r*0.9,angSub(-1),angSub(1)); gb.strokeStyle='#15191f'; gb.lineWidth=r*0.07; gb.stroke();
  const n=24, L=[[],[]];
  for(let i=0;i<=n;i++){ const a=angSub(-1+2*i/n), maj=i%6===0, r0=r*0.86, r1=r*(maj?0.71:0.78); L[maj?1:0].push([x+r0*Math.cos(a),y+r0*Math.sin(a),x+r1*Math.cos(a),y+r1*Math.sin(a)]); }
  traco(gb,L[0],K.tMin,0.7); traco(gb,L[1],K.tMed,1.1);
  const ref=d.id==='ritmo'?0:(d.id==='meta'?-1+2*100/125:null);
  if(ref!=null){ const a=angSub(ref); gb.strokeStyle=d.id==='meta'?K.am:K.tMaj; gb.lineWidth=1.5; gb.beginPath(); gb.moveTo(x+r*0.9*Math.cos(a),y+r*0.9*Math.sin(a)); gb.lineTo(x+r*0.66*Math.cos(a),y+r*0.66*Math.sin(a)); gb.stroke(); }
  gb.font='600 '+Math.max(7,Math.round(R*0.026))+'px '+SANS; gb.fillStyle=K.mut; gb.textAlign='center'; gb.textBaseline='middle'; espacado(gb,d.tit,x,y-r*0.4,1); }
const chave=()=>[S.esc.toFixed(5),S.ritEsc,S.stopP,W.s,W.dpr].join('|');

// ---------- camada viva ----------
function banda(esc){ const c=W.c, R=W.R, vv=clamp(S.val,-esc*1.02,esc*1.02); if(Math.abs(vv)<esc*0.002) return;
  const a0=ang(0,esc), a1=ang(vv,esc), cor=rgbS(S.corAg), lo=Math.min(a0,a1), hi=Math.max(a0,a1);
  g.lineCap='butt'; g.lineWidth=R*0.024; g.strokeStyle=cor; g.globalAlpha=S.simOn?0.5:0.92; g.beginPath(); g.arc(c,c,R*0.905,lo,hi); g.stroke();
  if(S.flash>0.01){ g.globalAlpha=S.flash*0.25; g.lineWidth=R*0.05; g.beginPath(); g.arc(c,c,R*0.905,lo,hi); g.stroke(); }
  g.globalAlpha=1; const p0=P(R*0.878,a1), p1=P(R*0.932,a1); g.strokeStyle=K.br; g.lineWidth=2; g.beginPath(); g.moveTo(p0[0],p0[1]); g.lineTo(p1[0],p1[1]); g.stroke(); }
function indices(esc){ const R=W.R, foco=S.foco&&S.foco.ate>performance.now()?S.foco.tipo:null; S.hits.length=0;
  const L=[]; if(S.esp!=null) L.push({tipo:'esperado',v:S.esp,cor:K.am,tag:'ESP'}); if(S.alvos!=null) L.push({tipo:'alvos',v:S.alvos,cor:K.cy,tag:'ALV'});
  if(S.meta!=null) L.push({tipo:'meta',v:S.meta,cor:K.br,tag:'META'}); if(S.stopP!=null) L.push({tipo:'stop',v:S.stopP,cor:K.dn,tag:'STOP'});
  L.forEach(m=>{ m.a=ang(clamp(m.v,-esc*1.02,esc*1.02),esc); }); L.sort((a,b)=>a.a-b.a);
  const postos=[]; g.textAlign='center'; g.textBaseline='middle';
  for(const m of L){ const s=R*(foco===m.tipo?0.04:0.029), nx=-Math.sin(m.a), ny=Math.cos(m.a), t=P(R*1.0,m.a), b=P(R*1.0+s*1.45,m.a);
    g.fillStyle=m.cor; g.beginPath(); g.moveTo(t[0],t[1]); g.lineTo(b[0]+nx*s*0.62,b[1]+ny*s*0.62); g.lineTo(b[0]-nx*s*0.62,b[1]-ny*s*0.62); g.closePath(); g.fill();
    const l0=P(R*0.886,m.a), l1=P(R*0.924,m.a); g.strokeStyle=m.cor; g.lineWidth=1.2; g.beginPath(); g.moveTo(l0[0],l0[1]); g.lineTo(l1[0],l1[1]); g.stroke();
    const e=P(R*1.12,m.a), hT=R*0.048; let ly=e[1]; for(let k=0;k<4&&postos.some(q=>Math.abs(q[0]-e[0])<R*0.14&&Math.abs(q[1]-ly)<hT);k++) ly+=(e[1]>=W.c?1:-1)*hT; postos.push([e[0],ly]); g.font='600 '+Math.max(8,Math.round(R*0.031))+'px '+MONO; g.fillStyle=m.cor; g.fillText(m.tag,e[0],ly);
    S.hits.push({tipo:m.tipo,x:b[0],y:b[1]}); }
  for(const [tipo,v,cor] of [['pico',S.pico,'rgba(242,244,247,.9)'],['vale',S.vale,'rgba(138,148,163,.9)']]){ if(v==null) continue; const a=ang(clamp(v,-esc,esc),esc), p0=P(R*0.89,a), p1=P(R*0.92,a), h=P(R*0.862,a);
    g.strokeStyle=cor; g.lineWidth=foco===tipo?2.4:1.3; g.beginPath(); g.moveTo(p0[0],p0[1]); g.lineTo(p1[0],p1[1]); g.stroke(); g.fillStyle=cor; g.beginPath(); g.arc(h[0],h[1],foco===tipo?2.6:1.7,0,PI2); g.fill(); S.hits.push({tipo,x:h[0],y:h[1]}); } }
const COR={prata:[205,211,218],verde:[62,207,142],menta:[125,255,192],coral:[255,90,95],rosa:[255,138,142],ambar:[232,176,75],ouro:[255,206,92],sobe:[40,235,135],desce:[255,64,76]};
// 13/09 ("não muda de cor quando mexe"): a cor do ponteiro é o MOVIMENTO — verde vivo a subir, vermelho vivo a descer —
// segura 2,5 s depois do último movimento e volta em 1 s à cor do estado (prata ~0, verde, âmbar ≥ esperado, dourado ≥ meta, coral <0).
function corEstado(v){ if(Math.abs(v)<Math.max(0.01,S.esc*0.002)) return COR.prata; if(v<0) return COR.coral;
  if(S.meta!=null&&S.meta>0&&v>=S.meta) return COR.ouro; if(S.esp!=null&&S.esp>0&&v>=S.esp) return COR.ambar; return COR.verde; }
function corAlvoAgulha(v){ if(S.simOn) return COR.ambar; const base=corEstado(v), idade=(performance.now()-(S.movT||-1e9))/1000;
  if(idade>=3.5) return base; const mov=S.movS>0?COR.sobe:COR.desce; if(idade<2.5) return mov; const k=idade-2.5; return mov.map((x,i)=>x+(base[i]-x)*k); }
const rgbS=(c,a)=>'rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+(a==null?1:a)+')';
const HALO=new Map();
function halo(c){ const k=c.map(x=>Math.min(255,Math.round(x/16)*16)).join(); let s=HALO.get(k); if(s) return s; s=document.createElement('canvas'); s.width=s.height=64; const x=s.getContext('2d'), gr=x.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba('+k+',0.9)'); gr.addColorStop(0.35,'rgba('+k+',0.32)'); gr.addColorStop(1,'rgba('+k+',0)'); x.fillStyle=gr; x.fillRect(0,0,64,64); if(HALO.size>40) HALO.clear(); HALO.set(k,s); return s; }
function zonas(esc){ const c=W.c, R=W.R, r=R*1.006; g.lineCap='butt'; g.lineWidth=R*0.012;
  const arco=(v0,v1,cor)=>{ v0=clamp(v0,-esc,esc); v1=clamp(v1,-esc,esc); if(v1-v0<esc*0.002) return; g.strokeStyle=cor; g.beginPath(); g.arc(c,c,r,ang(v0,esc),ang(v1,esc)); g.stroke(); };
  if(S.stopP!=null&&S.stopP<0) arco(-esc,S.stopP,'rgba(255,90,95,.55)');
  const e=S.esp!=null&&S.esp>0?S.esp:null, m=S.meta!=null&&S.meta>0?S.meta:null;
  if(e!=null) arco(e,m!=null&&m>e?m:esc,'rgba(232,176,75,.4)');
  if(m!=null) arco(m,esc,'rgba(62,207,142,.36)'); }
function efeitos(esc,dt){ const c=W.c, R=W.R;
  const rs=S.fxRastro; if(rs){ rs.t+=dt; const a=1-rs.t/1.3; if(a<=0) S.fxRastro=null; else { const lo=Math.min(rs.de,rs.ate), hi=Math.max(rs.de,rs.ate); let n=0; g.beginPath();
      for(let i=-50;i<=50;i++){ const v=esc*i/50; if(v<lo-esc/100||v>hi+esc/100) continue; const k=i%10===0?0.08:(i%5===0?0.052:0.03), aa=ang(v,esc); g.moveTo(c+R*0.972*Math.cos(aa),c+R*0.972*Math.sin(aa)); g.lineTo(c+R*(0.972-k)*Math.cos(aa),c+R*(0.972-k)*Math.sin(aa)); n++; }
      if(n){ g.strokeStyle=rgbS(rs.s>0?COR.menta:COR.rosa,(0.85*a).toFixed(3)); g.lineWidth=1.5; g.stroke(); } } }
  const vr=S.fxVarre; if(vr){ vr.t+=dt/0.9; const vv=clamp(S.val,0,esc); if(vr.t>=1||vv<=0) S.fxVarre=null; else { const p=vr.t*vv, span=Math.max(esc*0.03,vv*0.12);
      g.lineCap='butt'; g.lineWidth=R*0.024; for(let k=0;k<3;k++){ const v1=clamp(p-span*k/3,0,vv), v0=clamp(p-span*(k+1)/3,0,vv); if(v1<=v0) continue; g.strokeStyle='rgba(255,255,255,'+((0.5-0.14*k)*(1-vr.t*0.4)).toFixed(3)+')'; g.beginPath(); g.arc(c,c,R*0.905,ang(v0,esc),ang(v1,esc)); g.stroke(); } } }
  const fd=S.fxDelta; if(fd){ fd.t+=dt/1.6; if(fd.t>=1) S.fxDelta=null; else if(Math.abs(fd.v)>=0.01){ const jy=c-R*0.53, sobe=calmo?0:fd.t*R*0.06, a=fd.t<0.12?fd.t/0.12:1-(fd.t-0.12)/0.88;
      g.font='600 '+Math.max(9,Math.round(R*0.042))+'px '+MONO; g.textAlign='center'; g.textBaseline='alphabetic'; g.fillStyle=rgbS(fd.s>0?COR.verde:COR.coral,clamp(a,0,1).toFixed(3)); g.fillText((fd.s>0?'▲ ':'▼ ')+sgn(fd.v),c,jy-R*0.03-sobe); } } }
function agulha(esc){ const c=W.c, R=W.R, a=ang(clamp(S.val,-esc*1.04,esc*1.04),esc), ca=Math.cos(a), sa=Math.sin(a), nx=-sa, ny=ca, pt=R*0.93, cd=R*0.1, lb=R*0.012, lp=R*0.003;
  const forma=(ox,oy)=>{ g.beginPath(); g.moveTo(c+ox+ca*pt+nx*lp,c+oy+sa*pt+ny*lp); g.lineTo(c+ox+ca*pt-nx*lp,c+oy+sa*pt-ny*lp); g.lineTo(c+ox-ca*cd-nx*lb,c+oy-sa*cd-ny*lb); g.lineTo(c+ox-ca*cd+nx*lb,c+oy-sa*cd+ny*lb); g.closePath(); };
  forma(1.4,2.4); g.fillStyle='rgba(0,0,0,.5)'; g.fill();
  const cg=S.corAg, grA=g.createLinearGradient(c-ca*cd,c-sa*cd,c+ca*pt,c+sa*pt); grA.addColorStop(0,'#9aa2ab'); grA.addColorStop(0.22,rgbS(cg.map((x,i)=>x*0.75+[205,211,218][i]*0.25))); grA.addColorStop(1,rgbS(cg));   // 13/09: o ponteiro troca de cor com o estado
  forma(0,0); g.fillStyle=grA; g.fill();
  g.strokeStyle='rgba(10,12,15,.35)'; g.lineWidth=0.6; g.beginPath(); g.moveTo(c-ca*cd,c-sa*cd); g.lineTo(c+ca*pt*0.74,c+sa*pt*0.74); g.stroke();
  const r0=pt*0.8; g.strokeStyle=rgbS(cg.map(x=>Math.min(255,x*1.12+22))); g.lineWidth=Math.max(1.4,R*0.006); g.beginPath(); g.moveTo(c+ca*r0,c+sa*r0); g.lineTo(c+ca*pt,c+sa*pt); g.stroke();
  if(S.fxBrilho>0.01&&!calmo){ const hr=R*(0.07+0.05*S.fxBrilho); g.globalCompositeOperation='lighter'; g.globalAlpha=S.fxBrilho*0.8; g.drawImage(halo(cg),c+ca*pt-hr,c+sa*pt-hr,hr*2,hr*2); g.globalAlpha=1; g.globalCompositeOperation='source-over'; }
  g.fillStyle='#262c34'; g.beginPath(); g.arc(c-ca*cd*0.78,c-sa*cd*0.78,R*0.02,0,PI2); g.fill();
  g.fillStyle='#1b2027'; g.beginPath(); g.arc(c,c,R*0.038,0,PI2); g.fill(); g.strokeStyle=rgbS(S.corAg.map(x=>x*0.6+55)); g.lineWidth=1; g.stroke();
  g.beginPath(); g.arc(c,c,R*0.03,0,PI2); g.strokeStyle='rgba(255,255,255,.08)'; g.stroke(); g.fillStyle='#0a0c0f'; g.beginPath(); g.arc(c,c,R*0.012,0,PI2); g.fill();
  if(S.simOn&&S.real!=null){ const ar=ang(clamp(S.real,-esc,esc),esc), p0=P(R*0.2,ar), p1=P(R*0.95,ar); g.setLineDash([3,3]); g.strokeStyle='rgba(230,233,238,.5)'; g.lineWidth=1; g.beginPath(); g.moveTo(p0[0],p0[1]); g.lineTo(p1[0],p1[1]); g.stroke(); g.setLineDash([]); } }
function subAgulha(d,u,cor,txt){ const R=W.R, x=W.c+d.dx*R, y=W.c+d.dy*R, r=R*SUB_R, a=angSub(clamp(u,-1.04,1.04)), ca=Math.cos(a), sa=Math.sin(a);
  g.font='600 '+Math.max(8,Math.round(R*0.04))+'px '+MONO; g.fillStyle=K.txt; g.textAlign='center'; g.textBaseline='middle'; g.fillText(txt,x,y+r*0.62);
  g.strokeStyle=cor; g.lineWidth=1.3; g.beginPath(); g.moveTo(x-ca*r*0.16,y-sa*r*0.16); g.lineTo(x+ca*r*0.8,y+sa*r*0.8); g.stroke();
  g.fillStyle='#1b2027'; g.beginPath(); g.arc(x,y,r*0.085,0,PI2); g.fill(); g.strokeStyle='#6a7583'; g.lineWidth=0.8; g.stroke(); }
function digital(){ const c=W.c, R=W.R, jy=c-R*0.53, v=S.simOn?S.simValor:S.disp;
  g.font='600 '+Math.round(R*0.115)+'px '+MONO; g.textAlign='center'; g.textBaseline='alphabetic'; g.fillStyle=S.real==null?K.dim:rgbS(S.corAg);
  g.fillText(S.real==null?'—':sgn(v),c,jy+R*0.188);
  if(S.simOn){ g.fillStyle='#07090c'; g.fillRect(c-R*0.38,jy+R*0.012,R*0.76,R*0.05); g.font='600 '+Math.max(7,Math.round(R*0.03))+'px '+SANS; g.fillStyle=K.am; g.textBaseline='top'; espacado(g,'CENÁRIO '+sgn(S.simVis*100,1)+'%',c,jy+R*0.022,1.2); } }
function mira(esc){ if(!S.mira||S.simOn) return; const R=W.R, a=S.mira.a, v=(a+Math.PI/2)/VARRE*esc; if(Math.abs(v)>esc*1.001) return;
  const p0=P(R*0.74,a), p1=P(R*1.0,a); g.strokeStyle='rgba(230,233,238,.4)'; g.lineWidth=1; g.beginPath(); g.moveTo(p0[0],p0[1]); g.lineTo(p1[0],p1[1]); g.stroke();
  const txt=sgn(v)+'   Δ '+sgn(v-(S.real||0)); g.font='500 '+Math.max(9,Math.round(R*0.036))+'px '+MONO; const w=g.measureText(txt).width+R*0.05, h=R*0.065;
  const bx=clamp(S.mira.x+14,4,W.s-w-4), by=clamp(S.mira.y-h-10,4,W.s-h-4); caixa(g,bx,by,w,h,R*0.012); g.fillStyle='rgba(10,12,15,.94)'; g.fill(); g.strokeStyle='#2e3540'; g.lineWidth=1; g.stroke();
  g.fillStyle=K.txt; g.textAlign='left'; g.textBaseline='middle'; g.fillText(txt,bx+R*0.025,by+h/2); }

// ---------- háptico e registo ----------
function vibrar(p,forcar){ if(!S.vib||!navigator.vibrate) return; const t=performance.now(); if(!forcar&&t-S.ultVib<350) return; S.ultVib=t; try{navigator.vibrate(p);}catch(e){} }
const EVT={sobe_zero:['Passou a positivo','p'],desce_zero:['Passou a negativo','n'],sobe_esperado:['Acima do esperado','p'],desce_esperado:['Abaixo do esperado','n'],
  sobe_meta:['Meta atingida','p'],desce_meta:['Abaixo da meta','n'],sobe_alvos:['Acima do cenário de alvos','p'],desce_alvos:['Abaixo do cenário de alvos','n'],
  desce_stop:['Stop do dia atingido','n'],sobe_stop:['Saiu da zona de stop','p'],pico:['Novo pico do dia','p'],fecho_ganho:['Posição fechada com lucro','p'],fecho_perda:['Posição fechada com perda','n']};
function evento(k,valor){ const e=EVT[k]; if(!e) return; S.log.unshift({t:hms(),txt:e[0],v:valor,cls:e[1]}); if(S.log.length>8) S.log.length=8; S.flash=1;
  if(/meta|stop|fecho/.test(k)) vibrar(e[1]==='p'?[25,40,25]:[120],true); else vibrar(12); desenharLog(); }
function desenharLog(){ const el=$('md_log'); if(!el) return; el.textContent='';
  for(const x of S.log){ const d=document.createElement('div'); d.className='e'; const t=document.createElement('time'); t.textContent=x.t; const s=document.createElement('span'); s.className=x.cls; s.textContent=x.txt; const b=document.createElement('b'); b.textContent=x.v==null?'':(typeof x.v==='number'?sgn(x.v):x.v); d.append(t,s,b); el.appendChild(d); }
  put('md_log_n',S.log.length+' eventos · sessão'); }
function cruzamentos(v){
  for(const [k,x] of [['zero',0],['esperado',S.esp],['meta',S.meta],['alvos',S.alvos],['stop',S.stopP]]){ if(x==null) continue;
    if(S.cruzX[k]!=null&&Math.abs(S.cruzX[k]-x)>0.01) S.cruz[k]=null; S.cruzX[k]=x;
    const lado=v>=x, ant=S.cruz[k]; S.cruz[k]=lado; if(ant==null||ant===lado||!S.pronto) continue; evento((lado?'sobe_':'desce_')+k,x); }
  if(S.pico!=null&&v>S.pico){ const g2=v-S.pico; S.pico=v; S.picoT=hhmm(); if(S.pronto&&g2>=Math.max(0.25,S.esc*0.02)&&Date.now()-S.ultPico>300000){ evento('pico',v); S.ultPico=Date.now(); } }
  if(S.vale!=null&&v<S.vale){ S.vale=v; S.valeT=hhmm(); } }

// ---------- dados ----------
function precoVivo(p){ const c=S.cr[p.simbolo]; return (c&&c.bin!=null&&c.basis!=null)?c.bin+c.basis:(Number(p.agora)||0); }
function diaCom(m,info){ let v=S.fech||0;
  for(const p of S.pos){ const q=Number(p.qty)||0, e=Number(p.entrada)||0; if(!q||!(e>0)) continue; let pm=precoVivo(p)*(1+m); const al=S.alvoPor[p.simbolo];
    if(m!==0&&al&&q>0&&pm>=al){ pm=al; if(info) info.push(p.simbolo); }
    let b=(pm-e)*q; if(p.cripto) b-=Math.abs(e*q)*(1/(1-TAXA)-1)+Math.abs(pm*q)*TAXA; v+=b; }
  return v; }
function amostra(v){ const t=Date.now()/1000, h=S.hist; if(h.length&&t-h[h.length-1][0]<2) h[h.length-1][1]=v; else h.push([t,v]); while(h.length&&t-h[0][0]>1200) h.shift(); }
function semearHist(tIso,serie){ if(!tIso) return; const dia=String(tIso).slice(0,10), off=String(tIso).slice(19)||'-03:00', agora=Date.now()/1000, pts=[];
  for(const p of serie.slice(-20)){ const t=Date.parse(dia+'T'+p[0]+':30'+off)/1000; if(isFinite(t)&&agora-t<1200&&agora-t>=-60) pts.push([t,Number(p[1])]); }
  const locais=S.hist.filter(p=>!pts.some(q=>Math.abs(q[0]-p[0])<40)); S.hist=pts.concat(locais).sort((a,b)=>a[0]-b[0]); }
function ritmoAgora(){ const t=Date.now()/1000, pts=S.hist.filter(p=>t-p[0]<=600); if(pts.length<3||pts[pts.length-1][0]-pts[0][0]<90) return 0;
  let sx=0,sy=0,sxx=0,sxy=0; const n=pts.length, t0=pts[0][0]; for(const p of pts){ const x=p[0]-t0; sx+=x; sy+=p[1]; sxx+=x*x; sxy+=x*p[1]; } const den=n*sxx-sx*sx; return den>0?(n*sxy-sx*sy)/den*3600:0; }
function ajustarRitEsc(){ const a=Math.abs(S.ritmo); let e=S.ritEsc; if(a>e*0.95) e=escala(a*1.4); else if(a<e*0.2&&e>2) e=Math.max(2,escala(a*1.6)); S.ritEsc=e; }
function efeitoSubida(d,de,ate){ if(Math.abs(d)<0.004) return; const s=d>0?1:-1; S.movT=performance.now(); S.movS=s;   // 13/09: a cor é o movimento
  S.trend=s; S.fxBrilho=Math.min(1,S.fxBrilho+0.35+Math.min(0.65,Math.abs(d)/Math.max(0.01,S.esc*0.02)));
  if(S.fxDelta&&S.fxDelta.s===s&&S.fxDelta.t<0.7){ S.fxDelta.v+=d; S.fxDelta.t=0.12; } else S.fxDelta={v:d,s,t:0};
  if(!calmo){ if(s>0&&(!S.fxVarre||S.fxVarre.t>0.6)) S.fxVarre={t:0}; S.fxRastro={de,ate,t:0,s}; } forcar=true; }
function recalcular(){ if(S.fech==null) return; const novo=diaCom(0), antes=S.real; S.real=novo; if(antes!=null&&S.pronto) efeitoSubida(novo-antes,antes,novo);
  S.escAlvo=escala(Math.max(4,Math.abs(novo),Math.abs(S.esp||0),Math.abs(S.alvos||0),Math.abs(S.meta||0),Math.abs(S.pico||0),Math.abs(S.vale||0),Math.abs(S.stopP||0))*1.12);
  amostra(novo); cruzamentos(novo); forcar=true; }
let ws=null, wsFalhas=0, pollT=null, rq=false, chaveWs='';
function tick(s,p,b,a){ const c=S.cr[s]; if(!c||!(p>0)) return; if(c.basis==null) c.basis=c.agora-p; c.bin=p; if(b>0&&a>0) S.spread[s]=(a/b-1)*1e4; S.ultTick=Date.now(); if(!rq){ rq=true; setTimeout(()=>{rq=false; recalcular();},telemovel?500:200); } }
function iniciarPoll(){ if(pollT) return; const f=async()=>{
    for(const s of Object.keys(S.cr)){ try{ const r=await fetch('https://api.binance.com/api/v3/ticker/bookTicker?symbol='+s.replace(/USD$/,'USDT')); const j=await r.json(); if(j&&j.bidPrice&&j.askPrice) tick(s,(Number(j.bidPrice)+Number(j.askPrice))/2,Number(j.bidPrice),Number(j.askPrice)); }catch(e){} }
    try{ const r=await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22%5D'); const j=await r.json(); for(const x of j||[]) S.mercado[x.symbol]={c:Number(x.lastPrice),o:Number(x.openPrice)}; }catch(e){} };
  f(); pollT=setInterval(f,5000); }
function ligarBinance(){ const syms=Object.keys(S.cr).sort(), streams=syms.map(s=>s.replace(/USD$/,'USDT').toLowerCase()+'@bookTicker').concat(['btcusdt@miniTicker','ethusdt@miniTicker']), ch=streams.join('/');
  if(ch===chaveWs&&ws) return; chaveWs=ch; try{ if(ws){ ws.onclose=null; ws.close(); } }catch(e){} ws=null; if(pollT) return;
  try{ ws=new WebSocket('wss://stream.binance.com:9443/stream?streams='+ch);
    ws.onopen=()=>{wsFalhas=0;};
    ws.onmessage=ev=>{ try{ const m=JSON.parse(ev.data), d=m.data||m;
      if(d.e==='24hrMiniTicker') S.mercado[d.s]={c:Number(d.c),o:Number(d.o)};
      else if(d.b&&d.a) tick(String(d.s||'').replace(/USDT$/,'USD'),(Number(d.b)+Number(d.a))/2,Number(d.b),Number(d.a)); }catch(e){} };
    ws.onclose=()=>{ ws=null; wsFalhas++; if(wsFalhas>=3) iniciarPoll(); else setTimeout(()=>{ chaveWs=''; ligarBinance(); },1500*wsFalhas); };
    ws.onerror=()=>{ try{ws.close();}catch(e){} };
  }catch(e){ iniciarPoll(); } }
window.medidorVivo=function(v){ try{
  const gn=v.ganho||{}, pl=v.cartao_plano||{}, pos=v.posicoes||[], md=v.medidor||{}, lim=v.limites||{};
  const fech=Number(gn.liquido_realista_usd!=null?gn.liquido_realista_usd:(gn.realizado_usd||0));
  const novo={}; pos.filter(p=>p.cripto&&p.qty).forEach(p=>{ const s=String(p.simbolo), ant=S.cr[s]||{}; novo[s]={bin:ant.bin,basis:ant.bin!=null?Number(p.agora)-ant.bin:null,agora:Number(p.agora)}; });
  S.pat=v.patrimonio||{}; S.gv=((v.gv||{}).garantido)||{};   // 20/09: o bloco O dinheiro e os tres cartoes
  S.cr=novo; S.pos=pos; S.plano=pl; S.gn=gn; S.je=v.ja_entrou||{}; S.aloc=v.alocacao||{}; S.nAcoes=pos.filter(p=>!p.cripto).length; S.bolsa=!!(v.precos||{}).bolsa_aberta;
  S.alvoPor={}; (pl.posicoes||[]).forEach(x=>{ if(x.alvo) S.alvoPor[x.simbolo]=Number(x.alvo); });
  if(S.fech!=null&&S.pronto){ if(fech>S.fech+0.005) evento('fecho_ganho',fech-S.fech); else if(fech<S.fech-0.005) evento('fecho_perda',fech-S.fech); }
  S.fech=fech;
  const pnl={}; pos.forEach(p=>{ pnl[p.simbolo]=Number(p.pnl_aberto_usd||0); });
  const sem=pl.sem_estimativa||[], semAlvo=(pl.posicoes||[]).filter(x=>x.no_alvo_usd==null).map(x=>x.simbolo);
  S.esp=pl.posicoes?fech+Number(pl.esperado_usd||0)+sem.reduce((s,k)=>s+(pnl[k]||0),0):null;
  S.alvos=pl.n_com_alvo?fech+Number(pl.no_alvo_usd||0)+semAlvo.reduce((s,k)=>s+(pnl[k]||0),0):null;
  if(lim.perda_dia_usd!=null){ S.limite=Number(lim.perda_dia_usd); S.limAc=lim.perda_acoes_usd; S.limCr=lim.perda_cripto_usd; S.capital=lim.capital_usd; }
  // 24/09: o ponteiro conta as posicoes DESDE A ENTRADA; o stop e de UM dia. `herd` e o que as posicoes abertas ja valiam
  // na primeira corrida do dia (painel: cartoes.marcas_do_dia). O dia desde a abertura = ponteiro - herd, e no mostrador
  // o stop fica onde esse dia o toca: limite + herd. Sem marca (herd null) o mostrador fica como era e o texto diz porque.
  { const da=lim.dia_abertura||{}, h=Number(da.herdado_usd); S.herd=(da.herdado_usd!=null&&isFinite(h))?h:null; S.herdDesde=da.desde||''; S.herdErro=da.erro||''; S.trava=lim.trava||{};
    S.stopP=S.limite==null?null:S.limite+(S.herd==null?0:S.herd); }
  if(md.dia){ if(md.dia!==S.dataDia){ S.dataDia=md.dia; S.pico=Number(md.pico); S.picoT=md.pico_t||''; S.vale=Number(md.vale); S.valeT=md.vale_t||''; }
    else { if(Number(md.pico)>=(S.pico==null?-1e9:S.pico)){ S.pico=Number(md.pico); S.picoT=md.pico_t||S.picoT; } if(Number(md.vale)<=(S.vale==null?1e9:S.vale)){ S.vale=Number(md.vale); S.valeT=md.vale_t||S.valeT; } } }
  if(Array.isArray(md.serie)){ S.serie=md.serie; semearHist(v.t_iso,md.serie); }
  if(S.meta==null){ const b=S.alvos!=null?S.alvos:(S.esp!=null?Math.max(S.esp,fech)*1.3:(S.capital||390)*0.01); S.meta=Math.max(1,Math.ceil(b)); }
  ligarBinance(); recalcular(); textos(); tabelaPos(); desenharTrilho();
  if(!S.pronto){ S.pronto=true; S.disp=S.real||0; S.teste=calmo?0:0.0001; S.log.unshift({t:hms(),txt:'Instrumento ligado',v:S.real,cls:''}); desenharLog(); }
}catch(e){ if(window.console) console.warn('instrumento',e); } };

// ---------- DOM ----------
const cacheTxt={}, cacheCls={};
function put(id,txt){ if(cacheTxt[id]===txt) return; cacheTxt[id]=txt; const e=$(id); if(e) e.textContent=txt; }
function sinal(id,v){ const k=v==null?'':(v>0.004?'p':(v<-0.004?'n':'')); if(cacheCls[id]===k) return; cacheCls[id]=k; const e=$(id); if(e){ e.classList.remove('p','n'); if(k) e.classList.add(k); } }
function larg(id,pct,esq){ const e=$(id); if(!e) return; const w=clamp(pct,0,100).toFixed(1)+'%'; if(e.style.width!==w) e.style.width=w; if(esq!=null){ const l=clamp(esq,0,100).toFixed(1)+'%'; if(e.style.left!==l) e.style.left=l; } }
const US=v=>v==null||!isFinite(v)?'—':sgn(v);
const dist=x=>(S.real==null||x==null)?'':'Δ '+sgn(S.real-x);
function textos(){ if(S.real==null) return; const ab=S.real-(S.fech||0);
  put('md_dia_data',S.dataDia||''); put('md_agora',US(S.real)); sinal('md_agora',S.real); put('md_fech',US(S.fech)); sinal('md_fech',S.fech); put('md_aberto',US(ab)); sinal('md_aberto',ab);
  // 20/09 (ordem dele): os CARTOES do saldo. Mesma fonte do mostrador - aqui so se escolhe o que vai em grande.
  // Nao ha conta nova nenhuma: `ab` e o mesmo aberto do md_aberto e S.je e o acumulado dos fills da corretora.
  const gn=S.gn||{}, jea=S.je||{};   // jea: o nome je ja e usado mais abaixo nesta mesma funcao
  const kv=(id,v)=>{ const e=$(id); if(!e) return; const t=US(v); if(cacheTxt[id]!==t){ cacheTxt[id]=t; e.textContent=t; }
                     const k=v==null?'':(v>0.004?'p':(v<-0.004?'n':'')); if(cacheCls[id]!==k){ cacheCls[id]=k; e.className='v'+(k?' '+k:''); } };
  kv('k_ent',gn.entrou_hoje_usd); put('k_ent_det',(gn.n_entrou_hoje||0)+' entrada(s) hoje');
  kv('k_sai',gn.saiu_hoje_usd); put('k_sai_det',(gn.n_saiu_hoje||0)+' saída(s) hoje');
  kv('k_hoje',S.fech);
  kv('k_entrou',jea.liquido); put('k_entrou_det',(jea.operacoes!=null?jea.operacoes+' operações':'')+(jea.acerto_pct!=null?' · acerto '+Number(jea.acerto_pct).toFixed(1)+'%':''));
  kv('k_aberto',ab); put('k_aberto_det',S.pos.length+' posição(ões) aberta(s)');
  kv('k_prev',S.esp); put('k_prev_det',dist(S.esp));
  // ganhos, perdas e volatil: o mesmo corte que a pagina antiga fazia - FACTO contra ESTIMATIVA.
  const gv=S.gv||{};
  kv('k_gan',gv.ganhos_usd); put('k_gan_det',(gv.n_ganhos||0)+' opera\u00e7\u00f5es com lucro'+(gv.ganho_medio_usd!=null?' \u00b7 m\u00e9dia '+US(gv.ganho_medio_usd):''));
  kv('k_per',gv.perdas_usd); put('k_per_det',(gv.n_perdas||0)+' opera\u00e7\u00f5es com preju\u00edzo'+(gv.perda_media_usd!=null?' \u00b7 m\u00e9dia '+US(gv.perda_media_usd):''));
  put('k_res',gv.valor_usd!=null?'resultado '+US(gv.valor_usd)+' (com a taxa)'+(gv.acerto_pct!=null?' \u00b7 acerto '+Number(gv.acerto_pct).toFixed(1)+'%':''):'');
  const pt=S.pat||{};
  kv('k_vol',(pt.total||{}).em_aberto); put('k_vol_det','a\u00e7\u00f5es '+US((pt.acoes||{}).em_aberto)+' \u00b7 cripto '+US((pt.cripto||{}).em_aberto));
  // a TABELA e a linha do 'comecamos com' - o que ele deu por falta na foto de 20/09
  if(pt.total){
    const lin=[['j\u00e1 entrou (facto)','ja_entrou'],['em aberto (estimativa)','em_aberto'],['soma','soma']];
    const cel=(o,c)=>'<td class="'+(Number((o||{})[c]||0)<0?'neg':'pos')+'">'+US((o||{})[c])+'</td>';
    const html=lin.map(([rot,c])=>'<tr><td>'+rot+'</td>'+cel(pt.acoes,c)+cel(pt.cripto,c)+cel(pt.total,c).replace('>','><b>').replace('</td>','</b></td>')+'</tr>').join('');
    const tb=document.querySelector('#t_dinheiro tbody');
    if(tb&&cacheTxt.t_dinheiro!==html){ cacheTxt.t_dinheiro=html; tb.innerHTML=html; }
    const res='Come\u00e7\u00e1mos com <b>'+US(pt.capital_inicial)+' US$</b> \u00b7 vale agora <b>'+US(pt.valor_agora)+' US$</b>'
      +(pt.variacao_pct!=null?' ('+US(pt.variacao_pct)+'%)':'')
      +' \u00b7 s\u00f3 com o que j\u00e1 entrou: <b>'+US(pt.valor_so_realizado)+' US$</b>'
      +(pt.variacao_realizada_pct!=null?' ('+US(pt.variacao_realizada_pct)+'%)':'');
    const dr=$('dinheiro_resumo');
    if(dr&&cacheTxt.dinheiro_resumo!==res){ cacheTxt.dinheiro_resumo=res; dr.innerHTML=res; }
  }
  const desde=(S.serie&&S.serie.length&&String(S.serie[0][0])>'00:30')?' · registo desde '+S.serie[0][0]:'';
  put('md_pico',US(S.pico)); put('md_pico_t',(S.picoT||'')+desde); put('md_vale',US(S.vale)); put('md_vale_t',S.valeT||'');
  const rec=S.pico!=null?S.real-S.pico:null; put('md_recuo',rec==null?'—':sgn(rec)); sinal('md_recuo',rec); put('md_ritmo',sgn(S.ritmoV,2)+' /h'); sinal('md_ritmo',S.ritmoV);
  put('md_esp',US(S.esp)); put('md_esp_f',dist(S.esp)); put('md_alvo',US(S.alvos)); put('md_alvo_f',dist(S.alvos)); put('md_meta',US(S.meta)); put('md_meta_f',dist(S.meta)+(S.metaUser?'':' · sugerida'));
  // 24/09: DUAS linhas, porque misturadas deram 184%. (1) a TRAVA DO DIA - o que as travas dos executores usam de facto:
  // a cripto o seu realizado do dia (UTC) contra 3%, o juiz o dia das accoes contra 1%; manda o lado mais perto do tecto.
  // (2) o DIA COM O ABERTO desde a abertura (BRT) contra o stop do dia - nao trava nada, mede.
  const dA=(S.real==null||S.herd==null)?null:S.real-S.herd;
  put('md_stop',US(S.limite)); put('md_stop_f',S.limite!=null&&dA!=null?'margem '+sgn(dA-S.limite):'');
  const uso=(S.limite!=null&&S.limite<0&&dA!=null)?Math.max(0,-dA)/-S.limite*100:null; put('md_stop_uso',uso==null?'—':uso.toFixed(0)+'%'); larg('md_stop_bar',uso||0);
  put('md_stop_desde',S.herd==null?(S.herdErro?'sem marca de abertura':'—'):'desde as '+(S.herdDesde||'00:00')+' · '+US(dA));
  { const tr=S.trava||{}, n=x=>(x==null||!isFinite(Number(x)))?null:Number(x), uC=n(tr.cripto_uso_pct), uA=n(tr.acoes_uso_pct);
    const lados=[['cripto',uC],['ações',uA]].filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1]);
    put('md_trava_uso',lados.length?lados[0][1].toFixed(0)+'% '+lados[0][0]:'—'); larg('md_trava_bar',lados.length?lados[0][1]:0);
    const ac=n(tr.acoes_dia_usd)!=null?US(n(tr.acoes_dia_usd)):(tr.acoes_estado||'—');
    put('md_trava_det','cripto '+US(n(tr.cripto_realizado_usd))+' de '+US(n(tr.cripto_tecto_usd))+' · ações '+ac+' de '+US(n(tr.acoes_tecto_usd))+(tr.acoes_t&&n(tr.acoes_dia_usd)!=null?' (juiz '+tr.acoes_t+' NY)':'')); }
  const cap=Number(S.capital||0), usoCr=Number(S.aloc.em_uso_cripto||0), usoAc=Number(S.aloc.em_uso_acoes||0), usado=usoCr+usoAc;
  put('md_cap',cap?(usado/cap*100).toFixed(0)+'%':'—'); put('md_cap_f',cap?'US$ '+usado.toFixed(0)+' / '+cap.toFixed(0):''); larg('md_cap_cr',cap?usoCr/cap*100:0,0); larg('md_cap_ac',cap?usoAc/cap*100:0,cap?usoCr/cap*100:0);
  put('md_cr','US$ '+usoCr.toFixed(2)+(cap?'  '+(usoCr/cap*100).toFixed(0)+'%':'')); put('md_ac','US$ '+usoAc.toFixed(2)+(cap?'  '+(usoAc/cap*100).toFixed(0)+'%':'')); put('md_livre',cap?'US$ '+(cap-usado).toFixed(2):'—');
  const je=S.je||{}; put('md_odo',je.liquido!=null?sgn(Number(je.liquido)):'—'); sinal('md_odo',je.liquido); put('md_acerto',je.acerto_pct!=null?Number(je.acerto_pct).toFixed(1)+'%  '+(je.n_ganhos||0)+'/'+((je.n_ganhos||0)+(je.n_perdas||0)):'—');
  put('md_medias',(je.ganho_medio!=null?sgn(Number(je.ganho_medio)):'—')+' · '+(je.perda_media!=null?sgn(Number(je.perda_media)):'—')); put('md_ops',je.operacoes!=null?String(je.operacoes):'—');
  put('md_ops_hoje','hoje '+(S.gn.n_entrou_hoje||0)+' ↑ '+(S.gn.n_saiu_hoje||0)+' ↓');
  for(const [s,id] of [['BTCUSDT','md_btc'],['ETHUSDT','md_eth']]){ const m=S.mercado[s]; if(!m||!(m.c>0)) continue; put(id,m.c.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})); const ch=(m.c/m.o-1)*100; put(id+'_p',sgn(ch,2)+'%'); sinal(id+'_p',ch); }
  const sp=Object.entries(S.spread)[0]; put('md_spread',sp?sp[1].toFixed(1)+' pb':'—'); put('md_spread_s',sp?sp[0].replace(/USD$/,'')+' · livro Binance':'');
  const nCr=Object.keys(S.cr).length, idade=S.ultTick?Math.round((Date.now()-S.ultTick)/1000):null, vivo=idade!=null&&idade<60;
  const lb=$('md_led_bin'); if(lb) lb.classList.toggle('ok',vivo||Object.keys(S.mercado).length>0); put('md_bin_idade',idade==null?(Object.keys(S.mercado).length?'mercado':'—'):idade+' s');
  const ls=$('md_led_bolsa'); if(ls) ls.classList.toggle('ok',S.bolsa); put('md_bolsa','NYSE '+(S.bolsa?'aberta':'fechada'));
  put('md_fonte',(nCr?(vivo?'Cripto ao segundo pelo livro da Binance, ancorado ao preço da Alpaca.':'Cripto ao minuto (a ligar à Binance).'):'Sem posições de cripto.')+' '+(S.nAcoes?(S.bolsa?'Ações ao minuto.':'Ações: bolsa fechada, preço do último fecho.'):''));
  if(vivo&&nCr){ const el=$('k_aberto'), tx=(typeof fmt==='function'?fmt(ab):sgn(ab))+' US$'; if(el&&cacheTxt.k_ab!==tx){ cacheTxt.k_ab=tx; el.textContent=tx; el.className='v '+(typeof cls==='function'?cls(ab):(ab>=0?'up':'dn')); }
    put('k_aberto_seg','mexe ao segundo (Binance, ancorada ao preço da Alpaca)'); window.__mdVivo=true; } }
function relogio(){ const d=new Date(); put('md_rel_utc','UTC '+d.toISOString().slice(11,19)); put('md_rel_ny','NY '+d.toLocaleTimeString('en-GB',{timeZone:'America/New_York'})); }
function tabelaPos(){ const tb=$('md_pos'); if(!tb) return; const planos={}; (S.plano&&S.plano.posicoes||[]).forEach(x=>{ planos[x.simbolo]=x; });
  let tot=0, tp=0; const linhas=[];
  for(const p of S.pos){ const s=String(p.simbolo), q=Number(p.qty)||0, e=Number(p.entrada)||0, a=precoVivo(p), val=q*a, pl=(a-e)*q, pct=e&&q?pl/Math.abs(e*q)*100:0, x=planos[s]||{}, al=x.alvo?Number(x.alvo):null;
    tot+=Math.abs(val); tp+=pl;
    const dis=al&&a?(al/a-1)*100:null, prog=al&&al>e?clamp((a-e)/(al-e),0,1):null;
    let prazo='—'; if(x.sai_em){ const ms=Date.parse(x.sai_em)-Date.now(); if(isFinite(ms)){ const m=Math.max(0,Math.round(ms/60000)); prazo=Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m'; } }
    const qd=Math.abs(q)>=100?q.toFixed(2):(Math.abs(q)>=1?q.toFixed(3):q.toFixed(4));
    linhas.push('<tr><td>'+escH(s.replace(/USD$/,''))+'<small>'+(p.cripto?'CRIPTO':(q<0?'AÇÃO · CURTA':'AÇÃO'))+'</small></td><td>'+qd+'</td><td>'+fmtP(e)+'</td><td>'+fmtP(a)+'</td><td>'+Math.abs(val).toFixed(2)+'</td>'+
      '<td class="'+(pl>0.004?'p':(pl<-0.004?'n':''))+'">'+sgn(pl)+'</td><td class="'+(pct>0.004?'p':(pct<-0.004?'n':''))+'">'+sgn(pct,2)+'%</td><td>'+(al?fmtP(al):'—')+'</td><td>'+(dis!=null?sgn(dis,2)+'%':'—')+'</td>'+
      '<td>'+(prog!=null?'<span class="ins-prog"><i style="width:'+(prog*100).toFixed(1)+'%"></i></span> <small>'+(prog*100).toFixed(0)+'%</small>':'<small>sem alvo</small>')+'</td><td>'+prazo+'</td></tr>'); }
  const html=linhas.join('')||'<tr><td colspan="11" style="color:var(--d)">sem posições abertas</td></tr>'; if(cacheTxt.md_pos_html!==html){ cacheTxt.md_pos_html=html; tb.innerHTML=html; }
  put('md_pos_res',S.pos.length+' posições · exposição US$ '+tot.toFixed(2)+' · P&L bruto '+sgn(tp)); }
const tcv=$('md_trilho'), tg=tcv&&tcv.getContext('2d');
function desenharTrilho(){ if(!tg) return; const w=tcv.clientWidth, h=tcv.clientHeight; if(!w||!h) return; const d=Math.min(2,window.devicePixelRatio||1);
  if(tcv.width!==Math.round(w*d)||tcv.height!==Math.round(h*d)){ tcv.width=Math.round(w*d); tcv.height=Math.round(h*d); } tg.setTransform(d,0,0,d,0,0); tg.clearRect(0,0,w,h);
  const pts=S.serie.map(p=>Number(p[1])); if(S.real!=null) pts.push(S.real);
  tg.font='500 9px '+MONO; tg.textBaseline='middle';
  if(pts.length<2){ tg.fillStyle=K.dim; tg.fillText('o trilho aparece com os minutos',2,h/2); return; }
  const dir=40, cw=w-dir; let lo=Math.min(0,...pts), hi=Math.max(0,...pts); if(S.esp!=null){ lo=Math.min(lo,S.esp); hi=Math.max(hi,S.esp); } const pad=(hi-lo)*0.1||1; lo-=pad; hi+=pad;
  const X=i=>1+(cw-2)*i/(pts.length-1), Y=v=>h-3-(h-6)*(v-lo)/(hi-lo);
  tg.strokeStyle='rgba(255,255,255,.05)'; tg.lineWidth=1; for(const f of [0.25,0.5,0.75]){ tg.beginPath(); tg.moveTo(0,Math.round(h*f)+0.5); tg.lineTo(cw,Math.round(h*f)+0.5); tg.stroke(); }
  tg.strokeStyle='rgba(138,148,163,.45)'; tg.setLineDash([2,3]); tg.beginPath(); tg.moveTo(0,Y(0)); tg.lineTo(cw,Y(0)); tg.stroke();
  if(S.esp!=null){ tg.strokeStyle='rgba(232,176,75,.55)'; tg.beginPath(); tg.moveTo(0,Y(S.esp)); tg.lineTo(cw,Y(S.esp)); tg.stroke(); } tg.setLineDash([]);
  const cor=(S.real||0)>=0?K.up:K.dn, gr=tg.createLinearGradient(0,0,0,h); gr.addColorStop(0,(S.real||0)>=0?'rgba(62,207,142,.16)':'rgba(255,90,95,.16)'); gr.addColorStop(1,'rgba(0,0,0,0)');
  tg.beginPath(); pts.forEach((v,i)=>{ if(i) tg.lineTo(X(i),Y(v)); else tg.moveTo(X(i),Y(v)); }); tg.strokeStyle=cor; tg.lineWidth=1.4; tg.stroke();
  tg.lineTo(X(pts.length-1),h); tg.lineTo(X(0),h); tg.closePath(); tg.fillStyle=gr; tg.fill();
  const iMax=pts.indexOf(Math.max(...pts)), iMin=pts.indexOf(Math.min(...pts));
  tg.fillStyle=K.br; tg.beginPath(); tg.arc(X(iMax),Y(pts[iMax]),2,0,PI2); tg.fill(); tg.fillStyle=K.mut; tg.beginPath(); tg.arc(X(iMin),Y(pts[iMin]),2,0,PI2); tg.fill();
  tg.fillStyle=cor; tg.beginPath(); tg.arc(X(pts.length-1),Y(pts[pts.length-1]),2.6,0,PI2); tg.fill();
  tg.fillStyle=K.dim; tg.textAlign='right'; tg.fillText(sgn(hi-pad,1),w-1,7); tg.fillText(sgn(lo+pad,1),w-1,h-7); tg.fillText('0',w-1,Y(0));
  put('md_trilho_escala',(S.serie[0]?S.serie[0][0]:'')+' → '+hhmm()); }

// ---------- interacção ----------
let arr=null;
function acertar(x,y,raio){ let best=null,bd=1e9; for(const h of S.hits){ const d=Math.hypot(h.x-x,h.y-y); if(d<bd){ bd=d; best=h; } } return bd<=raio?best:null; }
function alvosTxt(){ const ps=(S.plano&&S.plano.posicoes||[]).filter(x=>x.alvo); return ps.map(x=>String(x.simbolo).replace(/USD$/,'')+' vende a '+fmtP(x.alvo)).join(' · '); }
function textoDica(h){ const d=x=>S.real==null||x==null?'':(x>S.real?'faltam '+sgn(x-S.real):'acima em '+sgn(S.real-x));
  switch(h.tipo){
  case 'esperado': return ['ESP '+sgn(S.esp),'Resultado que o backtest espera no fim das posições abertas, já com as taxas. '+d(S.esp)+'.'];
  case 'alvos': return ['ALV '+sgn(S.alvos),'Resultado do dia se as regras de saída atingirem os alvos. '+(alvosTxt()?alvosTxt()+'. ':'')+d(S.alvos)+'.'];
  case 'meta': return ['META '+sgn(S.meta),'Meta do dia neste aparelho (+ − para ajustar). '+d(S.meta)+'.'];
  case 'stop': return ['STOP '+sgn(S.limite),'Stop do dia: ações '+(S.limAc!=null?sgn(Number(S.limAc)):'—')+' (1%), cripto '+(S.limCr!=null?sgn(Number(S.limCr)):'—')+' (3%).'+(S.herd!=null?' O ponteiro conta as posições desde a entrada e '+sgn(S.herd)+' já vinha de antes das '+(S.herdDesde||'00:00')+'; por isso, no mostrador, o dia toca o stop em '+sgn(S.stopP)+'.':' Sem marca de abertura: o mostrador mistura dias anteriores.')+' Quem trava de facto: a cripto pelo realizado do dia, o juiz das ações pelo dia das ações.'];
  case 'pico': return ['PICO '+sgn(S.pico),'Máximo do dia'+(S.picoT?' às '+S.picoT:'')+'.'];
  case 'vale': return ['VALE '+sgn(S.vale),'Mínimo do dia'+(S.valeT?' às '+S.valeT:'')+'.'];
  } return null; }
function posDica(x,y){ if(!dica||dica.hidden) return; const b=palco.getBoundingClientRect(), w=dica.offsetWidth||200, hh=dica.offsetHeight||60;
  dica.style.transform='translate('+Math.round(clamp(x+14,4,b.width-w-4))+'px,'+Math.round(clamp(y-hh-12,4,b.height-hh-4))+'px)'; }
function mostrarDica(h,x,y){ if(!dica) return; const t=h&&textoDica(h); if(!t){ dica.hidden=true; return; } dica.textContent=''; const bb=document.createElement('b'); bb.textContent=t[0]; dica.append(bb,document.createTextNode(t[1])); dica.hidden=false; posDica(x,y); }
function esconderDica(){ if(dica) dica.hidden=true; }
function mudarMeta(dd){ if(S.meta==null) S.meta=0; const passo=Math.max(0.5,Math.round(S.esc/20*2)/2); S.meta=Math.round((S.meta+dd*passo)*2)/2; S.metaUser=true; LS.set('md_meta_'+hoje(),String(S.meta)); S.cruz.meta=null; S.foco={tipo:'meta',ate:performance.now()+1500}; vibrar(8,true); recalcular(); textos(); }
function miraDe(x,y){ const dx=x-W.c, dy=y-W.c, r=Math.hypot(dx,dy); if(r<W.R*0.66||r>W.R*1.12) return null; let a=Math.atan2(dy,dx); if(a>Math.PI/4&&a<Math.PI*0.75) return null; if(a>=Math.PI*0.75) a-=PI2; return {a,x,y}; }
palco.tabIndex=0;
palco.addEventListener('pointerdown',e=>{ const b=palco.getBoundingClientRect(), x=e.clientX-b.left, y=e.clientY-b.top; arr={id:e.pointerId,x0:x,y0:y,modo:'talvez',hit:acertar(x,y,e.pointerType==='mouse'?16:26)}; });
palco.addEventListener('pointermove',e=>{ const b=palco.getBoundingClientRect(), x=e.clientX-b.left, y=e.clientY-b.top;
  if(!arr){ if(e.pointerType!=='mouse') return; const h=acertar(x,y,16); S.mira=h?null:miraDe(x,y); forcar=true;
    if((h&&h.tipo)!==(S.hover&&S.hover.tipo)){ S.hover=h; if(h) mostrarDica(h,x,y); else if(performance.now()>S.tipAte) esconderDica(); } else if(h) posDica(x,y); return; }
  if(arr.id!==e.pointerId) return; const dx=x-arr.x0;
  if(arr.modo==='talvez'&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(y-arr.y0)){ arr.modo='sim'; try{palco.setPointerCapture(e.pointerId);}catch(_){} S.simOn=true; S.mira=null; vibrar(10,true); esconderDica(); }
  if(arr.modo==='sim'){ const u=clamp(dx/(b.width*0.45),-1,1); S.simM=Math.sign(u)*Math.pow(Math.abs(u),1.6)*0.12; } });
function soltar(e){ if(!arr||arr.id!==e.pointerId) return;
  if(arr.modo==='sim'){ S.simOn=false; S.simM=0; vibrar([8,30,8],true); }
  else if(e.type==='pointerup'&&arr.hit){ mostrarDica(arr.hit,arr.x0,arr.y0); S.tipAte=performance.now()+3000; S.foco={tipo:arr.hit.tipo,ate:performance.now()+1500}; }
  arr=null; }
palco.addEventListener('pointerup',soltar); palco.addEventListener('pointercancel',soltar);
palco.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse'&&!arr){ S.mira=null; S.hover=null; forcar=true; if(performance.now()>S.tipAte) esconderDica(); } });
palco.addEventListener('dblclick',()=>{ if(!calmo) S.teste=0.0001; });
let simTecla=null;
palco.addEventListener('keydown',e=>{ if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); S.simOn=true; S.simM=clamp(S.simM+(e.key==='ArrowRight'?0.005:-0.005),-0.12,0.12); clearTimeout(simTecla); simTecla=setTimeout(()=>{ S.simOn=false; S.simM=0; },900); }
  else if(e.key==='+'||e.key==='='){ mudarMeta(1); } else if(e.key==='-'){ mudarMeta(-1); } });
document.querySelectorAll('#medidor .ins-r[data-m]').forEach(el=>el.addEventListener('click',()=>{ const t=el.dataset.m; S.foco={tipo:t,ate:performance.now()+2000}; const h=S.hits.find(x=>x.tipo===t); if(h){ mostrarDica(h,h.x,h.y); S.tipAte=performance.now()+2500; } }));
const bM=$('md_meta_menos'), bP=$('md_meta_mais'), bV=$('md_vib'), bF=$('md_full');
if(bM) bM.addEventListener('click',()=>mudarMeta(-1)); if(bP) bP.addEventListener('click',()=>mudarMeta(1));
function rotulos(){ if(bV){ bV.textContent=navigator.vibrate?(S.vib?'Háptico ligado':'Háptico'):'Háptico indisponível'; bV.classList.toggle('on',S.vib); } }
if(bV) bV.addEventListener('click',()=>{ S.vib=!S.vib; LS.set('md_vib',S.vib?'1':'0'); if(S.vib) vibrar([20,30,20],true); rotulos(); });
function ecra(on){ secao.classList.toggle('full',on); if(bF){ bF.classList.toggle('on',on); bF.textContent=on?'Sair do ecrã inteiro':'Ecrã inteiro'; }
  try{ if(on&&secao.requestFullscreen&&!document.fullscreenElement) secao.requestFullscreen().catch(()=>{}); if(!on&&document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }catch(e){} setTimeout(medir,80); }
if(bF) bF.addEventListener('click',()=>ecra(!secao.classList.contains('full')));
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement&&secao.classList.contains('full')) ecra(false); });
rotulos(); if(window.IntersectionObserver) new IntersectionObserver(es=>{ S.visivel=es[0].isIntersecting||secao.classList.contains('full'); }).observe(secao);
setTimeout(()=>{ baseChave=''; desenharTrilho(); },0);   // TORRE: sem CDN nao ha webfont a esperar — so o redesenho que o site fazia depois do load
window.__md={S,W,recalcular};
ligarBinance();

// ---------- ciclo ----------
let tAnt=performance.now();
function quadro(ts){ requestAnimationFrame(quadro); const dt=Math.min(0.05,Math.max(0,(ts-tAnt)/1000)); tAnt=ts; if(!S.visivel||document.hidden) return;
  let alvo=S.real==null?0:S.real;
  if(S.simOn){ S.simVis+=(S.simM-S.simVis)*Math.min(1,dt*12); const info=[]; S.simValor=diaCom(S.simVis,info); S.simInfo=info; alvo=S.simValor; } else S.simVis*=Math.exp(-dt*8);
  if(S.teste>0){ S.teste+=dt; const p=S.teste; if(p<0.45) alvo=S.esc*Math.sin(p/0.45*Math.PI/2); else if(p<1.0){ const u=(p-0.45)/0.55; alvo=S.esc*(1-u)+(S.real||0)*u; } if(p>1.2) S.teste=0; }
  const k=calmo?80:34, am=2*Math.sqrt(k)*(calmo?1:0.86); S.vel+=(k*(alvo-S.val)-am*S.vel)*dt; S.val+=S.vel*dt;
  S.disp+=((S.simOn?S.simValor:(S.real||0))-S.disp)*Math.min(1,dt*8);
  S.esc=S.escAlvo;   // 13/09: um instrumento muda de escala de uma vez — a animar, os numerais passavam por -6.1, -25
  S.ritmoV+=(S.ritmo-S.ritmoV)*Math.min(1,dt*2); S.flash=Math.max(0,S.flash-dt*1.2);
  // 13/09 ("trava demais no mobile"): um instrumento parado não precisa de 60 frames por segundo. Só se redesenha quando
  // algo muda — ponteiro em movimento, cenário, mira, foco, dados novos, escala — e em repouso 1 vez por segundo.
  S.fxBrilho=Math.max(0,S.fxBrilho-dt*0.9); const corA=corAlvoAgulha(S.val); let corMexe=false; for(let i=0;i<3;i++){ const dc=corA[i]-S.corAg[i]; if(Math.abs(dc)>0.8) corMexe=true; S.corAg[i]+=dc*Math.min(1,dt*12); }
  const esc=S.esc, agoraMs=performance.now(), dispAlvo=S.simOn?S.simValor:(S.real||0);
  const mexe=forcar||S.simOn||S.teste>0||S.flash>0.001||Math.abs(S.vel)>esc*2e-4||Math.abs(alvo-S.val)>esc*2e-4||Math.abs(S.disp-dispAlvo)>0.004||S.esc!==S.escAlvo||Math.abs(S.ritmoV-S.ritmo)>0.004||(S.foco&&S.foco.ate>agoraMs)||baseChave!==chave()||agoraMs-ultDesenho>1000||corMexe||S.fxBrilho>0.01||!!S.fxDelta||!!S.fxVarre||!!S.fxRastro||(agoraMs-(S.movT||-1e9))<3600;
  const mexe30=mexe&&(forcar||!telemovel||agoraMs-ultDesenho>=33);   // 13/09: no telemóvel os efeitos ficam a 30 fps
  if(mexe30){ forcar=false; ultDesenho=agoraMs;
  if(baseChave!==chave()) desenharBase();
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,cv.width,cv.height); g.drawImage(base,0,0); g.setTransform(W.dpr,0,0,W.dpr,0,0);
  zonas(esc); banda(esc); efeitos(esc,dt); indices(esc);
  const cap=Number(S.capital||0), usado=Number(S.aloc.em_uso_cripto||0)+Number(S.aloc.em_uso_acoes||0), pctCap=cap?usado/cap*100:0, pctMeta=S.meta>0?Math.max(0,(S.simOn?S.simValor:(S.real||0)))/S.meta*100:0;
  subAgulha(SUBS[0],(S.ritmoV||0)/Math.max(0.1,S.ritEsc),(S.ritmoV||0)>=0?K.up:K.dn,sgn(S.ritmoV||0,2)+'/h');
  subAgulha(SUBS[1],-1+2*clamp(pctCap,0,100)/100,K.txt,pctCap.toFixed(0)+'%');
  subAgulha(SUBS[2],-1+2*clamp(pctMeta,0,125)/125,K.am,pctMeta.toFixed(0)+'%');
  digital(); agulha(esc); mira(esc); }
  if(S.tipAte&&performance.now()>S.tipAte&&!S.hover){ S.tipAte=0; esconderDica(); }
  S.txtT-=dt; if(S.txtT<=0){ S.txtT=1; textos(); relogio(); }
  S.posT-=dt; if(S.posT<=0){ S.posT=telemovel?3:1; tabelaPos(); }
  S.segT-=dt; if(S.segT<=0){ S.segT=1; S.ritmo=ritmoAgora(); ajustarRitEsc(); }
  S.srT-=dt; if(S.srT<=0){ S.srT=10; desenharTrilho(); if(S.real!=null) put('md_sr','Resultado do dia '+sgn(S.real)+' dólares; esperado '+(S.esp!=null?sgn(S.esp):'sem estimativa')+'; meta '+(S.meta!=null?sgn(S.meta):'—')+'.'); } }
requestAnimationFrame(quadro);
})();
