// t3b_torre.js — A TORRE 3BRAIN EM 3D. Versao da ORDEM DE OBRA de 03/10/2026 (visual_fable/ORDEM_DE_OBRA_VISUAL_03out.md).
// three.js r170 local (sala/vendor/three). Copia do anterior: t3b_torre.js.bak_03out_visual.
//
// PONTO A PONTO (as palavras dele entre aspas) e onde vive cada coisa aqui:
//  1 TORRE DE LONGE (q01, q19, q21, r01): a silhueta da antiga com TORCAO CONTINUA - a pele ja nao e uma pilha de caixas
//    rodadas andar a andar (os degraus de 03/10), e UMA superficie que torce ao longo da altura (geometriaDaPele); as
//    lajes ficam um pouco para fora: as "fatias nas arestas". Vidro ESCURO com o reflexo do CEU pela hora real (ceuEnv) e
//    montantes verticais. De longe nada de quadradinhos acesos nem faixas (as janelas e as faixas por sector so aparecem a
//    aproximar). "falta so dar uma atencao nos LEDs, a movimentacao dela enquanto ninguem mexe, a pulsacao dela com LEDs
//    conforme actividade": os LEDs das arestas RESPIRAM em repouso, um PULSO sobe a torre a cada evento real e cada andar
//    brilha pela sua actividade dos ultimos minutos (passoLeds). Helice DNA, capsulas no poco, farol do vigia, dia/noite e
//    clima pelo mercado: activos.
//  2 LETREIRO (q22, r02 "ta muito pequeno e pouco visivel, quero melhor"): holograma a girar por cima do topo, mais largo do
//    que a torre: o logo 3B em OURO SOLIDO com contorno de neon dentro de um ANEL DE LUZ + "TORRE 3BRAIN" em LEDs numa
//    banda que gira ao contrario. Os LEDs das faces do atico ficam ("mistura um pouco de cada").
//  3 HOLOGRAMAS: a torre projecta as ancoras de cada andar ('ancoras') e os rotulos dos andares ao lado (como a antiga);
//    o t3b_holo.js poe cada painel a altura do SEU andar.
//  4 GAVETA (q20, r04): o andar desliza para fora e a CAMARA AFASTA-SE para o ver inteiro (enquadrarGaveta: a gaveta cabe
//    na zona livre do palco, a torre fica para tras); os hologramas saem do caminho (CSS, .palco.perto).
//  6 RESOLUCAO: o renderer nunca desce abaixo do devicePixelRatio (1,25 no ecra dele) e comeca acima (2x) - a escada so
//    desce ate ao DPR; quadros a 60 fps quando o desenho e barato, 30 quando nao.
// AS TRAVAS DE SEMPRE: nada se reconstroi quando chegam dados; instancias para o que se repete; nada de movimento
// inventado (o que respira em repouso e a luz, nunca um boneco ou um numero).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as ANDAR from './t3b_andar.js';

const T3B = window.T3B, U = T3B.util, $ = U.$;

// ---------------------------------------------------------------- a planta
const W = 54, D = 28, H = 4.2, LAJE = 0.42;
const TORCAO = THREE.MathUtils.degToRad(3.6);   // q01: os 3,6 graus por andar da antiga - agora CONTINUOS ao longo da altura
const R_HELICE = Math.hypot(W, D) / 2 + 3.0;
const COR = { ouro: 0xf2c230, ouroHi: 0xffdc6a, ouroDk: 0x7e6210, cy: 0x2dd4e8, vi: 0xb265f5, ok: 0x3fd69a, am: 0xfbbf24, mau: 0xff5a5f };
const COR_DIV = { Dados: 0x2dd4e8, Negociacao: 0xf2c230, Controlo: 0xb265f5, Topo: 0xf3e9cf };
const COR_ESPECIE = ANDAR.COR_ESPECIE;
const calmo = U.calmo;
const EIXO_Y = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------- estado
const palco = $('palco'), cv = $('cena');
let renderer, cena, camara, controles, pmrem;
let torre = null, aberto = null;
const animados = [];
let precisaDesenhar = true, ultimoMexeu = 0, nivel = -1, jaEnquadrou = false, noite = true;
const alvoCam = { anim: null };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler(), _c2 = new THREE.Color(), _v = new THREE.Vector3();

function temWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

// ================================================================ a resolucao (ponto 6) e a LEVEZA (obra 4, 04/10)
// 03/10: a escada descia ate 0,7x e nunca subia -> piso no devicePixelRatio. 04/10 (ele, p02: "pesado em TUDO: o browser
// trava, ao abrir, ao rodar, na gaveta, no escritorio, a ventoinha dispara"; p01: "automatico - nitido parado, leve a
// mexer"). MEDIDO antes (placa Intel Iris Xe, 1536x690 a 1,25, sonda fps1536): o quadro desenhava SEMPRE a 2x e a 30-40
// fps, mexesse algo ou nao - o Chrome inteiro a 150-290% de um nucleo. Agora o quadro desenha pelo que MEXE:
//   interaccao (ele a arrastar/rodar/aproximar, a camara a viajar, a gaveta a deslizar) -> todos os quadros, ao DPR do ecra
//                (1,25 nele; desce a 1,0 so se a maquina nao aguentar)                                    = leve a mexer
//   vivo       (a torre a girar sozinha, o letreiro, pulsos, capsulas, bonecos a andar)  -> 20 fps na torre (0,1 grau por
//                quadro), 30 dentro do andar, ao DPR do ecra (nitido: e a resolucao real do ecra dele)
//   repouso    (nada mexe a nao ser a respiracao dos LEDs) -> 6 quadros/s a 2x; sem respiracao (reduced motion) so quando
//                um dado muda                                                                              = nitido parado
// O piso continua o DPR (nunca borrado); o tecto 2x. A troca de resolucao so sobe depois de 450 ms no modo novo (sem
// pisca-pisca), e desce logo (o primeiro arrasto ja e leve).
const DPR = Math.max(1, window.devicePixelRatio || 1);
// (medido 04/10: a 1,5x a torre a girar sozinha custava ~30% mais placa grafica do que ao DPR, sem diferenca visivel a girar;
//  o nitido extra - 2x - fica para quando para de vez)
// 05/10 (Q4 D1 "sempre 60"; MEDIDO na placa dele com a torre a trabalhar, perfil_t3b.js --pr): a girar ao DPR (1,25) a pagina
// tinha 24-30 quadros/s; a 1,0 tem 49-50 - a 1,25 a placa pinta 1,56x mais pixeis (com o alisamento) a cada quadro. A mexer
// (girar sozinha ou ele a arrastar) a torre desenha-se a 1,0; parada de todo continua nitida (repouso, 2x).
// 07/10 (Q5 D1, ele: "quero mais fluido, mas tambem nitidez"): a girar sozinha comeca NITIDA (ao DPR) e a escada so desce a 1,0
// se os quadros abrandarem; a arrastar continua a 1,0 (ai manda a fluidez)
const PR = { interaccao: [1, 1], vivo: [DPR, 1], repouso: [Math.max(DPR, Math.min(2, DPR * 1.6)), Math.max(DPR, 1.5)] };
const CADENCIA = { interaccao: 0, vivo: 0, repouso: 160 };   // 05/10 (Q4 D1): vivo = todos os quadros do ecra (era 30/s; 20 a girar sozinha)
const degrau = { interaccao: 0, vivo: 0, repouso: 0 };
let modoQ = 'vivo', modoDesde = 0, prPedido = 0, msQuadro = 33, custos = [], intervalos = [], ultQ = 0, desenhadosN = 0, msDesenho = [], cadPedida = 33.3;
function pixelRatio() { const v = PR[modoQ]; return Math.max(1, v[Math.min(degrau[modoQ], v.length - 1)]); }
function aplicarPR(agora) {
  const alvo = pixelRatio(), actual = renderer.getPixelRatio();
  if (Math.abs(alvo - actual) < 0.01) return;
  if (alvo > actual && agora - modoDesde < 450) return;                 // subir a nitidez so com o modo assente
  renderer.setPixelRatio(alvo); renderer.setSize(vistaW, vistaH, false); precisaDesenhar = true;
}
// a escada por modo: se os quadros pedidos nao chegam (intervalo real >> pedido), esse modo desce um degrau; com folga
// longa volta a subir. So mede quando desenha seguido (nao no repouso, onde o intervalo e de proposito longo).
function medirCusto(ms, intervalo, agora) {
  msDesenho.push(ms); if (msDesenho.length > 120) msDesenho.shift();
  if (modoQ === 'repouso' || !intervalo || intervalo > 400) return;
  intervalos.push(intervalo); if (intervalos.length > 60) intervalos.shift();
  if (intervalos.length < 45 || agora - ultQ < 3000) return;
  // (o intervalo PEDIDO e o que o quadro pediu de facto: a cadencia do modo ou o relogio da pagina - t3b_ritmo.js - se for mais
  //  lento; sem isto, os 20 quadros/s de proposito pareciam uma maquina lenta e a escada borrava a imagem)
  const v = intervalos.slice().sort((a, b) => a - b), med = v[v.length >> 1], pedido = modoQ === 'interaccao' ? 16.7 : Math.max(16.7, cadPedida);
  const d = degrau[modoQ], n = PR[modoQ].length;
  if (med > pedido * 1.45 && d < n - 1) degrau[modoQ] = d + 1;
  else if (med < pedido * 1.1 && d > 0 && agora - ultQ > 12000) degrau[modoQ] = d - 1;
  else return;
  ultQ = agora; intervalos.length = 0; aplicarPR(agora + 1e6);
}

// ================================================================ arranque
function iniciar() {
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio());
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  cena = new THREE.Scene();
  camara = new THREE.PerspectiveCamera(38, 1, 0.5, 4000);
  camara.position.set(260, 190, 330);
  pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;   // a luz de dentro dos escritorios (bonecos, mobilia)
  luzes(); chao(); clima();
  // cena.add(criarGlobo().grupo);   // 04/10 20:1x, ele: "o globo, eu nao gostei, pode remover" - fora (o codigo fica para o questionario)                                                     // obra 4: o globo dos mercados (G23)
  controles = new OrbitControls(camara, cv);
  controles.enableDamping = true; controles.dampingFactor = 0.08;
  controles.minDistance = 4; controles.maxDistance = 1100; controles.maxPolarAngle = Math.PI * 0.495;
  controles.autoRotate = false; controles.autoRotateSpeed = 1.0;   // 07/10 (Q5 D3 'a torre nao ta girando'): 0,35 era ~2 graus/s, parecia parada; 1,0 = uma volta por minuto                       // q18: gira devagar sozinha
  controles.target.set(0, 58 * H * 0.45, 0);
  controles.addEventListener('change', () => { precisaDesenhar = true; camaraMudou = true; });
  // 04/10: o arrasto dele e o modo "interaccao" (todos os quadros, leve); 'camLivre' = ele mexeu na camara desde o ultimo
  // enquadramento - a partir dai um redimensionar ou um andar que acaba de carregar NAO lhe arranca a camara ("camara salta")
  controles.addEventListener('start', () => { alvoCam.anim = null; ultimoMexeu = performance.now(); controles.autoRotate = false; interagindo = true; camLivre = true; });
  controles.addEventListener('end', () => { ultimoMexeu = performance.now(); interagindo = false; fimInteracao = performance.now(); });
  medirPalco(true);
  if (window.ResizeObserver) new ResizeObserver(() => medirPalco(false)).observe(palco);
  ligarRato(); ligarNiveis();
  T3B.on('estrutura', construirOuActualizar);
  T3B.on('eventos', receberEventos);
  T3B.on('abrirAndar', d => abrirAndar(d.n, d.voar));
  T3B.on('layout', () => { rectsSujos = true; rotulosPendentes = true; medirPalco(false); });
  T3B.on('torre', T => { climaPeloMercado(T); if (aberto && aberto.pronto) { ANDAR.pintarEcra(aberto.texEcra, CTX); ANDAR.pintarParedes(aberto, CTX); ANDAR.actualizarFita(aberto, CTX); precisaDesenhar = true; } });
  T3B.on('holo:fita', () => { if (aberto && aberto.pronto) { ANDAR.pulsoFita(aberto); precisaDesenhar = true; } });
  T3B.on('alertas', aplicarAlertas);
  T3B.on('holo:globo', d => arcoNoGlobo(d.ev));
  // as cotacoes da Binance ao segundo (o reactor marca S.ultTick a cada uma): o mercado pisca no globo (nao e um evento da torre:
  // nao acende cartoes nem bate o coracao - t3b_ligacoes.js so o da ao globo)
  let ultTick = 0; setInterval(() => { const S = window.__md && window.__md.S; if (!S || !S.ultTick || S.ultTick === ultTick || document.hidden) return; ultTick = S.ultTick; if (window.__t3bHolo) window.__t3bHolo.injectar([{ k: 'cotacao', id: 'binance_real', andar: 49, quem: 'Binance', txt: 'cotação' }]); }, 1000);
  T3B.on('resultadoDia', () => climaPeloMercado(T3B.estado.T));
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); const a = $('aviso3d'); if (a) { a.hidden = false; a.textContent = 'O navegador perdeu o contexto 3D. Recarregue a página.'; } });
  if (T3B.estado.EST) construirOuActualizar(T3B.estado.EST);
  else { const a = $('aviso3d'); if (a) { a.hidden = false; a.className = 'aviso3d carrega'; a.textContent = 'a montar a torre…'; } }
  requestAnimationFrame(quadro);
}
let vistaW = 0, vistaH = 0, camaraMudou = true, interagindo = false, fimInteracao = 0, camLivre = false;
function medirPalco(primeira) {
  const r = palco.getBoundingClientRect(), w = Math.max(200, Math.round(r.width)), h = Math.max(160, Math.round(r.height));
  if (!primeira && w === vistaW && h === vistaH) return;
  vistaW = w; vistaH = h; renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix();
  precisaDesenhar = true; camaraMudou = true; rectsSujos = true;
  deslocarVista(nivel);
  // c02 "camara salta": so se re-enquadra quando a camara esta no enquadramento de um nivel; se ele a pos noutro sitio, fica
  if (!primeira && torre && !alvoCam.anim && !camLivre) enquadrar(nivel < 0 ? 0 : nivel, false);
}
let rectsSujos = true;

// ================================================================ luz e CEU pela hora real de Brasilia (q21 dia e noite)
let luzSol, luzHemi, luzAmb;
const PRESETS = [
  { h: 0, ceu: 0x05060a, nev: 0x06070b, sol: 0.25, hemi: 0.35, exp: 1.0, z: '#04060d', hz: '#141c30', ch: '#06070b' },
  { h: 5, ceu: 0x0a0b12, nev: 0x0b0c12, sol: 0.3, hemi: 0.4, exp: 1.0, z: '#070a14', hz: '#1c2238', ch: '#07080c' },
  { h: 7, ceu: 0x2a2018, nev: 0x241c16, sol: 0.9, hemi: 0.6, exp: 1.05, z: '#1d2a44', hz: '#c58a55', ch: '#120e0a' },
  { h: 10, ceu: 0x1a2230, nev: 0x182030, sol: 1.25, hemi: 0.8, exp: 1.1, z: '#2a4c7a', hz: '#9fbcd6', ch: '#1a1d22' },
  { h: 16, ceu: 0x1c2030, nev: 0x1a1e2c, sol: 1.15, hemi: 0.75, exp: 1.08, z: '#294670', hz: '#a8bfd4', ch: '#1a1c22' },
  { h: 18, ceu: 0x2a1a10, nev: 0x22160e, sol: 0.7, hemi: 0.55, exp: 1.05, z: '#1a1d3a', hz: '#d0874a', ch: '#140d08' },
  { h: 20, ceu: 0x080810, nev: 0x090910, sol: 0.3, hemi: 0.4, exp: 1.0, z: '#05070e', hz: '#18203a', ch: '#06070b' },
  { h: 24, ceu: 0x05060a, nev: 0x06070b, sol: 0.25, hemi: 0.35, exp: 1.0, z: '#04060d', hz: '#141c30', ch: '#06070b' }];
function luzes() {
  luzHemi = new THREE.HemisphereLight(0xfff4dc, 0x14100a, 0.6); cena.add(luzHemi);
  luzSol = new THREE.DirectionalLight(0xfff0d0, 1.0); luzSol.position.set(160, 300, 120); cena.add(luzSol);
  luzAmb = new THREE.AmbientLight(0xffffff, 0.12); cena.add(luzAmb);
  cena.fog = new THREE.Fog(0x06070b, 900, 3000);
  aplicarHora(); setInterval(aplicarHora, 60000);
}
function horaBRT() { const d = new Date(Date.now() - 3 * 3600000); return d.getUTCHours() + d.getUTCMinutes() / 60; }
let ceuTex = null, ceuAss = '';
function aplicarHora() {
  const h = horaBRT(); let a = PRESETS[0], b = PRESETS[PRESETS.length - 1];
  for (let i = 0; i < PRESETS.length - 1; i++) if (h >= PRESETS[i].h && h < PRESETS[i + 1].h) { a = PRESETS[i]; b = PRESETS[i + 1]; break; }
  const k = THREE.MathUtils.smoothstep((h - a.h) / Math.max(0.01, b.h - a.h), 0, 1);
  cena.background = new THREE.Color(a.ceu).lerp(new THREE.Color(b.ceu), k); cena.fog.color.copy(new THREE.Color(a.nev).lerp(new THREE.Color(b.nev), k));
  luzSol.intensity = THREE.MathUtils.lerp(a.sol, b.sol, k); luzHemi.intensity = THREE.MathUtils.lerp(a.hemi, b.hemi, k);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(a.exp, b.exp, k);
  noite = h < 6.5 || h > 19;
  // o ceu que o vidro reflecte (ponto 1: "vidro escuro com reflexo do ceu"): refaz-se a mudanca de quarto de hora
  const ass = Math.round(h * 4) + '';
  if (ass !== ceuAss) { ceuAss = ass; ceuEnv(a, b, k, h); }
  if (torre) pintarJanelas();
  precisaDesenhar = true;
}
function misturaHex(x, y, k) { return '#' + new THREE.Color(x).lerp(new THREE.Color(y), k).getHexString(); }
function ceuEnv(a, b, k, h) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  const zen = misturaHex(a.z, b.z, k), hor = misturaHex(a.hz, b.hz, k), chao = misturaHex(a.ch, b.ch, k);
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, zen); gr.addColorStop(0.47, hor); gr.addColorStop(0.53, '#0c0d10'); gr.addColorStop(1, chao);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  // o brilho do sol (de dia) ou o halo da cidade (de noite), na direccao da luz
  const sx = 512 * 0.62, sy = noite ? 122 : 70 + 40 * Math.abs(h - 13) / 7;
  const rg = g.createRadialGradient(sx, sy, 2, sx, sy, noite ? 160 : 120);
  rg.addColorStop(0, noite ? 'rgba(242,194,48,.18)' : 'rgba(255,240,210,.85)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 512, 256);
  // umas nuvens longas e baixas (o vidro de um arranha-ceus nunca reflecte um ceu liso)
  g.globalAlpha = noite ? 0.06 : 0.18; g.fillStyle = '#ffffff';
  for (let i = 0; i < 7; i++) { const y = 60 + i * 13, x = (i * 97) % 512; g.beginPath(); g.ellipse(x, y, 90 + i * 12, 5 + (i % 3), 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x - 512, y, 90 + i * 12, 5 + (i % 3), 0, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  const env = pmrem.fromEquirectangular(t).texture; t.dispose();
  const velho = ceuTex;
  ceuTex = env;
  MATS_CEU.forEach(m => { m.envMap = ceuTex; m.needsUpdate = true; });
  if (velho) velho.dispose();
}
const MATS_CEU = new Set();
function comCeu(m) { MATS_CEU.add(m); return m; }

// ---------------------------------------------------------------- o chao: praca escura com a grelha de ouro
function chao() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#09090c'; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgba(242,194,48,.10)'; g.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(40, 40); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.CircleGeometry(900, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0.15, envMapIntensity: 0.2 }));
  m.rotation.x = -Math.PI / 2; m.position.y = -0.05; cena.add(m);
  const anel = new THREE.Mesh(new THREE.RingGeometry(R_HELICE + 6, R_HELICE + 6.6, 128), new THREE.MeshBasicMaterial({ color: COR.ouro, transparent: true, opacity: 0.55, toneMapped: false }));
  anel.rotation.x = -Math.PI / 2; anel.position.y = 0.02; cena.add(anel);
}

// ---------------------------------------------------------------- o clima pelo mercado (q21): chuva em queda, sol em alta
// 07/10 (Q5 C2, cl_mercado + ele: "vamos seguir a intensidade do ganho (sol mais forte, com raios e ate algumas coisas referindo
// ao calor e praia, quanto mais quente mais clima de verao) e assim sucessivamente com os outros climas"): I = forca do dia
// (|resultado| / ESCALA_CLIMA, ~2% do capital = 1); sol cresce, raios a girar e calor no horizonte; chuva mais densa e rapida, e
// com perda grande vira TEMPESTADE com relampagos.
const CLIMA = { modo: 'neutro', chuva: null, sol: null, I: 0, flash: 0, proxFlash: 3 };
const ESCALA_CLIMA = 10;      // US$ do dia que dao a forca maxima (capital ~US$500: 2%)
function texturaRaios() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), m = 128;
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, gr = g.createLinearGradient(m, m, m + Math.cos(a) * 128, m + Math.sin(a) * 128);
    gr.addColorStop(0, 'rgba(255,230,160,.55)'); gr.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(m, m);
    g.lineTo(m + Math.cos(a - 0.06) * 128, m + Math.sin(a - 0.06) * 128); g.lineTo(m + Math.cos(a + 0.06) * 128, m + Math.sin(a + 0.06) * 128); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function clima() {
  const N = 900, pos = new Float32Array(N * 3), vel = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 420; pos[i * 3 + 1] = Math.random() * 320; pos[i * 3 + 2] = (Math.random() - 0.5) * 420; vel[i] = 60 + Math.random() * 50; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  CLIMA.chuva = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9cc8e8, size: 1.6, transparent: true, opacity: 0, sizeAttenuation: true, depthWrite: false }));
  CLIMA.chuva.visible = false; CLIMA.vel = vel; cena.add(CLIMA.chuva);
  CLIMA.sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaHalo(), color: 0xffd98a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  CLIMA.sol.scale.set(260, 260, 1); CLIMA.sol.position.set(-300, 420, -420); CLIMA.sol.visible = false; cena.add(CLIMA.sol);
  CLIMA.raios = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaRaios(), color: 0xffe2a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  CLIMA.raios.scale.set(620, 620, 1); CLIMA.raios.position.copy(CLIMA.sol.position); CLIMA.raios.visible = false; cena.add(CLIMA.raios);
  CLIMA.calor = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaHalo(), color: 0xff9a3c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  CLIMA.calor.scale.set(1400, 360, 1); CLIMA.calor.position.set(0, 40, -700); CLIMA.calor.visible = false; cena.add(CLIMA.calor);
  CLIMA.relampago = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaHalo(), color: 0xdfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  CLIMA.relampago.scale.set(1600, 1000, 1); CLIMA.relampago.position.set(120, 380, -520); CLIMA.relampago.visible = false; cena.add(CLIMA.relampago);
}
function climaPeloMercado(T) {
  // q21 "chuva em queda, sol em alta": o MESMO resultado do dia que o velocimetro mostra (o instrumento ao segundo:
  // realizado + o aberto); o medidor.agora do ficheiro ficava a 0,00 com o dia a -10 US$ e nunca chovia
  const r = (T && T.reactor) || {}; let v = Number(T3B.estado.resultadoDia); if (!isFinite(v)) v = Number((r.medidor || {}).agora); if (!isFinite(v)) v = Number((r.ganho || {}).realizado_usd); if (!isFinite(v)) return;
  const modo = v < -0.5 ? 'chuva' : v > 0.5 ? 'sol' : 'neutro', I = Math.min(1, Math.abs(v) / ESCALA_CLIMA);
  const us = (v >= 0 ? '+' : '') + v.toFixed(2) + ' US$';
  U.txt($('pc_clima'), modo === 'chuva' ? (I > 0.55 ? 'tempestade · ' : 'chuva · ') + us : modo === 'sol' ? (I > 0.6 ? 'sol de verão · ' : I > 0.25 ? 'sol forte · ' : 'sol · ') + us : 'limpo · ' + us);
  if (Math.abs(I - CLIMA.I) > 0.04) { CLIMA.I = I; precisaDesenhar = true; }
  if (modo === CLIMA.modo) return; CLIMA.modo = modo; precisaDesenhar = true;
  if (CLIMA.chuva) CLIMA.chuva.visible = modo === 'chuva' || CLIMA.chuva.material.opacity > 0.01;
  if (CLIMA.sol) CLIMA.sol.visible = modo === 'sol' || CLIMA.sol.material.opacity > 0.01;
}
function passoClima(dt) {
  if (!CLIMA.chuva) return false; let mexe = false;
  const mc = CLIMA.chuva.material, ms = CLIMA.sol.material;
  // 07/10 (ele: "o escritorio de perto ficou bugado"): a chuva (agora mais densa e rapida) caia DENTRO do escritorio e os relampagos
  // clareavam a cena - o clima e da vista de fora: dentro de um andar/escritorio (nivel >= 2) tudo se apaga devagar e volta ao sair
  const fora = nivel < 2, I = fora ? (CLIMA.I || 0) : 0;
  const aC = fora && CLIMA.modo === 'chuva' ? 0.35 + 0.55 * I : 0, aS = fora && CLIMA.modo === 'sol' ? (noite ? 0.06 + 0.12 * I : 0.3 + 0.55 * I) : 0;
  if (CLIMA.raios) {                                                      // (Q5 C2) raios, calor e relampagos pela forca
    const mr = CLIMA.raios.material, mq = CLIMA.calor.material, ml = CLIMA.relampago.material;
    const aR = fora && CLIMA.modo === 'sol' && I > 0.25 ? (noite ? 0.04 : 0.5 * I) : 0, aQ = fora && CLIMA.modo === 'sol' && !noite ? 0.32 * I : 0;
    mr.opacity += (aR - mr.opacity) * Math.min(1, dt * 1.2); mq.opacity += (aQ - mq.opacity) * Math.min(1, dt * 1.0); mr.rotation += dt * (0.04 + 0.08 * I);
    CLIMA.raios.visible = mr.opacity > 0.01; CLIMA.calor.visible = mq.opacity > 0.01;
    CLIMA.sol.scale.setScalar(220 + 180 * (CLIMA.modo === 'sol' ? I : 0));
    if (fora && CLIMA.modo === 'chuva' && I > 0.55) { CLIMA.proxFlash -= dt; if (CLIMA.proxFlash <= 0) { ml.opacity = 0.75 + 0.25 * Math.random(); CLIMA.proxFlash = 3 + Math.random() * 6; } }
    ml.opacity = Math.max(0, ml.opacity - dt * 5); CLIMA.relampago.visible = ml.opacity > 0.01;
    if (CLIMA.raios.visible || CLIMA.relampago.visible) mexe = true;
  }
  if (Math.abs(mc.opacity - aC) > 0.005) { mc.opacity += (aC - mc.opacity) * Math.min(1, dt * 1.5); mexe = true; }
  if (Math.abs(ms.opacity - aS) > 0.005) { ms.opacity += (aS - ms.opacity) * Math.min(1, dt * 1.2); mexe = true; }
  CLIMA.chuva.visible = mc.opacity > 0.01; CLIMA.sol.visible = ms.opacity > 0.01;
  if (CLIMA.chuva.visible) { const p = CLIMA.chuva.geometry.attributes.position.array, v = CLIMA.vel; for (let i = 0; i < v.length; i++) { p[i * 3 + 1] -= v[i] * dt * (1 + (CLIMA.I || 0)); if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 320; } CLIMA.chuva.geometry.attributes.position.needsUpdate = true; mexe = true; }
  return mexe;
}

// ================================================================ A TORRE
// 04/10 (c02 "camara salta" / "bugado"): a assinatura tinha o NUMERO DE SECTORES de cada andar - o recrutamento abre sectores
// varias vezes por hora e a torre inteira era deitada fora e refeita, com o escritorio aberto a fechar e a reabrir (os bonecos
// voltavam todos ao lugar, a camara ficava a olhar para um andar vazio uns segundos). Agora a torre so se refaz quando os
// ANDARES mudam (um andar novo, um que sai das obras); sectores novos refazem so as faixas da fachada, no lugar.
function assinatura(est) { return (est.andares || []).map(a => a.n + ':' + a.obra).join('|'); }
function assinaturaSectores(est) { return (est.andares || []).map(a => a.n + ':' + (a.sectores || []).map(s => s.id + '=' + s.n).join(',')).join('|'); }
function construirOuActualizar(est) { try { construirOuActualizar_(est); } catch (e) { window.__t3bErro = String(e && e.stack || e).slice(0, 600); throw e; } }
function construirOuActualizar_(est) {
  if (!renderer) return;
  const ass = assinatura(est);
  if (torre && torre.ass === ass) {
    const as = assinaturaSectores(est);
    if (as !== torre.assSec) refazerFaixas(est, as);
    actualizarCores(est); verPessoal(est); return;
  }
  if (torre) { cena.remove(torre.grupo); descartar(torre.grupo); MATS_CEU.clear(); }
  construirTorre(est, ass);
  if (!window.__t3bPre) { window.__t3bPre = 1; const pre = () => ANDAR.carregarModelos().catch(() => {}); if (window.requestIdleCallback) requestIdleCallback(pre, { timeout: 6000 }); else setTimeout(pre, 3000); }
  const av = $('aviso3d'); if (av && av.classList.contains('carrega')) av.hidden = true;
  if (aberto) { const n = aberto.n; aberto = null; abrirAndar(n, false); }
}
// q13 CONTRATACAO e DEMISSAO pelos DADOS: o /estrutura.json (de minuto a minuto) traz quantos funcionarios tem cada andar.
// Se o andar aberto ganhou gente desde a ultima leitura, cada novo sai do elevador e senta-se; se perdeu, alguem levanta-se
// com uma caixa e sai pelo elevador. (As mensagens 'contratacao' do chat sao o censo da torre inteira, sem andar de destino.)
function verPessoal(est) {
  if (!aberto || !aberto.pronto) return;
  const a = (est.andares || []).find(x => x.n === aberto.n); if (!a) return;
  const n = a.n_peoes || 0, antes = aberto.nPeoes;
  aberto.nPeoes = n;
  if (antes == null || n === antes) return;
  const d = Math.max(-3, Math.min(3, n - antes));
  for (let i = 0; i < Math.abs(d); i++) setTimeout(() => { if (!aberto || !aberto.pronto) return; ANDAR.eventoNoAndar(aberto, { k: 'falou', tipo: d > 0 ? 'contratacao' : 'demissao', andar: aberto.n, s: 'p' + Date.now() + i, quem: d > 0 ? 'contratado (' + a.nome + ')' : '' }, CTX); }, i * 2500);
}
function descartar(o) { o.traverse(x => { if (x.geometry && !x.isSprite) x.geometry.dispose(); if (x.material) [].concat(x.material).forEach(m => { if (m.map && m.map.userData.partilhada !== true) m.map.dispose(); m.dispose(); }); }); }
function matrizDoAndar(a, x, y, z, ry, sx, sy, sz, angExtra) {
  const ang = a.ang + (angExtra || 0), c = Math.cos(ang), s = Math.sin(ang);
  _p.set(x * c + z * s, a.y + y, -x * s + z * c); _q.setFromEuler(_e.set(0, ang + (ry || 0), 0)); _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
  return _m.compose(_p, _q, _s);
}
// o angulo da torcao a uma altura y (CONTINUO: um andar e 3,6 graus, meio andar 1,8)
function angDe(y) { return y / H * TORCAO; }

// --- a pele (ponto 1): vidro escuro com montantes e o spandrel; as luzes das janelas noutra camada (so de perto)
let texVidro = null, texLuzes = null;
const PANO = 1.5, PANOS_AZ = 8;
function texturasDaPele() {
  if (texVidro) return;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const pw = 1024 / PANOS_AZ, esp = Math.round(512 * 0.16);
  let sem = 11; const rnd = () => { sem = (sem * 1103515245 + 12345) & 0x7fffffff; return (sem >> 8) / 8388608; };
  for (let i = 0; i < PANOS_AZ; i++) {
    const x = i * pw, t = rnd() * 0.10;
    const gr = g.createLinearGradient(0, 0, 0, 512 - esp);
    gr.addColorStop(0, 'rgb(' + Math.round(44 + 20 * t) + ',' + Math.round(58 + 22 * t) + ',' + Math.round(74 + 22 * t) + ')');
    gr.addColorStop(0.5, 'rgb(' + Math.round(22 + 14 * t) + ',' + Math.round(30 + 16 * t) + ',' + Math.round(42 + 16 * t) + ')');
    gr.addColorStop(1, 'rgb(' + Math.round(12 + 8 * t) + ',' + Math.round(17 + 9 * t) + ',' + Math.round(24 + 9 * t) + ')');
    g.fillStyle = gr; g.fillRect(x, 0, pw, 512);
    g.save(); g.globalAlpha = 0.06 + 0.05 * t; g.fillStyle = '#dfeeff'; g.beginPath(); g.moveTo(x + pw * 0.12, 512 - esp); g.lineTo(x + pw * 0.52, 0); g.lineTo(x + pw * 0.70, 0); g.lineTo(x + pw * 0.30, 512 - esp); g.fill(); g.restore();
  }
  g.fillStyle = '#0a0d12'; g.fillRect(0, 512 - esp, 1024, esp);                          // o spandrel (a faixa opaca do pavimento)
  g.fillStyle = '#28323d'; g.fillRect(0, 512 - esp - 4, 1024, 4); g.fillRect(0, 0, 1024, 3);
  for (let i = 0; i <= PANOS_AZ; i++) { g.fillStyle = '#05070a'; g.fillRect(i * pw - 4, 0, 8, 512); g.fillStyle = 'rgba(170,190,210,.42)'; g.fillRect(i * pw + 4, 0, 2, 512 - esp); }   // os montantes verticais
  texVidro = new THREE.CanvasTexture(c); texVidro.wrapS = texVidro.wrapT = THREE.RepeatWrapping; texVidro.colorSpace = THREE.SRGBColorSpace; texVidro.anisotropy = 8; texVidro.userData.partilhada = true;
  const c2 = document.createElement('canvas'); c2.width = 512; c2.height = 256; const g2 = c2.getContext('2d');
  g2.fillStyle = '#000'; g2.fillRect(0, 0, 512, 256);
  sem = 7; const pw2 = 512 / PANOS_AZ, esp2 = Math.round(256 * 0.16);
  for (let i = 0; i < PANOS_AZ; i++) {
    const v = rnd(); if (v > 0.66) continue;
    const tipo = (rnd() * 3) | 0, gr = g2.createLinearGradient(0, 10, 0, 256 - esp2);
    const cor = tipo === 0 ? '255,226,168' : tipo === 1 ? '214,232,255' : '255,240,210';
    gr.addColorStop(0, 'rgba(' + cor + ',0.95)'); gr.addColorStop(1, 'rgba(' + cor + ',0.35)');
    g2.fillStyle = gr; g2.fillRect(i * pw2 + 4, 8, pw2 - 8, 256 - esp2 - 12);
  }
  texLuzes = new THREE.CanvasTexture(c2); texLuzes.wrapS = texLuzes.wrapT = THREE.RepeatWrapping; texLuzes.colorSpace = THREE.SRGBColorSpace; texLuzes.userData.partilhada = true;
}
// A GEOMETRIA DA PELE: UMA superficie por face que torce continuamente com a altura. Cada andar tem 2 linhas de vertices
// por dentro (a 1/2 andar o angulo ja e meio passo) e as colunas dos vidros; o atributo 'andar' deixa o shader apagar um
// andar inteiro (a gaveta aberta) sem refazer nada; a cor de cada vertice e a luz das janelas desse andar.
const FACES = [{ comp: W, nx: 8, p0: [-W / 2, D / 2], p1: [W / 2, D / 2], n: [0, 1] }, { comp: D, nx: 4, p0: [W / 2, D / 2], p1: [W / 2, -D / 2], n: [1, 0] },
  { comp: W, nx: 8, p0: [W / 2, -D / 2], p1: [-W / 2, -D / 2], n: [0, -1] }, { comp: D, nx: 4, p0: [-W / 2, -D / 2], p1: [-W / 2, D / 2], n: [-1, 0] }];
const NY = 3;
function geometriaDaPele(N, fv) {
  const pos = [], nor = [], uv = [], andar = [], cor = [], idx = [];
  const vpa = FACES.reduce((t, f) => t + (f.nx + 1) * (NY + 1), 0);
  for (let i = 0; i < N; i++) {
    FACES.forEach(f => {
      const base = pos.length / 3;
      for (let r = 0; r <= NY; r++) {
        const y = i * H + r * H / NY, ang = angDe(y), c = Math.cos(ang), s = Math.sin(ang);
        for (let k = 0; k <= f.nx; k++) {
          const t = k / f.nx, x = f.p0[0] + (f.p1[0] - f.p0[0]) * t + f.n[0] * fv, z = f.p0[1] + (f.p1[1] - f.p0[1]) * t + f.n[1] * fv;
          pos.push(x * c + z * s, y, -x * s + z * c);
          nor.push(f.n[0] * c + f.n[1] * s, 0, -f.n[0] * s + f.n[1] * c);
          uv.push(t * f.comp / (PANO * PANOS_AZ), r / NY); andar.push(i); cor.push(0, 0, 0);
        }
      }
      const L = f.nx + 1;
      for (let r = 0; r < NY; r++) for (let k = 0; k < f.nx; k++) {
        const a = base + r * L + k, b = a + 1, c2 = a + L + 1, d = a + L;
        // o sentido do triangulo: a normal geometrica tem de apontar para FORA (a mesma da face)
        const ax = pos[a * 3], az = pos[a * 3 + 2], bx = pos[b * 3], bz = pos[b * 3 + 2], dy = pos[d * 3 + 1] - pos[a * 3 + 1];
        const nx = -(bz - az) * dy, nz = (bx - ax) * dy;          // (b-a) x (d-a) com (d-a) ~ (0,dy,0); 03/10 noite: o sinal estava trocado e o vidro virava-se para DENTRO (de fora via-se a torre oca)
        const fora = nx * nor[a * 3] + nz * nor[a * 3 + 2] > 0;
        if (fora) idx.push(a, b, c2, a, c2, d); else idx.push(a, c2, b, a, d, c2);
      }
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('andar', new THREE.Float32BufferAttribute(andar, 1));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3)); g.setIndex(idx);
  g.userData.vpa = vpa;
  return g;
}
// o shader que apaga um andar (a gaveta saiu: o buraco fica na torre) - uniforme partilhado pelas duas camadas
const ESCONDE = { value: -10 };
// 04/10 (c02 "LEDs com falhas"): os fios finos (LEDs das arestas, helices, pilares) engrossam pela normal quando a camara se
// afasta, para nunca ficarem abaixo de ~1 pixel (abaixo disso o MSAA parte-os em tracos que piscam a rodar)
const ENGROSSA = { led: { value: 0 }, tubo: { value: 0 } };
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _esf = new THREE.Sphere();
function engrossar(mat, uni, chave) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uEngrossa = uni;
    sh.vertexShader = 'uniform float uEngrossa;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normal * uEngrossa;');
  };
  mat.customProgramCacheKey = () => 'engrossa-' + chave;
  return mat;
}
function comAndarEscondido(mat, chave) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uEsconde = ESCONDE;
    sh.vertexShader = 'attribute float andar;\nvarying float vAndarT3B;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vAndarT3B = andar;');
    sh.fragmentShader = 'uniform float uEsconde;\nvarying float vAndarT3B;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (abs(vAndarT3B - uEsconde) < 0.5) discard;');
  };
  mat.customProgramCacheKey = () => 'andar-' + chave;
  return mat;
}
function construirTorre(est, ass) {
  texturasDaPele();
  const ands = (est.andares || []).slice().sort((a, b) => a.n - b.n);
  const g = new THREE.Group(); g.name = 'torre';
  torre = { grupo: g, andares: [], porN: {}, ass, segs: [], segPorSector: {}, quentes: new Map(), farois: new Map(), pulsos: [] };
  ands.forEach((a, i) => { torre.andares.push({ n: a.n, nome: a.nome, esp: a.esp, obra: a.obra, divisao: a.divisao || (a.n >= 52 ? 'Topo' : 'Dados'), i, y: i * H, ang: i * TORCAO, sectores: a.sectores || [], n_peoes: a.n_peoes || 0, actividade: 0, actMin: 0, estado: 'ok', gerente: a.gerente }); torre.porN[a.n] = torre.andares[i]; });
  const N = torre.andares.length; torre.altura = N * H;
  // --- as lajes: um pouco maiores do que a pele - de longe sao as "fatias nas arestas" da antiga
  const lajes = new THREE.InstancedMesh(new THREE.BoxGeometry(W + 0.7, LAJE, D + 0.7), new THREE.MeshStandardMaterial({ color: 0x1b1a20, metalness: 0.7, roughness: 0.38 }), N);
  // --- a pele continua (vidro) e a camada das luzes (aditiva, cor por vertice = brilho do andar)
  const geoPele = geometriaDaPele(N, 0.06);
  const matVidro = comCeu(comAndarEscondido(new THREE.MeshStandardMaterial({ map: texVidro, color: 0xffffff, metalness: 0.88, roughness: 0.09, envMap: ceuTex, envMapIntensity: 1.35 }), 'vidro'));
  const vidro = new THREE.Mesh(geoPele, matVidro);
  const matLuz = comAndarEscondido(new THREE.MeshBasicMaterial({ map: texLuzes, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1 }), 'luz');
  const luz = new THREE.Mesh(geoPele, matLuz); luz.renderOrder = 2; luz.visible = false;
  // --- os pilares dos cantos: QUATRO fios continuos de ouro escuro que torcem com a torre (os degraus foram-se)
  const matCanto = comCeu(engrossar(new THREE.MeshStandardMaterial({ color: 0x4a3a14, metalness: 0.95, roughness: 0.28, envMap: ceuTex }), ENGROSSA.tubo, 'canto'));
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
    const pts = []; for (let k = 0; k <= N * 2; k++) { const y = k * H / 2, a = angDe(y), x = sx * (W / 2 + 0.05), z = sz * (D / 2 + 0.05); pts.push(new THREE.Vector3(x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a))); }
    const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 3, 0.34, 8, false), matCanto); g.add(t);
  });
  // --- os LEDs das arestas por andar + o halo (a cor e o brilho mudam em cada quadro: passoLeds)
  const matLed = engrossar(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), ENGROSSA.led, 'led');
  const leds = new THREE.InstancedMesh(molduraRect(W + 0.95, D + 0.95, 0.16, 0.16), matLed, N);
  const halos = new THREE.InstancedMesh(molduraRect(W + 2.0, D + 2.0, 1.0, 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), N);
  // --- os SECTORES na fachada (q19): faixas por sector, so de perto (opacidade pela distancia) - faixasDosSectores
  const matSeg = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false });
  const segs = faixasDosSectores(matSeg);
  torre.andares.forEach(a => {
    lajes.setMatrixAt(a.i, matrizDoAndar(a, 0, LAJE / 2, 0)); lajes.setColorAt(a.i, _c.set(a.obra === 'em_obras' ? 0x2a2418 : 0x1b1a20));
    leds.setMatrixAt(a.i, matrizDoAndar(a, 0, LAJE + 0.02, 0)); halos.setMatrixAt(a.i, matrizDoAndar(a, 0, LAJE + 0.02, 0));
  });
  [lajes, leds, halos].forEach(m => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  [lajes, vidro, luz, leds, halos, segs].forEach(m => g.add(m));
  halos.renderOrder = 4;
  torre.inst = { lajes, vidro, luz, leds, halos, segs, matSeg, matVidro, matLuz, geoPele };
  torre.assSec = assinaturaSectores(est);
  // --- o poco do elevador, as helices, a coroa e o LETREIRO
  const poco = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, torre.altura, 24, 1, true), new THREE.MeshBasicMaterial({ color: COR.cy, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  poco.position.y = torre.altura / 2; g.add(poco);
  torre.helices = [helice(0, COR.cy), helice(Math.PI, COR.ouro)]; torre.helices.forEach(h => g.add(h.malha));
  torre.pools = criarPools(g);
  torre.coroa = coroa(torre.altura, angDe(torre.altura)); g.add(torre.coroa.grupo);
  torre.letreiro = letreiro(torre.altura + torre.coroa.AH); g.add(torre.letreiro.grupo);
  cena.add(g);
  actualizarCores(est); pintarJanelas();
  if (!jaEnquadrou) { jaEnquadrou = true; enquadrar(0, false); }
  rotulosDosAndares();
  if (T3B.estado.ALERTAS) aplicarAlertas(T3B.estado.ALERTAS);
  precisaDesenhar = true;
}
// as faixas dos sectores na fachada (uma InstancedMesh): construidas aqui e REFEITAS no lugar quando os sectores mudam
function faixasDosSectores(matSeg) {
  const per = 2 * (W + D), esquinas = [W, W + D, 2 * W + D, per], pecas = [];
  torre.segs = []; torre.segPorSector = {}; torre.quentes = new Map();
  torre.andares.forEach(a => {
    a.segInicio = null; a.segFim = null;
    const ss = a.sectores.length ? a.sectores : [{ id: '_' + a.n, n: 1 }], tot = ss.reduce((t, s) => t + Math.max(1, s.n), 0); let d = 0;
    ss.forEach(s => { const larg = Math.max(1.2, Math.max(1, s.n) / tot * per); let d0 = d + 0.18, d1 = Math.min(per, d + larg) - 0.18; d += larg; if (d1 - d0 < 2.2) return;
      esquinas.forEach(c => { if (d0 < c && d1 > c) { if (c - 0.12 > d0 + 1.2) pecas.push({ a, s, d0, d1: c - 0.12 }); d0 = c + 0.12; } }); if (d1 - d0 >= 1.2) pecas.push({ a, s, d0, d1 }); });
  });
  const segs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), matSeg, Math.max(1, pecas.length));
  pecas.forEach((pc, iS) => {
    const a = pc.a, obra = a.obra === 'em_obras', meio = (pc.d0 + pc.d1) / 2 / per, p = pontoNoPerimetro(meio);
    // a faixa fica no angulo da torcao A SUA ALTURA (0,3 do andar) e um nada para fora do vidro
    segs.setMatrixAt(iS, matrizDoAndar(a, p.x * 1.02, LAJE + (H - LAJE) * 0.22, p.z * 1.04, p.ry, obra ? 0 : pc.d1 - pc.d0, (H - LAJE) * 0.30, 1, 0.3 * TORCAO));
    const base = baseDoSegmento(pc.s, a); segs.setColorAt(iS, base);
    torre.segs[iS] = { s: pc.s, a, base: base.clone(), calor: 0 };
    (torre.segPorSector[pc.s.id] = torre.segPorSector[pc.s.id] || []).push(iS);
    if (a.segInicio == null) a.segInicio = iS; a.segFim = iS + 1;
  });
  torre.andares.forEach(a => { if (a.segInicio == null) { a.segInicio = 0; a.segFim = 0; } });
  segs.instanceMatrix.needsUpdate = true; if (segs.instanceColor) segs.instanceColor.needsUpdate = true;
  segs.renderOrder = 3;
  return segs;
}
function refazerFaixas(est, ass) {
  const porN = {}; (est.andares || []).forEach(a => { porN[a.n] = a; });
  torre.andares.forEach(a => { const x = porN[a.n]; if (!x) return; a.sectores = x.sectores || []; a.n_peoes = x.n_peoes || 0; a.nome = x.nome; a.gerente = x.gerente; });
  const velho = torre.inst.segs, novo = faixasDosSectores(torre.inst.matSeg);
  torre.grupo.remove(velho); velho.geometry.dispose(); velho.dispose && velho.dispose();
  torre.grupo.add(novo); torre.inst.segs = novo; torre.assSec = ass;
  if (aberto && torre.porN[aberto.n]) escalarAndar(torre.porN[aberto.n], 0.001);
  actualizarRotulos();
  precisaDesenhar = true;
}
function pontoNoPerimetro(f) {
  const per = 2 * (W + D); let d = ((f % 1) + 1) % 1 * per;
  if (d < W) return { x: -W / 2 + d, z: D / 2, ry: 0 }; d -= W; if (d < D) return { x: W / 2, z: D / 2 - d, ry: Math.PI / 2 };
  d -= D; if (d < W) return { x: W / 2 - d, z: -D / 2, ry: Math.PI }; d -= W; return { x: -W / 2, z: -D / 2 + d, ry: -Math.PI / 2 };
}
function baseDoSegmento(s, a) { if (a.obra === 'em_obras') return new THREE.Color(0x000000); return new THREE.Color(COR_ESPECIE[s.especie] || COR_DIV[a.divisao] || 0xffffff).multiplyScalar(0.55); }
function molduraRect(w, d, esp, alt) {
  const gs = [[w, alt, esp, 0, d / 2], [w, alt, esp, 0, -d / 2], [esp, alt, d, w / 2, 0], [esp, alt, d, -w / 2, 0]].map(([a, b, c, x, z]) => { const g = new THREE.BoxGeometry(a, b, c); g.translate(x, 0, z); return g; });
  return mergeGeometries(gs);
}
function helice(fase, cor) {
  const N = torre.andares.length, voltas = 1.4, pts = [];
  for (let i = 0; i <= 240; i++) { const t = i / 240, ang = fase + t * voltas * Math.PI * 2 + t * N * TORCAO; pts.push(new THREE.Vector3(Math.cos(ang) * R_HELICE, t * torre.altura, Math.sin(ang) * R_HELICE)); }
  const curva = new THREE.CatmullRomCurve3(pts);
  const malha = new THREE.Mesh(new THREE.TubeGeometry(curva, 480, 0.34, 6, false), engrossar(new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), ENGROSSA.tubo, 'helice'));
  return { curva, malha, cor };
}
// as janelas acesas (q21): so de perto (a opacidade da camada vem da distancia); o brilho de cada andar = noite + actividade
function pintarJanelas() {
  if (!torre) return;
  const g = torre.inst.geoPele, cor = g.attributes.color, vpa = g.userData.vpa;
  torre.andares.forEach(a => {
    // 07/10 (Q5 D3, ele: "a fachada de longe mais sofisticada, com luzes nos andares que estao a trabalhar e os mais brandos"):
    // mais contraste - quem trabalha acende forte, quem esta calmo quase apaga (de dia quase escuro, de noite um brilho baixo)
    const act = Math.min(1, a.actMin + a.actividade * 0.5), base = noite ? 0.22 : 0.03, k = base + 0.9 * act, obra = a.obra === 'em_obras';
    _c.set(0xffffff).lerp(_c2.set(COR_DIV[a.divisao] || 0xffffff), 0.22).multiplyScalar(obra ? 0 : k);
    for (let v = a.i * vpa, f = v + vpa; v < f; v++) cor.setXYZ(v, _c.r, _c.g, _c.b);
  });
  cor.needsUpdate = true; precisaDesenhar = true;
}

// ---------------------------------------------------------------- a coroa: o atico e os LEDs 3BRAIN nas faces ("mistura de cada")
const FONTE5x7 = { '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'], N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '·': ['00000', '00000', '00000', '00100', '00000', '00000', '00000'] };
function pontosDoTexto(texto) {
  const dots = [];
  for (let li = 0; li < texto.length; li++) { const f = FONTE5x7[texto[li]] || FONTE5x7[' ']; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (f[r][c] === '1') dots.push({ col: li * 6 + c, lin: r, letra: li }); }
  return { dots, colunas: texto.length * 6 - 1 };
}
function coroa(topo, ang) {
  const g = new THREE.Group(); g.position.y = topo; g.rotation.y = ang;
  const AW = W * 0.7, AD = D * 0.7, AH = H * 1.8;
  const at = new THREE.Mesh(new THREE.BoxGeometry(AW, AH, AD), comCeu(new THREE.MeshStandardMaterial({ color: 0x3a2e10, metalness: 0.95, roughness: 0.12, envMap: ceuTex, envMapIntensity: 1.6, transparent: true, opacity: 0.9 }))); at.position.y = AH / 2; g.add(at);
  const aresta = new THREE.Mesh(molduraRect(AW + 0.3, AD + 0.3, 0.22, 0.28), new THREE.MeshBasicMaterial({ color: COR.ouroHi, toneMapped: false })); aresta.position.y = AH; g.add(aresta);
  const aresta2 = aresta.clone(); aresta2.position.y = 0.15; g.add(aresta2);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.5, 20, 8), new THREE.MeshStandardMaterial({ color: 0x8a7a50, metalness: 0.9, roughness: 0.3 })); ant.position.y = AH + 10; g.add(ant);
  const farol = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), new THREE.MeshBasicMaterial({ color: COR.mau, toneMapped: false })); farol.position.y = AH + 20.4; g.add(farol);
  const farolHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaHalo(), color: COR.mau, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })); farolHalo.scale.set(10, 10, 1); farolHalo.position.copy(farol.position); g.add(farolHalo);
  const { dots, colunas } = pontosDoTexto('3BRAIN'), passo = 0.62;
  const faces = [[0, AD / 2 + 0.06, 0, AW], [Math.PI, -AD / 2 - 0.06, 0, AW], [Math.PI / 2, AW / 2 + 0.06, 1, AD], [-Math.PI / 2, -AW / 2 - 0.06, 1, AD]];
  const nTot = dots.length * faces.length, malha = new THREE.InstancedMesh(new THREE.CircleGeometry(0.22, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), nTot);   // 04/10: disco virado para fora (era uma esfera de 80 triangulos: 38 mil triangulos so nestes LEDs)
  const halo = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), nTot);
  const meta = []; let i = 0;
  faces.forEach(([ry, desl, eixoX, larg]) => {
    const esc = Math.min(1, (larg - 2) / (colunas * passo)), p = passo * esc;
    dots.forEach(d => { const lx = (d.col - (colunas - 1) / 2) * p, ly = AH * 0.5 + (3 - d.lin) * p; const v = new THREE.Vector3(lx, ly, 0).applyAxisAngle(EIXO_Y, ry); if (eixoX) v.x += desl; else v.z += desl;
      _m.compose(v, _q.setFromEuler(_e.set(0, ry, 0)), _s.set(esc, esc, esc)); malha.setMatrixAt(i, _m); _m.compose(v, _q, _s.set(p * 1.9, p * 1.9, 1)); halo.setMatrixAt(i, _m);
      malha.setColorAt(i, _c.set(COR.ouro)); halo.setColorAt(i, _c.set(COR.ouro).multiplyScalar(0.5)); meta.push({ col: d.col, letra: d.letra }); i++; });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(larg - 0.8, 7 * passo + 1.2), new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.8 }));
    pl.position.set(eixoX ? desl * 0.995 : 0, AH * 0.5, eixoX ? 0 : desl * 0.995); pl.rotation.y = ry; g.add(pl);
  });
  malha.instanceMatrix.needsUpdate = true; halo.instanceMatrix.needsUpdate = true; g.add(malha); g.add(halo);
  return { grupo: g, malha, halo, meta, colunas, farol, farolHalo, varrer: [], respira: 0, arranque: performance.now(), AH };
}

// ---------------------------------------------------------------- O LETREIRO (ponto 2): holograma a girar por cima do topo
// r02 "ta muito pequeno e pouco visivel, quero melhor que isso"; q22 "holograma a girar, mistura um pouco de cada, bem
// sofisticado". O LOGO 3B em ouro solido (o mesmo quadrado da marca do HUD: ouro com o 3B escuro) com o contorno de neon,
// dentro de um ANEL DE LUZ; por baixo, "TORRE 3BRAIN" em LEDs numa banda que gira ao contrario (60 m de diametro: mais
// larga do que a torre). As faces dos LEDs so se veem de frente (nunca ao espelho por tras).
function letreiro(base) {
  const g = new THREE.Group(); g.position.y = base + 34;
  const logo = new THREE.Group(); g.add(logo);
  const L = 26, R = 5;
  const forma = new THREE.Shape(); forma.moveTo(-L / 2 + R, -L / 2); forma.lineTo(L / 2 - R, -L / 2); forma.quadraticCurveTo(L / 2, -L / 2, L / 2, -L / 2 + R); forma.lineTo(L / 2, L / 2 - R); forma.quadraticCurveTo(L / 2, L / 2, L / 2 - R, L / 2);
  forma.lineTo(-L / 2 + R, L / 2); forma.quadraticCurveTo(-L / 2, L / 2, -L / 2, L / 2 - R); forma.lineTo(-L / 2, -L / 2 + R); forma.quadraticCurveTo(-L / 2, -L / 2, -L / 2 + R, -L / 2);
  const geoBloco = new THREE.ExtrudeGeometry(forma, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 4, curveSegments: 10 }); geoBloco.translate(0, 0, -1.2);
  const ouro = comCeu(new THREE.MeshStandardMaterial({ color: 0xf2c230, metalness: 1.0, roughness: 0.22, envMap: ceuTex, envMapIntensity: 1.4, emissive: 0x5a4208, emissiveIntensity: 0.55 }));
  const bloco = new THREE.Mesh(geoBloco, ouro); logo.add(bloco);
  // o "3B" escuro nas duas faces (o desenho do icone da marca), em textura nitida de 1024 px
  const c = document.createElement('canvas'); c.width = c.height = 1024; const gc = c.getContext('2d');
  gc.fillStyle = '#0b0b0f'; gc.font = '700 520px "JetBrains Mono", ui-monospace, monospace'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText('3B', 512, 548);
  const texLogo = new THREE.CanvasTexture(c); texLogo.colorSpace = THREE.SRGBColorSpace; texLogo.anisotropy = 8;
  const matLogo = new THREE.MeshBasicMaterial({ map: texLogo, transparent: true, toneMapped: false, depthWrite: false });
  [[1.75, 0], [-1.75, Math.PI]].forEach(([z, ry]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.86, L * 0.86), matLogo); p.position.z = z; p.rotation.y = ry; logo.add(p); });
  // o contorno de neon (frente e verso) e o brilho atras dele
  const pts = forma.getSpacedPoints(120).map(p => new THREE.Vector3(p.x * 1.06, p.y * 1.06, 0));
  const curva = new THREE.CatmullRomCurve3(pts, true);
  const matNeon = new THREE.MeshBasicMaterial({ color: 0xfff1c1, toneMapped: false });
  [1.9, -1.9].forEach(z => { const t = new THREE.Mesh(new THREE.TubeGeometry(curva, 160, 0.22, 6, true), matNeon); t.position.z = z; logo.add(t); });
  const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaHalo(), color: COR.ouro, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); brilho.scale.set(58, 58, 1); g.add(brilho);
  // o ANEL DE LUZ a volta do logo (dois aneis: o grosso de ouro e o fino a girar no outro sentido)
  const matAnel = new THREE.MeshBasicMaterial({ color: COR.ouroHi, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const anel = new THREE.Mesh(new THREE.TorusGeometry(20, 0.6, 12, 128), matAnel); logo.add(anel);
  const anelFino = new THREE.Mesh(new THREE.TorusGeometry(22.4, 0.18, 8, 128), matAnel.clone()); anelFino.material.opacity = 0.6; g.add(anelFino);
  // "TORRE 3BRAIN" em LEDs numa banda cilindrica (r = 31), duas vezes a volta; pontos virados para fora, so de frente
  const txt = 'TORRE 3BRAIN · TORRE 3BRAIN · ', { dots, colunas } = pontosDoTexto(txt), RB = 33, passoAng = (Math.PI * 2) / (colunas + 1), passoY = 1.45;
  const geoDot = new THREE.CircleGeometry(0.58, 12);
  const matDot = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, side: THREE.FrontSide });
  const banda = new THREE.InstancedMesh(geoDot, matDot, dots.length);
  const halosB = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshBasicMaterial({ map: texturaHalo(), color: 0xffffff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.FrontSide }), dots.length);
  const metaB = [];
  dots.forEach((d, i) => {
    // a coluna cresce para a DIREITA de quem olha de fora (03/10 noite: com o angulo negativo lia-se ao espelho)
    const a = d.col * passoAng, y = -24 + (3 - d.lin) * passoY, x = Math.sin(a) * RB, z = Math.cos(a) * RB;
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, a, 0)), _s.set(1, 1, 1)); banda.setMatrixAt(i, _m); halosB.setMatrixAt(i, _m);
    banda.setColorAt(i, _c.set(COR.ouroHi)); halosB.setColorAt(i, _c.set(COR.ouro).multiplyScalar(0.6)); metaB.push({ col: d.col % 90, letra: d.letra });
  });
  banda.instanceMatrix.needsUpdate = true; halosB.instanceMatrix.needsUpdate = true;
  const grupoBanda = new THREE.Group(); grupoBanda.add(banda); grupoBanda.add(halosB); g.add(grupoBanda);
  // a fita escura por tras dos LEDs (le-se melhor contra o ceu) e os dois frisos de ouro da banda
  const fita = new THREE.Mesh(new THREE.CylinderGeometry(RB - 0.3, RB - 0.3, 7 * passoY + 1.6, 96, 1, true), new THREE.MeshBasicMaterial({ color: 0x050507, transparent: true, opacity: 0.55, side: THREE.BackSide, depthWrite: false }));
  fita.position.y = -24; grupoBanda.add(fita);
  [-24 - 3.5 * passoY - 0.6, -24 + 3.5 * passoY + 0.6].forEach(y => { const f = new THREE.Mesh(new THREE.TorusGeometry(RB, 0.12, 6, 160), matAnel.clone()); f.material.opacity = 0.75; f.rotation.x = Math.PI / 2; f.position.y = y; grupoBanda.add(f); });
  return { grupo: g, logo, anel, anelFino, banda, halosB, metaB, grupoBanda, brilho, ouro, varrer: [], colunas, arranque: performance.now() };
}
let texHalo = null;
function texturaHalo() {
  if (texHalo) return texHalo;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); texHalo = new THREE.CanvasTexture(c); texHalo.userData.partilhada = true; return texHalo;
}

// ---------------------------------------------------------------- as cores vivas (estado + actividade)
function actualizarCores(est) {
  if (!torre) return;
  const progs = (est && est.programas) || [], erro = {};
  progs.forEach(p => { if (p.estado === 'erro' && p.andar != null) erro[p.andar] = 1; });
  torre.andares.forEach(a => { a.estado = a.obra === 'em_obras' ? 'obra' : erro[a.n] ? 'erro' : 'ok'; });
  // a actividade dos ULTIMOS MINUTOS (ponto 1): os eventos que ja chegaram contam desde o arranque
  if (!torre.semeouAct) { torre.semeouAct = true; const agora = Date.now(); (T3B.estado.eventos || []).forEach(e => { const a = e.andar != null ? torre.porN[e.andar] : null; if (a && agora - (e.ms || agora) < 300000) a.actMin = Math.min(1, a.actMin + 0.12); }); }
}
// OS LEDS VIVOS (ponto 1, r01): respiracao lenta em repouso + uma onda que sobe devagar + o PULSO de cada evento (sobe do
// chao ate ao andar que mexeu) + o brilho de cada andar pela actividade real dos ultimos minutos (decai em ~3 min).
const LED = { resp: 0, onda: 0, n: 0 };
function corBaseLed(a) {
  if (a.estado === 'obra') return _c2.set(COR.am).multiplyScalar(0.45);
  if (a.estado === 'erro') return _c2.set(COR.mau);
  return _c2.set(COR_DIV[a.divisao] || COR.ouro);
}
function passoLeds(agora, dt) {
  if (!torre) return false;
  const t = agora / 1000, N = torre.andares.length, { leds, halos } = torre.inst;
  const resp = calmo ? 0.5 : 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 6.5);
  const onda = calmo ? -99 : (t % 11) / 11 * (N + 16) - 8;
  for (let i = torre.pulsos.length - 1; i >= 0; i--) { const p = torre.pulsos[i]; p.pos += dt * p.vel; if (p.pos > p.alvo + 4) { p.forca -= dt * 2.2; if (p.forca <= 0) torre.pulsos.splice(i, 1); } }
  const fadeAct = Math.exp(-dt / 180), perto = LED.perto == null ? 0 : LED.perto, calma = 0.42 + 0.58 * perto;
  let soma = 0;
  torre.andares.forEach(a => {
    a.actMin *= fadeAct;
    let b = (0.20 + 0.16 * resp + 0.62 * Math.min(1, a.actMin) + 0.7 * Math.min(1, a.actividade)) * calma;
    b += 0.38 * calma * Math.exp(-Math.pow((a.i - onda) / 2.4, 2));
    torre.pulsos.forEach(p => { if (a.i <= p.alvo + 0.5) b += p.forca * 1.25 * Math.exp(-Math.pow((a.i - p.pos) / 1.4, 2)); });   // o pulso ve-se de longe com toda a forca
    if (a.estado === 'erro') b = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 5));
    const base = corBaseLed(a);
    if (a.estado === 'ok') base.lerp(_c.set(0xffe2a0), 0.7 * (1 - perto));
    _c.copy(base).multiplyScalar(Math.min(2.2, b)); leds.setColorAt(a.i, _c);
    _c.copy(base).multiplyScalar(Math.min(1.6, b * 0.55)); halos.setColorAt(a.i, _c);
    soma += b;
  });
  leds.instanceColor.needsUpdate = true; halos.instanceColor.needsUpdate = true;
  LED.resp = resp; LED.onda = onda; LED.n = torre.pulsos.length; LED.media = soma / N;
  return true;
}

// ================================================================ OS EVENTOS -> LUZ E MOVIMENTO
function receberEventos(evs) {
  if (!torre) return;
  evs.forEach(e => {
    const a = e.andar != null ? torre.porN[e.andar] : null;
    if (e.k === 'batimento') { pulsoDoVigia(); if (aberto) ANDAR.eventoNoAndar(aberto, e, CTX); return; }
    if (a) {
      a.actividade = Math.min(1.6, a.actividade + (e.k === 'mudou' ? 0.9 : 0.6)); a.actMin = Math.min(1, a.actMin + (e.k === 'mudou' ? 0.22 : 0.12)); ledsQuentes.add(a);
      if (torre.pulsos.length < 14) torre.pulsos.push({ pos: -3, alvo: a.i, vel: 26 + a.i * 0.15, forca: 1 });   // o pulso que sobe a torre ate ao andar
      const p = T3B.estado.programas[e.id], lista = p && p.sec != null ? torre.segPorSector[p.sec] : null;
      if (lista) lista.forEach(iS => aquecer(iS, 1)); else for (let k = a.segInicio; k < a.segFim; k++) aquecer(k, 0.35);
      pulsoNaHelice(0, a.i / Math.max(1, torre.andares.length - 1), 1, e.k === 'falou' && /Stark|Director/.test(e.quem || '') ? 1 : 0);
    }
    if ((e.k === 'recado' || e.k === 'visita') && e.de != null && e.para != null && torre.porN[e.de] && torre.porN[e.para] && e.de !== e.para) capsula(torre.porN[e.de], torre.porN[e.para], e.k === 'visita' ? COR.ouro : COR.vi, e.k === 'visita');
    if (torre.coroa) { torre.coroa.varrer.push({ t0: performance.now() }); torre.coroa.tremer = 0.25; }
    if (torre.letreiro) torre.letreiro.varrer.push({ t0: performance.now() });
    if (aberto) ANDAR.eventoNoAndar(aberto, e, CTX);
  });
  if (torre.coroa && torre.coroa.varrer.length > 4) torre.coroa.varrer.splice(0, torre.coroa.varrer.length - 4);
  if (torre.letreiro && torre.letreiro.varrer.length > 3) torre.letreiro.varrer.splice(0, torre.letreiro.varrer.length - 3);
  precisaDesenhar = true;
}
const ledsQuentes = new Set();
function aquecer(iS, q) { const s = torre.segs[iS]; if (!s) return; s.calor = Math.min(1.5, s.calor + q); torre.quentes.set(iS, s); }
let ultJanelas = 0;
function arrefecer(dt, agora) {
  if (!torre) return false; let mexe = false;
  if (ledsQuentes.size) { ledsQuentes.forEach(a => { a.actividade *= Math.pow(0.45, dt); if (a.actividade < 0.02) { a.actividade = 0; ledsQuentes.delete(a); } }); mexe = true; }
  if (agora - ultJanelas > 2000 && torre.inst.luz.visible) { ultJanelas = agora; pintarJanelas(); }
  if (torre.quentes.size) {
    const segs = torre.inst.segs;
    torre.quentes.forEach((s, iS) => { s.calor *= Math.pow(0.4, dt); if (s.calor < 0.02) { s.calor = 0; torre.quentes.delete(iS); } _c.copy(s.base).lerp(_c2.set(COR.ouroHi), Math.min(1, s.calor)).multiplyScalar(1 + s.calor * 1.6); segs.setColorAt(iS, _c); });
    segs.instanceColor.needsUpdate = true; mexe = true;
  }
  return mexe;
}
const geoPulso = new THREE.SphereGeometry(0.8, 10, 8);
const geoCaps = new THREE.CapsuleGeometry(0.9, 1.6, 4, 10);
// 04/10 (obra 4, "mais leve"): os pulsos da helice e as capsulas do elevador eram DOIS objectos cada (bola + halo), com dois
// materiais novos por evento - com o feed vivo, ~38 ao mesmo tempo = ~76 chamadas de desenho a mais em cada quadro da torre
// (metade das 141) e lixo para o coletor. Agora vivem em 4 objectos fixos: bolas e capsulas instanciadas + duas nuvens de
// pontos para os halos (o halo de um ponto tem o mesmo tamanho no ecra que o sprite de antes: size = lado / tan(fov/2)).
// Cada evento so pede um lugar livre; um lugar escondido fica com escala 0 e o halo longe (fora do ecra, nada a pintar).
const POOL_N = 48, LONGE = -1e5;
function criarPools(g) {
  function malha(geo) {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ toneMapped: false }), POOL_N);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(POOL_N * 3).fill(1), 3);
    _m.makeScale(0, 0, 0); for (let i = 0; i < POOL_N; i++) m.setMatrixAt(i, _m);
    m.frustumCulled = false; g.add(m); return m;
  }
  function nuvem(lado, opac) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(POOL_N * 3), cor = new Float32Array(POOL_N * 3);
    for (let i = 0; i < POOL_N; i++) pos[i * 3 + 1] = LONGE;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cor, 3));
    const mat = new THREE.PointsMaterial({ map: texturaHalo(), vertexColors: true, size: lado, sizeAttenuation: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = 5; p.userData = { lado, opac }; g.add(p); return p;
  }
  return { bolas: malha(geoPulso), caps: malha(geoCaps), halosB: nuvem(6, 0.8), halosC: nuvem(7, 0.9), livresB: [...Array(POOL_N).keys()], livresC: [...Array(POOL_N).keys()] };
}
// o tamanho dos halos acompanha a lente da camara (o sprite fazia-o sozinho)
function tamanhoDosHalos() {
  if (!torre || !torre.pools) return;
  const k = camara.zoom / Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2);
  [torre.pools.halosB, torre.pools.halosC].forEach(p => { p.material.size = p.userData.lado * k; });
}
function porNoPool(malhaI, nuvemP, i, pos, escala, cor, forca) {
  _m.compose(pos, _q.identity(), _s.setScalar(escala)); malhaI.setMatrixAt(i, _m); malhaI.instanceMatrix.needsUpdate = true;
  const a = nuvemP.geometry.attributes, f = nuvemP.userData.opac * forca;
  a.position.setXYZ(i, pos.x, pos.y, pos.z); a.color.setXYZ(i, cor.r * f, cor.g * f, cor.b * f); a.position.needsUpdate = true; a.color.needsUpdate = true;
}
function tirarDoPool(malhaI, nuvemP, i) {
  _m.makeScale(0, 0, 0); malhaI.setMatrixAt(i, _m); malhaI.instanceMatrix.needsUpdate = true;
  const a = nuvemP.geometry.attributes; a.position.setXYZ(i, 0, LONGE, 0); a.color.setXYZ(i, 0, 0, 0); a.position.needsUpdate = true; a.color.needsUpdate = true;
}
function pulsoNaHelice(qual, de, para, ouro) {
  if (!torre || !torre.pools || animados.length > 36) return;
  const P = torre.pools, i = P.livresB.pop(); if (i == null) return;
  const h = torre.helices[ouro ? 1 : qual], cor = new THREE.Color(h.cor), pos = new THREE.Vector3();
  P.bolas.setColorAt(i, cor); P.bolas.instanceColor.needsUpdate = true;
  const dur = 1.6 + Math.abs(para - de) * 2.4;
  animados.push({ t: 0, passo(dt) {
    if (torre.pools !== P) return false;                             // a torre foi refeita: o lugar morreu com ela
    this.t += dt / dur; const u = de + (para - de) * ease(Math.min(1, this.t));
    h.curva.getPointAt(Math.min(1, Math.max(0, u)), pos);
    const f = this.t > 0.85 ? Math.max(0, (1 - this.t) / 0.15) : 1;  // (o desvanecer do fim: a bola encolhe, o halo apaga)
    if (this.t >= 1) { tirarDoPool(P.bolas, P.halosB, i); P.livresB.push(i); return false; }
    porNoPool(P.bolas, P.halosB, i, pos, f, cor, f); return true;
  } });
}
function capsula(de, para, cor, volta) {
  if (!torre || !torre.pools || animados.length > 44) return;
  const P = torre.pools, i = P.livresC.pop(); if (i == null) return;
  const c = new THREE.Color(cor), pos = new THREE.Vector3();
  P.caps.setColorAt(i, c); P.caps.instanceColor.needsUpdate = true;
  const y0 = de.y + H * 0.5, y1 = para.y + H * 0.5, dur = 1.2 + Math.abs(y1 - y0) / 60, espera = volta ? 4 : 0;
  animados.push({ t: 0, passo(dt) {
    if (torre.pools !== P) return false;
    this.t += dt; let y;
    if (this.t < dur) y = y0 + (y1 - y0) * ease(this.t / dur); else if (this.t < dur + espera) y = y1; else if (volta && this.t < 2 * dur + espera) y = y1 + (y0 - y1) * ease((this.t - dur - espera) / dur);
    else { tirarDoPool(P.caps, P.halosC, i); P.livresC.push(i); return false; }
    porNoPool(P.caps, P.halosC, i, pos.set(0, y, 0), 1, c, 1); return true;
  } });
}
function ease(p) { return 1 - Math.pow(1 - p, 3); }
function pulsoDoVigia() {
  if (!torre || !torre.coroa) return;
  const c = torre.coroa; c.respira = 1;
  animados.push({ t: 0, passo(dt) { this.t += dt; const k = Math.max(0, 1 - this.t / 0.9); c.farolHalo.material.opacity = 0.25 + k; c.farol.scale.setScalar(1 + k * 0.6); return this.t < 0.9; } });
  if (torre.pulsos.length < 14) torre.pulsos.push({ pos: -3, alvo: torre.andares.length - 1, vel: 40, forca: 0.55 });   // o batimento do vigia sobe a torre inteira
}
function animarLetreiro(agora, dt) {
  const c = torre && torre.coroa, L = torre && torre.letreiro; if (!c || !L) return false;
  const boot = Math.min(1, (agora - c.arranque) / 1800);
  c.respira *= Math.pow(0.3, dt); c.tremer = Math.max(0, (c.tremer || 0) - dt);
  c.varrer = c.varrer.filter(v => agora - v.t0 < 900); L.varrer = L.varrer.filter(v => agora - v.t0 < 1400);
  const t = agora / 1000;
  if (!calmo) {
    L.logo.rotation.y += dt * 0.42; L.grupoBanda.rotation.y -= dt * 0.16; L.anelFino.rotation.z += dt * 0.5; L.anelFino.rotation.x = Math.PI / 2 + Math.sin(t * 0.4) * 0.25;
    L.logo.position.y = Math.sin(t * 0.9) * 0.6;
    const r = 0.85 + 0.15 * Math.sin(t * 1.4) + (L.varrer.length ? 0.25 : 0);
    L.anel.material.opacity = Math.min(1, r); L.brilho.material.opacity = 0.42 + 0.18 * Math.sin(t * 1.1) + (L.varrer.length ? 0.2 : 0);
    L.ouro.emissiveIntensity = 0.5 + 0.12 * Math.sin(t * 1.4);
  }
  // a banda: respira e, a cada evento, uma varredura de luz corre as letras
  const nB = L.metaB.length;
  for (let i = 0; i < nB; i++) {
    const d = L.metaB[i]; let b = 0.85 + 0.15 * Math.sin(t * 1.6 + d.col * 0.05);
    L.varrer.forEach(v => { const pos = ((agora - v.t0) / 1400) * 104 - 7, dd = Math.abs(d.col - pos); if (dd < 4) b += (1 - dd / 4) * 1.1; });
    if (boot < 1) b *= Math.max(0, Math.min(1, boot * 30 - d.letra));
    L.banda.setColorAt(i, _c.set(COR.ouroHi).lerp(_c2.set(0xffffff), Math.min(1, Math.max(0, b - 1))).multiplyScalar(Math.min(1.8, b)));
  }
  L.banda.instanceColor.needsUpdate = true;
  const parado = boot >= 1 && !c.varrer.length && c.respira < 0.01;
  const n = c.meta.length;
  if (!parado || !c._parado) {
    for (let i = 0; i < n; i++) {
      const d = c.meta[i]; let b = 0.78 + 0.22 * c.respira;
      if (boot < 1) b *= Math.max(0, Math.min(1, boot * 7 - d.letra));
      c.varrer.forEach(v => { const pos = ((agora - v.t0) / 900) * (c.colunas + 8) - 4, dd = Math.abs(d.col - pos); if (dd < 3) b += (1 - dd / 3) * 1.2; });
      c.malha.setColorAt(i, _c.set(COR.ouro).lerp(_c2.set(0xfff6d6), Math.min(1, Math.max(0, b - 0.9))).multiplyScalar(Math.min(1.6, b)));
      c.halo.setColorAt(i, _c.set(COR.ouro).multiplyScalar(0.25 + 0.5 * Math.min(1.5, b - 0.6)));
    }
    c.malha.instanceColor.needsUpdate = true; c.halo.instanceColor.needsUpdate = true;
  }
  c._parado = parado;
  return !calmo;
}

// ================================================================ O GLOBO DOS MERCADOS (G23, obra 4) — um objecto 3D ao pe da torre

// Ele (questionario 3): "perto da torre, sem sobrepor". O globo em arame vive na cena 3D mas fica PRESO ao ecra no espaco livre

// entre a torre e a coluna de perto (posicionarGlobo: a meio dessa faixa, em baixo) - nunca por cima de um painel nem da torre,

// em qualquer tamanho de ecra. Os mercados: Binance (cripto), Nova Iorque (accoes), Sao Paulo (Brasil), Londres (macro e

// mundo) e a TORRE (Florianopolis). Cada ordem ou cotacao nova (t3b_ligacoes.js: o holograma 'globo') acende um arco do seu

// mercado ate a torre; o globo so gira com actividade de mercado (a base dos ultimos 3 minutos) - parado, fica parado.

const HUBS = { binance: { n: 'BINANCE', lat: 1.3, lon: 103.8, cor: 0xf2c230 }, ny: { n: 'NOVA IORQUE', lat: 40.7, lon: -74, cor: 0x60a5fa },

  sp: { n: 'SÃO PAULO', lat: -23.5, lon: -46.6, cor: 0x3fd69a }, londres: { n: 'LONDRES', lat: 51.5, lon: -0.1, cor: 0xb265f5 }, torre: { n: 'TORRE', lat: -27.6, lon: -48.5, cor: 0xffdc6a } };

const MERCADO_DO_PROGRAMA = { binance_real: 'binance', papel_cripto: 'binance', fluxo_binance: 'binance', papel: 'ny', alpaca: 'ny', fabrica_execucao: 'ny', noticias_eua: 'ny', fluxo_etf: 'ny',

  cambio: 'sp', noticias_brasil: 'sp', macro: 'londres', juros_fed: 'ny', liquidez: 'londres', noticias_macro: 'londres', noticias_mundo: 'londres', precos_extra: 'binance', noticias_cripto: 'binance' };

let globo = null, globoOculto = false; const _v2g = new THREE.Vector3();   // 04/10: oculto enquanto o detalhe de um cartao esta aberto

function pontoNoGlobo(lat, lon, r) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo)); }

function etiquetaGlobo(txt, cor) {

  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');

  g.font = (window.T3BTexto ? window.T3BTexto.fonteCanvas(600, 26) : '600 26px monospace'); g.textAlign = 'center'; g.textBaseline = 'middle';

  g.fillStyle = 'rgba(6,8,12,.72)'; const w = Math.min(250, g.measureText(txt).width + 18); g.fillRect(128 - w / 2, 14, w, 36);

  g.fillStyle = '#' + new THREE.Color(cor).getHexString(); g.fillText(txt, 128, 33);

  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;

  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false }));

  sp.scale.set(0.15, 0.15 * 64 / 256, 1); sp.renderOrder = 20; return sp;

}

function criarGlobo() {

  const g = new THREE.Group(); g.name = 'globo';

  const corpo = new THREE.Group(); g.add(corpo);

  const pts = [], R = 1;

  for (let lat = -60; lat <= 60; lat += 30) for (let lon = 0; lon < 360; lon += 6) { pts.push(pontoNoGlobo(lat, lon, R), pontoNoGlobo(lat, lon + 6, R)); }

  for (let lon = 0; lon < 360; lon += 30) for (let lat = -90; lat < 90; lat += 6) { pts.push(pontoNoGlobo(lat, lon, R), pontoNoGlobo(lat + 6, lon, R)); }

  const arame = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: COR.cy, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));

  corpo.add(arame);

  const casca = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 32, 20), new THREE.MeshBasicMaterial({ color: 0x0a1a24, transparent: true, opacity: 0.55, depthWrite: true }));

  corpo.add(casca);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaHalo(), color: COR.cy, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));

  halo.scale.set(2.5, 2.5, 1); halo.material.opacity = 0.12; g.add(halo);

  const hubs = {};

  Object.keys(HUBS).forEach(k => {

    const h = HUBS[k], p = pontoNoGlobo(h.lat, h.lon, R * 1.01);

    const m = new THREE.Mesh(new THREE.SphereGeometry(k === 'torre' ? 0.055 : 0.04, 10, 8), new THREE.MeshBasicMaterial({ color: h.cor, toneMapped: false }));

    m.position.copy(p); corpo.add(m);

    const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaHalo(), color: h.cor, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); brilho.scale.set(0.22, 0.22, 1); m.add(brilho);

    const etq = etiquetaGlobo(h.n, h.cor); etq.position.copy(p.clone().multiplyScalar(1.22)); corpo.add(etq);

    hubs[k] = { m, brilho, etq, p, pulso: 0 };

  });

  globo = { grupo: g, corpo, arame, casca, halo, hubs, arcos: [], R, giro: 0, visivel: false, rPx: 0, rect: null, n: 0 };

  g.visible = false;

  return globo;

}

// o arco de um mercado ate a torre: uma curva sobre a esfera que se desenha (1,2 s) e se apaga (2,5 s)

function arcoNoGlobo(ev) {

  if (!globo) return;

  const esp = window.T3BLigacoes ? window.T3BLigacoes.espDoAndar(ev.andar) : null;
  const k = MERCADO_DO_PROGRAMA[ev.id] || (ev.k === 'cotacao' ? 'binance' : esp === 'macro' ? 'londres' : 'ny');

  const h = globo.hubs[k]; if (!h) return;

  h.pulso = 1; globo.n++;

  if (ev.k === 'cotacao' || globo.arcos.length >= 8) return;          // a cotacao so faz o mercado piscar; o arco e para as ordens e os eventos

  const a = h.p, b = globo.hubs.torre.p, pts = [];

  for (let i = 0; i <= 40; i++) { const u = i / 40, v = a.clone().lerp(b, u).normalize().multiplyScalar(globo.R * (1.02 + Math.sin(u * Math.PI) * 0.35)); pts.push(v); }

  const geo = new THREE.BufferGeometry().setFromPoints(pts); geo.setDrawRange(0, 0);

  const linha = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: HUBS[k].cor, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));

  globo.corpo.add(linha); globo.arcos.push({ linha, t: 0 });

  precisaDesenhar = true;

}

function passoGlobo(dt) {

  if (!globo || !globo.visivel) return false;

  let mexe = false;

  const base = (window.__t3bHolo && window.__t3bHolo.base) ? window.__t3bHolo.base('globo') : 0;

  if (!calmo && base > 0.01) { globo.corpo.rotation.y += dt * 0.35 * base; mexe = true; }

  for (let i = globo.arcos.length - 1; i >= 0; i--) {

    const a = globo.arcos[i]; a.t += dt; mexe = true;

    a.linha.geometry.setDrawRange(0, Math.ceil(41 * Math.min(1, a.t / 1.2)));

    if (a.t > 1.2) a.linha.material.opacity = Math.max(0, 0.95 - (a.t - 1.2) / 1.3);

    if (a.t > 2.5) { globo.corpo.remove(a.linha); a.linha.geometry.dispose(); a.linha.material.dispose(); globo.arcos.splice(i, 1); }

  }

  Object.keys(globo.hubs).forEach(k => { const h = globo.hubs[k]; if (h.pulso > 0.01) { h.pulso *= Math.pow(0.2, dt); h.brilho.scale.setScalar(0.22 + h.pulso * 0.5); mexe = true; }

    // a etiqueta de um mercado que esta do lado de tras do globo esconde-se (nao se le atraves da esfera)

    h.m.getWorldPosition(_v); _v.sub(globo.grupo.position); h.etq.visible = _v.dot(_v2g.copy(camara.position).sub(globo.grupo.position)) > 0; });

  return mexe;

}

// preso ao ECRA na faixa livre entre a torre e a coluna de perto (ou a da direita), em baixo

function posicionarGlobo() {

  if (!globo || !torre) return;

  const mostrar = nivel <= 1 && !T3B.pequeno && !globoOculto;   // 04/10 (sonda): o detalhe do cartao abria por cima do globo

  if (!mostrar) { globo.grupo.visible = false; globo.visivel = false; globo.rect = null; return; }

  const pr = palco.getBoundingClientRect(), colP = document.querySelector('.holos.perto'), colD = document.querySelector('.holos.dir');

  let xMax = vistaW - 16; [colP, colD].forEach(c => { if (!c) return; const r = c.getBoundingClientRect(); if (r.width > 4 && r.left - pr.left < xMax) xMax = r.left - pr.left - 10; });

  // a aresta direita da torre no ecra (cantos da base, do meio e do topo)

  let xT = -1e9; [0, 0.25, 0.5].forEach(f => { const y = torre.altura * f; [[W / 2, D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [-W / 2, -D / 2]].forEach(([x, z]) => { _v.set(x, y, z).applyAxisAngle(EIXO_Y, angDe(y)); const q = projectar(_v.x, _v.y, _v.z); if (q.z < 1 && q.x > xT) xT = q.x; }); });

  const z = zonaLivre(), x0 = Math.max(xT + 10, z.l), x1 = Math.min(xMax, z.r), larg = x1 - x0;

  if (larg < 70) { globo.grupo.visible = false; globo.visivel = false; globo.rect = null; return; }

  const rPx = Math.max(28, Math.min(74, larg / 2 - 8)), cx = (x0 + x1) / 2, cy = z.b - rPx - 22;

  const ndc = _v.set(cx / vistaW * 2 - 1, -(cy / vistaH) * 2 + 1, 0.5).unproject(camara), dir = ndc.sub(camara.position).normalize();

  const dist = camara.position.distanceTo(controles.target), mpp = 2 * dist * Math.tan(camara.fov * Math.PI / 360) / vistaH;

  globo.grupo.position.copy(camara.position).addScaledVector(dir, dist);

  const S = rPx * mpp; globo.grupo.scale.setScalar(S);
  // as etiquetas dos mercados tem tamanho FIXO no ecra (sizeAttenuation false) - mas herdam a escala do grupo: compensa-se
  Object.keys(globo.hubs).forEach(k => { const e = globo.hubs[k].etq; e.scale.set(0.13 / S, 0.13 * 64 / 256 / S, 1); });

  globo.grupo.visible = true; globo.visivel = true; globo.rPx = rPx;

  globo.rect = { l: pr.left + cx - rPx - 14, t: pr.top + cy - rPx - 14, r: pr.left + cx + rPx + 14, b: pr.top + cy + rPx + 14 };

}



// ================================================================ A GAVETA (q20, ponto 4)
const CTX = { W, D, H, LAJE, COR, T3B, U, animados, molduraRect, nomeDoSector, texturaHalo, get noite() { return noite; }, get nivel() { return nivel; } };
const DESL_GAVETA = W * 1.32;   // sai mais para fora do que antes (1,08): ha um vao entre a gaveta e a torre
// 10/10: a copia publica (3brain.com.br/torre-viva/) nao tem servidor - cada andar e uma fotografia em andar/N.json
// (publicar_torre.py). Antes pedia andar.json?n=N tambem la: 404, e a gaveta abria sem ninguem no PC-HuntAI.
export function urlDoAndar(n, publicado, agora) {
  const pub = publicado === undefined ? !!window.T3B_PUBLICADO : publicado, t = agora === undefined ? Date.now() : agora;
  return pub ? 'andar/' + n + '.json?_=' + Math.floor(t / 60000) : 'andar.json?n=' + n + '&t=' + t;
}

async function abrirAndar(n, voar) {
  if (!torre || !torre.porN[n]) return;
  const a = torre.porN[n];
  if (aberto && aberto.n === n) { if (voar) enquadrar(2, true); return; }
  fecharAndar(true);
  const g = new THREE.Group(); g.position.set(0, a.y, 0); g.rotation.y = a.ang; torre.grupo.add(g);
  aberto = { n, a, grupo: new THREE.Group(), gaveta: g, actores: [], porProg: {}, mensageiros: [], pronto: false, desl: 0, alvoDesl: DESL_GAVETA, animados };
  const laje = new THREE.Mesh(new THREE.BoxGeometry(W, LAJE, D), new THREE.MeshStandardMaterial({ color: 0x1c1b22, metalness: 0.6, roughness: 0.4 })); laje.position.y = LAJE / 2; g.add(laje);
  const parapeito = new THREE.Mesh(molduraRect(W, D, 0.08, 1.0), new THREE.MeshPhysicalMaterial({ color: 0xbfe6f0, transparent: true, opacity: 0.18, metalness: 0.1, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })); parapeito.position.y = LAJE + 0.5; g.add(parapeito);
  const carril = new THREE.Mesh(molduraRect(W + 0.3, D + 0.3, 0.14, 0.1), new THREE.MeshBasicMaterial({ color: COR.ouro, toneMapped: false })); carril.position.y = LAJE + 0.02; g.add(carril);
  aberto.grupo.position.y = LAJE; g.add(aberto.grupo);
  escalarAndar(a, 0.001);
  if (voar) enquadrar(2, true);
  U.txt($('pc_andar'), n + ' · ' + a.nome);
  precisaDesenhar = true;
  try {
    const [gente] = await Promise.all([fetch(urlDoAndar(n), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('andar ' + n + ': HTTP ' + r.status); return r.json(); }), ANDAR.carregarModelos()]);
    if (!aberto || aberto.n !== n) return;
    ANDAR.construirEscritorio(aberto, gente, CTX);
    aberto.actores.forEach(ac => { ac.ab = aberto; });
    aberto.nPeoes = ((T3B.andar(n) || {}).n_peoes) || null;
    if (nivel === 3 && !camLivre) enquadrar(3, true);          // (se ele ja mexeu na camara, nao lha arranca)
    if (T3B.estado.ALERTAS) ANDAR.alertasNoAndar(aberto, T3B.estado.ALERTAS.alertas, CTX);
    U.txt($('pc_bon'), String(gente.gente ? gente.gente.length : 0));
    precisaDesenhar = true;
  } catch (e) { if (window.console) console.warn('andar', e); }
}
// o andar da gaveta some da torre (o buraco) - pelo shader, sem mexer na geometria; as faixas desse andar tambem
function escalarAndar(a, k) {
  ESCONDE.value = k < 0.01 ? a.i : -10;
  const segs = torre.inst.segs;
  for (let s = a.segInicio; s < a.segFim; s++) { segs.getMatrixAt(s, _m); const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); _m.decompose(p, q, sc); sc.y = k < 0.01 ? 0.001 : (H - LAJE) * 0.30; segs.setMatrixAt(s, _m.compose(p, q, sc)); }
  segs.instanceMatrix.needsUpdate = true;
  precisaDesenhar = true;
}
function fecharAndar(semAnimar) {
  if (!aberto) return;
  const ab = aberto; aberto = null;
  if (T3B.fecharPainel) T3B.fecharPainel();
  const ad = $('alerta_det'); if (ad) ad.hidden = true;
  const fim = () => { ab.actores.concat(ab.mensageiros).forEach(ac => ac.mixer && ac.mixer.stopAllAction()); if (ab.gaveta.parent) ab.gaveta.parent.remove(ab.gaveta); descartarSoProprias(ab.gaveta); if (torre && torre.porN[ab.n]) escalarAndar(torre.porN[ab.n], 1); precisaDesenhar = true; };
  if (semAnimar || calmo) fim();
  else animados.push({ t: 0, passo(dt) { this.t += dt / 0.7; ab.gaveta.position.copy(_v.set(1, 0, 0).applyAxisAngle(EIXO_Y, ab.a.ang).multiplyScalar(ab.alvoDesl * (1 - ease(Math.min(1, this.t))))); ab.gaveta.position.y = ab.a.y; if (this.t >= 1) { fim(); return false; } return true; } });
  gavetaAte = performance.now() + 760;                     // a gaveta a fechar desenha-se a todos os quadros (0,7 s)
  U.txt($('pc_andar'), '—'); U.txt($('pc_bon'), '0');
}
function descartarSoProprias(g) { g.traverse(x => { if (!x.userData.proprio) return; if (x.geometry && !x.isSprite) x.geometry.dispose(); [].concat(x.material || []).forEach(m => { if (m.map && !m.map.userData.partilhada) m.map.dispose(); m.dispose(); }); }); }
function passoGaveta(dt) {
  if (!aberto) return false;
  const ab = aberto; if (ab.desl >= ab.alvoDesl - 0.01) return false;
  if (!ab.t0Gaveta) ab.t0Gaveta = performance.now();
  ab.desl = calmo ? ab.alvoDesl : ab.alvoDesl * ease(Math.min(1, (performance.now() - ab.t0Gaveta) / 900));   // a gaveta desliza em 0,9 s pelo relogio
  ab.gaveta.position.copy(_v.set(1, 0, 0).applyAxisAngle(EIXO_Y, ab.a.ang).multiplyScalar(ab.desl)); ab.gaveta.position.y = ab.a.y;
  return true;
}
function nomeDoSector(id) { const p = String(id || '').split('|').filter(Boolean); return (p.length > 1 ? p.slice(1) : p).filter(x => !/^b\d+$/.test(x)).join(' ').replace(/_/g, ' ').slice(0, 26); }
function centroDaGaveta(ab) { return _v.set(1, 0, 0).applyAxisAngle(EIXO_Y, ab.a.ang).multiplyScalar(ab.alvoDesl).add(new THREE.Vector3(0, ab.a.y + 1, 0)).clone(); }
// os cantos da gaveta (posicao FINAL) no mundo
function cantosDaGaveta(ab) {
  const c = centroDaGaveta(ab), out = [];
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => [0, 2.6].forEach(y => { out.push(new THREE.Vector3(sx * W / 2, 0, sz * D / 2).applyAxisAngle(EIXO_Y, ab.a.ang).add(new THREE.Vector3(c.x, ab.a.y + y, c.z))); }));
  return out;
}
// a zona LIVRE do palco (em pixeis): sem a fita das cotacoes em cima, sem os niveis em baixo e, com o cartao do andar
// aberto, sem a coluna dele a esquerda - a gaveta enquadra-se nela ("a camara afasta-se para a ver inteira")
function zonaLivre() {
  // cada painel por cima do palco corta a zona livre pelo lado que MENOS area lhe tira (03/10 noite: a regra por
  // posicao classificava o cartao do andar, alto e no canto, como "faixa de cima" e a gaveta ficava com 48 px)
  const pr = palco.getBoundingClientRect(), z = { l: 16, t: 16, r: vistaW - 16, b: vistaH - 16 };
  const area = q => Math.max(0, q.r - q.l) * Math.max(0, q.b - q.t);
  const sobe = el => { if (!el || el.hidden) return; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return;
    const l = r.left - pr.left, t = r.top - pr.top, rr = r.right - pr.left, bb = r.bottom - pr.top;
    if (rr <= z.l || l >= z.r || bb <= z.t || t >= z.b) return;                                                        // ja fora da zona
    const cortes = [Object.assign({}, z, { t: Math.max(z.t, bb + 6) }), Object.assign({}, z, { b: Math.min(z.b, t - 6) }), Object.assign({}, z, { l: Math.max(z.l, rr + 8) }), Object.assign({}, z, { r: Math.min(z.r, l - 8) })];
    const melhor = cortes.sort((a, b) => area(b) - area(a))[0]; Object.assign(z, melhor); };
  ['.pc', '.fita-cot', '#niveis', '#painel.aberto', '#holos_tab', '.legenda-esp'].forEach(s => sobe(palco.querySelector(s) || document.querySelector(s)));
  return z;
}
function enquadrarGaveta(ab) {
  const c = centroDaGaveta(ab), ang = ab.a.ang;
  const fora = new THREE.Vector3(1, 0, 0).applyAxisAngle(EIXO_Y, ang), lado = new THREE.Vector3(0, 0, 1).applyAxisAngle(EIXO_Y, ang);
  // de fora e de lado e de cima: a torre fica atras e acima da gaveta (nunca a meio ecra)
  const dir = fora.clone().multiplyScalar(0.92).add(lado.clone().multiplyScalar(0.32)).add(new THREE.Vector3(0, 1.08, 0)).normalize();
  const cantos = cantosDaGaveta(ab), z = zonaLivre(), alvo = c.clone().add(new THREE.Vector3(0, -0.6, 0));
  const cabe = d => { camara.position.copy(alvo).addScaledVector(dir, d); camara.lookAt(alvo); camara.updateMatrixWorld(); camara.updateProjectionMatrix();
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9; cantos.forEach(p => { const q = projectar(p.x, p.y, p.z); l = Math.min(l, q.x); r = Math.max(r, q.x); t = Math.min(t, q.y); b = Math.max(b, q.y); });
    return { ok: l >= z.l && r <= z.r && t >= z.t && b <= z.b, l, t, r, b }; };
  const guarda = camara.position.clone(), gq = camara.quaternion.clone();
  let lo = 20, hi = 600;
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (cabe(m).ok) hi = m; else lo = m; }
  // o centro da gaveta no centro da zona livre: desloca-se o alvo pelo que falta
  const caixa = cabe(hi), dx = ((z.l + z.r) / 2 - (caixa.l + caixa.r) / 2), dy = ((z.t + z.b) / 2 - (caixa.t + caixa.b) / 2);
  const dist = hi * 1.04, escala = 2 * dist * Math.tan(camara.fov * Math.PI / 360) / vistaH;
  const dirX = new THREE.Vector3().setFromMatrixColumn(camara.matrixWorld, 0), dirY = new THREE.Vector3().setFromMatrixColumn(camara.matrixWorld, 1);
  const alvoF = alvo.clone().addScaledVector(dirX, -dx * escala).addScaledVector(dirY, dy * escala);
  camara.position.copy(guarda); camara.quaternion.copy(gq); camara.updateMatrixWorld();
  return { alvo: alvoF, pos: alvoF.clone().addScaledVector(dir, dist) };
}

// ================================================================ ALERTAS (03/10): farois na torre e no andar
function aplicarAlertas(A) {
  if (!torre) return;
  const lista = (A && A.alertas) || [], vivos = new Set();
  lista.forEach(al => {
    const a = al.andar != null ? torre.porN[al.andar] : null; if (!a) return;
    vivos.add(al.id);
    let f = torre.farois.get(al.id);
    if (!f) {
      const cor = al.sev_agora === 'vermelho' ? COR.mau : COR.am, g = new THREE.Group();
      const esf = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), new THREE.MeshBasicMaterial({ color: cor, toneMapped: false })); g.add(esf);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaHalo(), color: cor, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false })); halo.scale.set(0.085, 0.085, 1); g.add(halo);
      const anel = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: cor, toneMapped: false, transparent: true, opacity: 0.8 })); anel.rotation.x = Math.PI / 2; g.add(anel);
      const feixe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.9, 7, 12, 1, true), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); feixe.position.y = 3.5; g.add(feixe);
      const etq = ANDAR.etiquetaAlerta(al, cor); etq.scale.set(14, 14 * 176 / 640, 1); etq.position.y = 8.2; etq.visible = false; g.add(etq);
      g.userData.alerta = al; g.userData.proprio = true;
      f = { g, esf, halo, anel, feixe, etq, al }; torre.farois.set(al.id, f); torre.grupo.add(g);
    }
    f.al = al; f.g.userData.alerta = al;
    const pos = matrizDoAndar(a, -W / 2 - 1.2, H * 0.55, D / 2 + 1.2); f.g.position.setFromMatrixPosition(pos);
  });
  torre.farois.forEach((f, id) => { if (!vivos.has(id)) { torre.grupo.remove(f.g); torre.farois.delete(id); } });
  if (aberto && aberto.pronto) ANDAR.alertasNoAndar(aberto, lista, CTX);
  U.txt($('pc_alertas'), lista.length ? String(lista.length) : '0');
  const b = $('b_alertas'); if (b) { b.textContent = lista.length ? lista.length + ' por resolver' : 'nenhum'; b.className = lista.length ? 'mau' : ''; }
  precisaDesenhar = true;
}
function passoFarois(agora, dt) {
  if (!torre || !torre.farois.size) return false;
  const b = 0.5 + 0.5 * Math.sin(agora / 650);
  torre.farois.forEach(f => { f.anel.rotation.z += dt * 0.8; f.anel.scale.setScalar(1 + 0.15 * b); f.halo.material.opacity = 0.45 + 0.5 * b; f.feixe.material.opacity = 0.08 + 0.1 * b; f.etq.visible = nivel <= 1 && camara.position.distanceTo(f.g.position) < 420; });
  return true;
}

// ================================================================ a camara: niveis e viagens
function ligarNiveis() {
  const nv = $('niveis'); if (!nv) return;
  nv.addEventListener('click', ev => { const b = ev.target.closest('button[data-k]'); if (!b) return; irNivel(Number(b.dataset.k)); });
  document.addEventListener('keydown', e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (/^[0-3]$/.test(e.key)) irNivel(Number(e.key)); });
}
function irNivel(k) {
  if (!torre) return;
  if (k >= 2 && !aberto) { const n = T3B.estado.andarAberto || andarMaisVivo(); T3B.abrirAndar(n, false); }
  if (k <= 1 && aberto) { fecharAndar(false); T3B.fecharPainel && T3B.fecharPainel(); }
  enquadrar(k, true);
}
function andarMaisVivo() { const r = T3B.estado.ritmo && T3B.estado.ritmo.porAndar; let m = 48, mx = -1; if (r) Object.keys(r).forEach(n => { if (r[n] > mx && torre.porN[n]) { mx = r[n]; m = Number(n); } }); return m; }
function enquadrar(k, animar) {
  if (!torre) return;
  const alt = torre.altura, foco = aberto ? aberto.a : (torre.porN[T3B.estado.andarAberto] || torre.porN[48] || torre.andares[Math.floor(torre.andares.length * 0.8)]);
  let alvo, pos; const fov = camara.fov * Math.PI / 180;
  nivel = k; marcarNivel();   // (antes do calculo: a zona livre da gaveta depende do que o nivel mostra)
  camLivre = false;
  if (k === 0) {
    // a torre INTEIRA com o letreiro em cima (ponto 2: o letreiro e grande - entra no enquadramento)
    const topo = alt + (torre.coroa ? torre.coroa.AH : 8) + 58, tot = topo + 6, asp = Math.max(0.6, vistaW / vistaH);
    // 03/10 23:xx: a fita das cotacoes (em cima) passava POR CIMA do letreiro - o enquadramento usava o ecra inteiro.
    // Agora a torre e o letreiro cabem na ZONA LIVRE (sem a fita, sem os niveis) e ficam centrados nela.
    const z = zonaLivre(), f = Math.max(0.4, (z.b - z.t) / vistaH);
    const dist = Math.max((tot * 0.5 * 1.08) / (Math.tan(fov / 2) * f), (96 * 0.5 * 1.25) / (Math.tan(fov / 2) * asp));
    const escala = 2 * dist * Math.tan(fov / 2) / vistaH, dy = (z.t + z.b) / 2 - vistaH / 2;
    alvo = new THREE.Vector3(0, tot * 0.5 - 4 + dy * escala, 0); pos = alvo.clone().add(new THREE.Vector3(0.62, 0.16, 0.77).normalize().multiplyScalar(dist));
  }
  else if (k === 1) { alvo = new THREE.Vector3(0, foco.y + H / 2, 0); pos = alvo.clone().add(new THREE.Vector3(0.6, 0.22, 0.76).normalize().multiplyScalar(165)); }
  else {
    const c = aberto ? centroDaGaveta(aberto) : new THREE.Vector3(0, foco.y + 1, 0), ang = aberto ? aberto.a.ang : 0;
    const lado = new THREE.Vector3(0, 0, 1).applyAxisAngle(EIXO_Y, ang);
    if (k === 2) { if (aberto) { const e = enquadrarGaveta(aberto); alvo = e.alvo; pos = e.pos; } else { alvo = c.clone(); pos = c.clone().add(lado.clone().multiplyScalar(60).add(new THREE.Vector3(0, 60, 0))); } }
    else {
      alvo = c.clone();
      const ac = aberto && (aberto.actores.find(x => x.lugar && !x.lugar.gerente) || aberto.actores[0]);
      if (ac) { const w = new THREE.Vector3(ac.obj.position.x, 0, ac.obj.position.z).applyAxisAngle(EIXO_Y, ang); alvo.set(c.x + w.x, foco.y + LAJE + 1.0, c.z + w.z); }
      pos = alvo.clone().add(lado.clone().multiplyScalar(13).add(new THREE.Vector3(0, 8.5, 0)));
    }
  }
  if (!animar || calmo) { camara.position.copy(pos); controles.target.copy(alvo); controles.update(); }
  else alvoCam.anim = { t0: performance.now(), dur: 1.2, de: camara.position.clone(), deA: controles.target.clone(), para: pos, paraA: alvo, nivel: k };
  precisaDesenhar = true; camaraMudou = true;
}
// 04/10 (obra 4): com as tres colunas de hologramas, a torre (nivel 0 e 1) vai para o centro da FAIXA LIVRE entre a coluna da
// esquerda e a de perto - um pouco a direita do meio, para os rotulos dos andares caberem a esquerda e o globo a direita. Faz-se
// pelo DESLOCAMENTO DA VISTA (setViewOffset): o alvo continua no eixo da torre, por isso ao girar a torre nao foge do sitio.
function deslocarVista(k) {
  if (!camara || !vistaW) return;
  if (k >= 2 || T3B.pequeno) { if (camara.view && camara.view.enabled) { camara.clearViewOffset(); precisaDesenhar = true; } return; }
  const pr = palco.getBoundingClientRect(), e = document.querySelector('.holos.esq'), p = document.querySelector('.holos.perto') || document.querySelector('.holos.dir');
  let l = 0, r = vistaW;
  if (e) { const q = e.getBoundingClientRect(); if (q.width > 4) l = q.right - pr.left; }
  if (p) { const q = p.getBoundingClientRect(); if (q.width > 4) r = q.left - pr.left; }
  if (r - l < 200) { if (camara.view && camara.view.enabled) camara.clearViewOffset(); return; }
  const alvoX = l + (r - l) * (k === 0 ? 0.56 : 0.6), dx = Math.round(alvoX - vistaW / 2);
  if (camara.view && camara.view.enabled && camara.view.offsetX === -dx && camara.view.fullWidth === vistaW && camara.view.fullHeight === vistaH) return;
  camara.setViewOffset(vistaW, vistaH, -dx, 0, vistaW, vistaH); precisaDesenhar = true; rotulosPendentes = true;
}
function marcarNivel() {
  const pl = $('palco'), perto = nivel >= 2;
  document.body.classList.toggle('n3', nivel === 3); document.body.classList.toggle('n2', nivel === 2);
  if (pl && pl.classList.contains('perto') !== perto) { pl.classList.toggle('perto', perto); T3B.estado.perto = perto; if (!perto) pl.classList.remove('holos-de-volta'); T3B.emit('layout'); }
  Array.prototype.forEach.call(document.querySelectorAll('#niveis button[data-k]'), b => b.classList.toggle('on', Number(b.dataset.k) === nivel));
  U.txt($('pc_nivel'), ['Torre', 'Andares', 'Gaveta', 'Escritório'][nivel] || '…');
  deslocarVista(nivel);
  T3B.emit('nivel', nivel);
}
function nivelPelaDistancia() {
  const d = camara.position.distanceTo(controles.target), k = aberto ? (d < 30 ? 3 : 2) : (d < 300 ? 1 : 0);
  // durante uma viagem pedida (niveis/teclas) manda o nivel pedido; a distancia so decide quando ele usa o rato
  if (k !== nivel && !alvoCam.anim) { nivel = k; marcarNivel(); }
  if (!torre) return;
  // ponto 1: de longe um arranha-ceus liso (nem janelas acesas nem faixas); a aproximar sobem as janelas e as faixas
  const dc = camara.position.distanceTo(new THREE.Vector3(0, Math.min(torre.altura, Math.max(0, camara.position.y)), 0));
  const op = THREE.MathUtils.clamp((300 - dc) / 170, 0, 1) * 0.85;
  if (Math.abs(torre.inst.matSeg.opacity - op) > 0.01) { torre.inst.matSeg.opacity = op; precisaDesenhar = true; }
  // os LEDs: de longe um fio de luz quente e discreto (as "fatias"), que so ganha a cor da divisao a aproximar
  LED.perto = THREE.MathUtils.clamp((560 - dc) / 360, 0, 1);
  // c02 "letreiro/LEDs com falhas": de longe o fio de LED (0,16 m) e a helice ficavam com menos de 1 pixel e partiam-se em
  // tracos a cada quadro. Engrossam no shader (pela normal) ate ~1,1 px no ecra; de perto ficam com a medida real.
  const mpp = 2 * dc * Math.tan(camara.fov * Math.PI / 360) / Math.max(1, vistaH);
  ENGROSSA.led.value = Math.max(0, mpp * 0.55 - 0.08); ENGROSSA.tubo.value = Math.max(0, mpp * 0.6 - 0.34);
  // o letreiro so anima quando esta na vista (dentro do andar fica para tras: nao gasta)
  camara.updateMatrixWorld(); _pm.multiplyMatrices(camara.projectionMatrix, camara.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
  if (torre.letreiro) { torre.letreiro.grupo.getWorldPosition(_esf.center); _esf.radius = 48; letreiroNaVista = _fr.intersectsSphere(_esf); }
  torre.inst.halos.material.opacity = 0.14 + 0.42 * LED.perto;
  const oj = Math.max(0.45, THREE.MathUtils.clamp((340 - dc) / 180, 0, 1));   // 07/10 (Q5 D3): as luzes dos andares tambem de LONGE
  if (Math.abs(torre.inst.matLuz.opacity - oj) > 0.01) { torre.inst.matLuz.opacity = oj; torre.inst.luz.visible = oj > 0.01; if (torre.inst.luz.visible) pintarJanelas(); precisaDesenhar = true; }
}

// ---------------------------------------------------------------- rotulos dos andares (ao lado, como a antiga) e ANCORAS
let rotCx = null, rotEls = [], rectCol = null;
function htmlDoRotulo(a) { return '<b>' + a.n + '</b> ' + U.escH(a.nome) + ' <span>' + a.n_peoes + '</span>'; }
function rotulosDosAndares() {
  if (!rotCx) { rotCx = document.createElement('div'); rotCx.className = 'rotulos-andares'; rotCx.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden;contain:strict'; palco.insertBefore(rotCx, palco.querySelector('.holos')); }
  rotCx.innerHTML = ''; rotEls = [];
  torre.andares.forEach(a => {
    const el = document.createElement('div'); el.className = 'rot-andar';
    el.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-9999px,0);white-space:nowrap;border-left:2px solid #' + new THREE.Color(COR_DIV[a.divisao] || COR.ouro).getHexString();
    const html = htmlDoRotulo(a); el.innerHTML = html;
    rotCx.appendChild(el); rotEls.push({ el, a, vis: false, html, w: 0, tr: '' });
  });
}
// o texto de um rotulo so muda quando muda (o numero de funcionarios do andar); a largura mede-se UMA vez por texto
function actualizarRotulos() { rotEls.forEach(r => { const h = htmlDoRotulo(r.a); if (r.html !== h) { r.html = h; r.el.innerHTML = h; r.w = 0; } }); }
function projectar(x, y, z) { _v.set(x, y, z).project(camara); return { x: (_v.x * 0.5 + 0.5) * vistaW, y: (-_v.y * 0.5 + 0.5) * vistaH, z: _v.z }; }
// 04/10 (obra 4, "trava ao rodar"): isto corria a CADA quadro e lia o layout (getBoundingClientRect, offsetWidth) no meio das
// escritas dos transforms - o browser refazia o layout dezenas de vezes por segundo. Agora: no maximo 12x/s (o quadro), os
// retangulos da coluna ficam em cache ate a pagina mudar de tamanho, as larguras medem-se uma vez (todas as leituras antes
// de qualquer escrita) e so se escreve um transform que mudou.
const _ESQ = [[W / 2 + 1.5, 0], [0, D / 2 + 1.5], [0, -D / 2 - 1.5], [-W / 2 - 1.5, 0], [-W / 2, D / 2], [-W / 2, -D / 2], [W / 2, D / 2], [W / 2, -D / 2]];
function posicionarRotulos() {
  if (!rotEls.length) return;
  // os andares que os hologramas apontam ganham SEMPRE o rotulo (q25: "nomes dos andares ao lado, como a antiga"); os
  // outros entram so com espaco (14 px entre rotulos), a esquerda da torre e nunca por baixo da coluna dos hologramas
  if (rectsSujos || !rectCol) {
    rectsSujos = false;
    const colE = document.querySelector('.holos.esq'), pr = palco.getBoundingClientRect();
    rectCol = { limE: 8 };
    if (colE) { const r = colE.getBoundingClientRect(); if (r.width > 2) rectCol.limE = r.right - pr.left + 8; }
  }
  const presos = T3B.estado.andaresDosHolos || {}, limE = palco.classList.contains('perto') ? 8 : rectCol.limE;
  const mostrar = nivel <= 1;
  const cand = [];
  if (mostrar) rotEls.forEach(r => {
    const yy = r.a.y + H / 2, ang = angDe(yy);
    _v.set(-W / 2 - 1.5, yy, 0).applyAxisAngle(EIXO_Y, ang);
    const p = projectar(_v.x, _v.y, _v.z);
    if (!(p.z < 1 && p.y > 58 && p.y < vistaH - 52)) return;
    // o rotulo vai a esquerda da SILHUETA (a aresta que esta mais a esquerda no ecra)
    let xm = p.x; for (const [x, z] of _ESQ) { _v.set(x, yy, z).applyAxisAngle(EIXO_Y, ang); const q = projectar(_v.x, _v.y, _v.z); if (q.x < xm) xm = q.x; }
    cand.push({ r, x: xm - 6, y: p.y, pri: presos[r.a.n] ? 0 : (r.a.actMin > 0.15 ? 1 : 2) });
  });
  cand.sort((a, b) => a.pri - b.pri || b.r.a.n - a.r.a.n);
  cand.forEach(c => { if (!c.r.w) c.r.w = c.r.el.offsetWidth || 120; });           // leituras (so as que faltam) antes de escrever
  const usados = [], vis = new Set(), passoMin = nivel === 0 ? 20 : 15;
  cand.forEach(c => {
    if (nivel === 0 && c.pri > 1) return;                       // de longe: so os andares dos hologramas e os que mexem agora
    if (c.pri > 0 && usados.some(y => Math.abs(y - c.y) < passoMin)) return;
    if (c.pri === 0 && usados.some(y => Math.abs(y - c.y) < 11)) c.y = usados.reduce((m, y) => Math.abs(y - c.y) < 11 ? Math.max(m, y + 12) : m, c.y);
    const w = c.r.w; if (c.x - w < limE) { if (c.pri > 0) return; }
    usados.push(c.y); vis.add(c.r);
    const tr = 'translate(' + Math.round(Math.max(limE + w, c.x)) + 'px,' + Math.round(c.y - 8) + 'px) translateX(-100%)';
    if (c.r.tr !== tr) { c.r.tr = tr; c.r.el.style.transform = tr; }
    const pz = c.pri === 0; if (c.r.preso !== pz) { c.r.preso = pz; c.r.el.classList.toggle('preso', pz); }
  });
  rotEls.forEach(r => { if (!vis.has(r) && r.vis) { r.tr = ''; r.el.style.transform = 'translate(-9999px,0)'; } r.vis = vis.has(r); });
  // as ancoras: a aresta esquerda e direita de cada andar (o angulo da torcao a meia altura do andar)
  const anc = {};
  torre.andares.forEach(a => { const ang = angDe(a.y + H / 2); [['e', -1], ['d', 1]].forEach(([k, sg]) => { let best = null; [[sg * (W / 2 + 0.6), 0], [sg * W / 2, D / 2], [sg * W / 2, -D / 2]].forEach(([x, z]) => { _v.set(x, a.y + H / 2, z).applyAxisAngle(EIXO_Y, ang); const p = projectar(_v.x, _v.y, _v.z); if (!best || (sg < 0 ? p.x < best.x : p.x > best.x)) best = p; }); anc[a.n + k] = { x: best.x, y: best.y, ok: best.z < 1 && best.x > -50 && best.x < vistaW + 50 && best.y > 0 && best.y < vistaH }; }); });
  if (aberto) { const c = centroDaGaveta(aberto), p = projectar(c.x, c.y + 2, c.z); anc.gaveta = { x: p.x, y: p.y, ok: p.z < 1 }; }
  // os objectos 3D novos (globo dos mercados) tambem dizem onde estao no ecra: o detector de sobreposicoes da sonda conta-os
  posicionarGlobo();
  T3B.emit('ancoras', { anc, vista: [vistaW, vistaH], nivel });
}

// ---------------------------------------------------------------- o rato
const raio = new THREE.Raycaster(), rato = new THREE.Vector2();
let ultRato = 0, baixo = null;
function ligarRato() {
  cv.addEventListener('pointermove', ev => { ultimoMexeu = performance.now(); controles.autoRotate = false; const agora = performance.now(); if (agora - ultRato < 80) return; ultRato = agora; const r = cv.getBoundingClientRect(); rato.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1); etiqueta(ev.clientX - r.left, ev.clientY - r.top); });
  cv.addEventListener('pointerleave', () => { const e = $('etiq'); if (e) e.hidden = true; });
  cv.addEventListener('pointerdown', ev => { baixo = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
  cv.addEventListener('pointerup', ev => {
    if (!baixo || Math.hypot(ev.clientX - baixo.x, ev.clientY - baixo.y) > 5 || performance.now() - baixo.t > 500) { baixo = null; return; }
    baixo = null; const r = cv.getBoundingClientRect(); rato.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
    const al = alertaSobRato(); if (al) { T3B.emit('alertaDetalhe', al); return; }
    const a = andarSobRato(); if (a) T3B.abrirAndar(a.n, true);
  });
  cv.addEventListener('dblclick', () => { if (aberto) { fecharAndar(false); T3B.fecharPainel && T3B.fecharPainel(); enquadrar(1, true); } });
}
function alertaSobRato() {
  if (!torre) return null; raio.setFromCamera(rato, camara);
  const objs = []; torre.farois.forEach(f => objs.push(f.g)); if (aberto && aberto.alertasFarol) aberto.alertasFarol.forEach(f => objs.push(f.g));
  if (!objs.length) return null;
  const h = raio.intersectObjects(objs, true)[0]; if (!h) return null;
  let o = h.object; while (o && !o.userData.alerta) o = o.parent; return o ? o.userData.alerta : null;
}
function andarSobRato() {
  if (!torre) return null; raio.setFromCamera(rato, camara);
  const hit = raio.intersectObject(torre.inst.lajes, false)[0] || raio.intersectObject(torre.inst.vidro, false)[0];
  if (!hit) return null;
  if (hit.object === torre.inst.lajes) return torre.andares[hit.instanceId];
  return torre.andares[Math.max(0, Math.min(torre.andares.length - 1, Math.floor(hit.point.y / H)))] || null;
}
function etiqueta(x, y) {
  const el = $('etiq'); if (!el || !torre) return;
  raio.setFromCamera(rato, camara);
  const al = alertaSobRato(); if (al) { el.innerHTML = '<b>⚠ ' + U.escH(U.limpo((T3B.quem(al.funcionario) || {}).nome || al.funcionario)) + '</b><i>' + U.escH(U.cortar(U.limpo(al.o_que_falhou || al.tipo || ''), 90)) + ' · ' + (al.tentativas || 0) + ' tentativas · clique para o detalhe</i>'; posEtiq(el, x, y); return; }
  if (aberto && aberto.pronto) {
    const objs = aberto.actores.concat(aberto.mensageiros).map(a => a.obj), h = raio.intersectObjects(objs, true)[0];
    if (h) { let o = h.object; while (o && !o.userData.actor) o = o.parent; const ac = o && o.userData.actor; if (ac) { el.innerHTML = '<b>' + U.escH(U.limpo(ac.nome)) + '</b><i>' + U.escH(U.cortar(U.limpo(ac.prog ? (ac.prog.cargo || '') : (ac.nivel === 'supervisor' ? 'líder de sector' : 'visitante')), 120)) + ' · ' + U.escH(ac.especie) + ' · ' + U.escH(ac.estado.replace('_', ' ')) + '</i>'; posEtiq(el, x, y); return; } }
  }
  const a = andarSobRato(); if (!a) { el.hidden = true; return; }
  const s = T3B.andar(a.n) || {};
  const tt = s.turnos || s.censo;
  el.innerHTML = '<b>' + a.n + ' · ' + U.escH(U.limpo(a.nome)) + '</b><i>' + U.escH(s.n_peoes != null ? s.n_peoes + ' funcionários · ' : '') + (tt ? U.escH(U.fmt(tt.a_trabalhar_agora, 0) + ' a trabalhar agora · ') : '') + (s.sectores ? s.sectores.length + ' sectores · ' : '') + U.escH(a.divisao || '') + (a.obra === 'em_obras' ? ' · em obras' : '') + ' · clique para puxar a gaveta</i>';
  posEtiq(el, x, y);
}
function posEtiq(el, x, y) { el.hidden = false; el.style.left = Math.min(vistaW - 290, x + 14) + 'px'; el.style.top = Math.max(6, y - 10) + 'px'; }

// ================================================================ O QUADRO
let ultimo = 0, ultimoDesenho = 0, fpsAm = [], ultHUD = 0, gavetaAberta = false, ultNomes = 0, andarMexeu = false, ultRotulos = 0, ultLod = 0, letreiroNaVista = true, gavetaAte = 0, forcarTodos = 0, globoMexe = false;
T3B.on('gaveta', a => { gavetaAberta = a; precisaDesenhar = true; });
// O MODO do quadro (obra 4): pelo que mexe. Interaccao = ele (ou a camara a viajar, ou a gaveta a deslizar); vivo = a torre a
// girar sozinha, o letreiro a vista, luz a correr, bonecos a andar; repouso = so a respiracao dos LEDs.
function modoDoQuadro(agora) {
  if (agora < forcarTodos) return 'interaccao';
  if (alvoCam.anim || interagindo || agora - fimInteracao < 700 || agora < gavetaAte || (aberto && aberto.desl < aberto.alvoDesl - 0.01)) return 'interaccao';
  if (calmo) return 'repouso';
  if (controles.autoRotate || animados.length || ledsQuentes.size || andarMexeu || globoMexe || CLIMA.chuva && CLIMA.chuva.visible || (torre && (torre.pulsos.length || torre.quentes.size || (letreiroNaVista && nivel <= 1)))) return 'vivo';
  return 'repouso';
}
function quadro(agora) {
  requestAnimationFrame(quadro);
  if (document.hidden || gavetaAberta || T3B.pequeno || pausado) return;
  const modo = modoDoQuadro(agora);
  if (modo !== modoQ) { modoQ = modo; modoDesde = agora; }
  // o relogio da pagina (t3b_ritmo.js): a interagir (ou a camara/gaveta a viajar) os quadros sao os do ecra; senao 20 por
  // segundo, 30 com bonecos a andar dentro do andar - e os outros ciclos (hologramas, numeros, reactor) vao no mesmo quadro
  const RIT = window.T3BRitmo;
  if (RIT) { if (modo === 'interaccao') RIT.soltar(160); RIT.hz = 60; }   // 05/10: a pagina a 60 sempre (os hologramas andam mesmo com a torre quieta)
  // a cadencia: interaccao todos os quadros; vivo 30/s; repouso 6/s (sem respiracao - reduced motion - so quando um dado muda)
  // (a torre a girar sozinha e o letreiro: 20 quadros/s chegam - 0,1 grau por quadro; bonecos a andar dentro do andar: 30)
  const cad = calmo && modo === 'repouso' ? (precisaDesenhar ? 0 : 1e9) : modo === 'repouso' && precisaDesenhar ? 0 : CADENCIA[modo];
  cadPedida = Math.max(cad >= 1e9 ? 0 : cad, RIT && !RIT.livre() ? 1000 / RIT.hz : 0);
  if (ultimoDesenho && agora - ultimoDesenho < cad - 2) return;
  const dt = ultimo ? Math.min(0.1, (agora - ultimo) / 1000) : 0.016;
  const intervalo = ultimoDesenho ? agora - ultimoDesenho : 0;
  ultimo = agora;
  aplicarPR(agora);
  // a viagem da camara pelo RELOGIO (nao pelo dt limitado): 1,2 s sempre, mesmo num quadro lento
  if (alvoCam.anim) { const A = alvoCam.anim; A.t = (agora - A.t0) / 1000 / A.dur; const k = ease(Math.min(1, A.t)); camara.position.lerpVectors(A.de, A.para, k); controles.target.lerpVectors(A.deA, A.paraA, k); if (A.t >= 1) alvoCam.anim = null; camaraMudou = true; }
  if (!calmo && !alvoCam.anim && agora - ultimoMexeu > 3500 && !controles.autoRotate && nivel <= 1) controles.autoRotate = true;   // q18: gira devagar sozinha
  if (nivel >= 2 && controles.autoRotate) controles.autoRotate = false;                                                              // dentro do andar a camara fica onde ele a pos
  controles.update(dt);                       // (com o dt: a rotacao sozinha e pelo relogio, igual a 30 ou a 60 quadros)
  for (let i = animados.length - 1; i >= 0; i--) if (!animados[i].passo(dt)) animados.splice(i, 1);
  arrefecer(dt, agora);
  passoLeds(agora, dt);
  if (letreiroNaVista || !torre || !torre.coroa || agora - torre.coroa.arranque < 2000) animarLetreiro(agora, dt);
  passoClima(dt);
  if (passoGaveta(dt)) camaraMudou = true;
  passoFarois(agora, dt);
  globoMexe = passoGlobo(dt);
  andarMexeu = false;
  if (aberto && aberto.pronto) {
    // LOD no escritorio (obra 4): o passo corre a cada quadro desenhado (os quadros ja sao poucos quando nada mexe); quem esta
    // sentado e parado nao gasta (t3b_andar.js: sem mixer, e de longe vira a multidao instanciada)
    andarMexeu = ANDAR.passoAndar(aberto, dt, agora, CTX);
    if (agora - ultLod > 250 || camaraMudou) { ultLod = agora; if (ANDAR.lodDoAndar(aberto, camara, nivel, CTX)) andarMexeu = true; }
    if (camaraMudou || alvoCam.anim) ANDAR.esbaterPlacas(aberto, camara.position);
    if (agora - ultNomes > 500) { ultNomes = agora; let n = 0; aberto.actores.concat(aberto.mensageiros).forEach(ac => { if (ac.estado === 'a_andar') n++; }); U.txt($('pc_and'), String(n)); ANDAR.nomesVisiveis(aberto, nivel >= 3 ? aberto.grupo.worldToLocal(controles.target.clone()) : null, nivel >= 3 ? 12 : 0, projectar); }
  }
  if (ultimoDesenho) { fpsAm.push(1000 / (agora - ultimoDesenho)); if (fpsAm.length > 60) fpsAm.shift(); }
  ultimoDesenho = agora;
  // os rotulos dos andares e as ancoras dos hologramas mexem o DOM: no maximo 12 vezes por segundo (era a cada quadro, com
  // leituras de layout no meio das escritas - o "trava ao rodar"), e uma ultima vez quando a camara para
  if (camaraMudou || controles.autoRotate) {
    rotulosPendentes = true;
    if (agora - ultRotulos > 80) { ultRotulos = agora; nivelPelaDistancia(); posicionarRotulos(); rotulosPendentes = false; }
    camaraMudou = false;
  } else if (rotulosPendentes && agora - ultRotulos > 80) { ultRotulos = agora; nivelPelaDistancia(); posicionarRotulos(); rotulosPendentes = false; }
  tamanhoDosHalos();
  const t0 = performance.now();
  renderer.render(cena, camara);
  desenhadosN++;
  medirCusto(performance.now() - t0, intervalo, agora);
  precisaDesenhar = false;
  // o fps do canto: os quadros desenhados no ultimo segundo ("parado" quando nada mexe - desenha de proposito pouco)
  if (agora - ultHUD > 1000) { const n = desenhadosN - (ultHUDn || 0); ultHUDn = desenhadosN; ultHUD = agora; U.txt($('pc_fps'), modoQ === 'repouso' ? 'parado' : String(n)); }
}
let rotulosPendentes = false, pausado = false, ultHUDn = 0;   // (pausado: so para medir - a bancada separa o custo do 3D do resto)

// ---------------------------------------------------------------- o contrato com quem mede (sonda_t3b.js)
function retanguloNoEcra(pts) {
  const pr = palco.getBoundingClientRect(); let l = 1e9, t = 1e9, r = -1e9, b = -1e9, atras = false;
  pts.forEach(p => { const q = projectar(p.x, p.y, p.z); if (q.z >= 1) atras = true; l = Math.min(l, q.x); r = Math.max(r, q.x); t = Math.min(t, q.y); b = Math.max(b, q.y); });
  if (atras) return null;
  return { l: Math.max(pr.left, pr.left + l), t: Math.max(pr.top, pr.top + t), r: Math.min(pr.right, pr.left + r), b: Math.min(pr.bottom, pr.top + b) };
}
function coberturaDaTorre() {
  // a fraccao do palco que a torre ocupa (ponto 4: "a torre nao ocupa meio ecra" com a gaveta aberta)
  if (!torre) return null; const G = 24; let dentro = 0;
  const caixas = [];
  for (let i = 0; i < torre.andares.length; i += 3) { const a = torre.andares[i], pts = []; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => [0, H * 3].forEach(y => pts.push(new THREE.Vector3(sx * W / 2, a.y + y, sz * D / 2).applyAxisAngle(EIXO_Y, a.ang)))); const r = retanguloNoEcra(pts); if (r) caixas.push(r); }
  const pr = palco.getBoundingClientRect();
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) { const x = pr.left + (i + 0.5) * pr.width / G, y = pr.top + (j + 0.5) * pr.height / G; if (caixas.some(c => x >= c.l && x <= c.r && y >= c.t && y <= c.b)) dentro++; }
  return Math.round(dentro / (G * G) * 100);
}
function olharLocal(x, z, dist, alt, dirAng) {
  if (!aberto) return;
  const c = centroDaGaveta(aberto), ang = aberto.a.ang, p = new THREE.Vector3(x, 0, z).applyAxisAngle(EIXO_Y, ang).add(new THREE.Vector3(c.x, aberto.a.y + LAJE + 1.1, c.z));
  const d = new THREE.Vector3(Math.sin(dirAng == null ? 0 : dirAng), 0, Math.cos(dirAng == null ? 0 : dirAng)).applyAxisAngle(EIXO_Y, ang).multiplyScalar(dist).add(new THREE.Vector3(0, alt, 0));
  alvoCam.anim = null; controles.autoRotate = false; ultimoMexeu = performance.now();
  camara.position.copy(p).add(d); controles.target.copy(p); controles.update(); nivel = 3; marcarNivel(); precisaDesenhar = true; camaraMudou = true;
}
window.__t3b3d = {
  estado: () => ({ erro: window.__t3bErro || null, nivel, aberto: aberto ? aberto.n : null, pronto: aberto ? !!aberto.pronto : null, actores: aberto ? aberto.actores.length : 0, mensageiros: aberto ? aberto.mensageiros.length : 0,
    aAndar: aberto ? aberto.actores.concat(aberto.mensageiros).filter(a => a.estado === 'a_andar').length : 0, andares: torre ? torre.andares.length : 0, animados: animados.length, degrau: Object.assign({}, degrau), pixelRatio: renderer ? renderer.getPixelRatio() : null, dpr: DPR, msQuadro,
    fps: fpsAm.length ? Math.round(fpsAm.slice().sort((a, b) => a - b)[fpsAm.length >> 1]) : null, camara: camara ? camara.position.toArray().map(x => Math.round(x)) : null, vista: [vistaW, vistaH],
    chamadas: renderer ? renderer.info.render.calls : null, triangulos: renderer ? renderer.info.render.triangles : null, farois: torre ? torre.farois.size : 0, faroisAndar: aberto && aberto.alertasFarol ? aberto.alertasFarol.size : 0, clima: CLIMA.modo, autoRotate: controles ? controles.autoRotate : null,
    janelasOpacidade: torre ? Math.round(torre.inst.matLuz.opacity * 100) / 100 : null, faixasOpacidade: torre ? Math.round(torre.inst.matSeg.opacity * 100) / 100 : null, torreNoEcraPct: nivel === 2 ? coberturaDaTorre() : null,
    modo: modoQ, msDesenho: msDesenho.length ? Math.round(msDesenho.slice().sort((a, b) => a - b)[msDesenho.length >> 1] * 100) / 100 : null, desenhados: desenhadosN, letreiroNaVista }),
  // a bancada (sala/sonda_t3b.js, perfil fps1536): quantos quadros desenhou, e a CAPACIDADE - desenhar a todos os quadros
  // durante `ms` (como se ele estivesse a arrastar) e contar quantos sairam
  desenhados: () => desenhadosN,
  bancada: ms => new Promise(res => { const n0 = desenhadosN, t0 = performance.now(); forcarTodos = t0 + (ms || 3000); setTimeout(() => { const dt = (performance.now() - t0) / 1000; res({ fps: Math.round((desenhadosN - n0) / dt), pixelRatio: renderer.getPixelRatio(), chamadas: renderer.info.render.calls, msDesenho: msDesenho.length ? Math.round(msDesenho.slice(-60).sort((a, b) => a - b)[Math.min(29, msDesenho.slice(-60).length >> 1)] * 100) / 100 : null }); }, (ms || 3000) + 30); }),
  nivel: irNivel, abrir: n => T3B.abrirAndar(n, true), fechar: () => { fecharAndar(false); enquadrar(1, true); },
  simular: e => receberEventos([Object.assign({ s: 0, t: new Date().toISOString(), ms: Date.now() }, e)]),
  simularAlerta: lista => aplicarAlertas({ t_iso: new Date().toISOString(), alertas: lista }),
  olhar: (x, y, z, tx, ty, tz) => { camara.position.set(x, y, z); controles.target.set(tx, ty, tz); controles.update(); precisaDesenhar = true; camaraMudou = true; },
  rodar: g => { controles.autoRotate = false; const a = THREE.MathUtils.degToRad(g), p = camara.position.clone().sub(controles.target); p.applyAxisAngle(EIXO_Y, a); camara.position.copy(controles.target).add(p); controles.update(); precisaDesenhar = true; camaraMudou = true; },
  leds: () => ({ respiracao: Math.round(LED.resp * 100) / 100, onda: Math.round(LED.onda * 10) / 10, pulsos: LED.n, brilhoMedio: Math.round((LED.media || 0) * 100) / 100 }),
  perto: () => { if (!torre) return; const a = torre.porN[48] || torre.andares[torre.andares.length - 10]; alvoCam.anim = null; controles.autoRotate = false; ultimoMexeu = performance.now(); const alvo = new THREE.Vector3(0, a.y, 0); camara.position.copy(alvo).add(new THREE.Vector3(0.55, 0.12, 0.83).normalize().multiplyScalar(105)); controles.target.copy(alvo); controles.update(); camaraMudou = true; },
  focoLetreiro: longe => { if (!torre) return; alvoCam.anim = null; controles.autoRotate = false; ultimoMexeu = performance.now(); const y = torre.altura + torre.coroa.AH + 22; const alvo = new THREE.Vector3(0, y, 0); camara.position.copy(alvo).add(new THREE.Vector3(0.6, longe ? 0.1 : 0.05, 0.8).normalize().multiplyScalar(longe ? 330 : 120)); controles.target.copy(alvo); controles.update(); camaraMudou = true; },
  focoBoneco: (i, dist) => { if (!aberto || !aberto.actores.length) return; const ac = aberto.actores[Math.min(i || 0, aberto.actores.length - 1)]; olharLocal(ac.obj.position.x, ac.obj.position.z, dist || 4.5, 1.6, ac.lugar && ac.lugar.ry === 0 ? Math.PI : 0); },
  olharLocal,
  ocultarGlobo: (s) => { globoOculto = !!s; posicionarGlobo(); },
  paineis3d: () => { const out = []; if (aberto && nivel === 2 && aberto.desl >= aberto.alvoDesl - 0.5) { const r = retanguloNoEcra(cantosDaGaveta(aberto)); if (r) out.push({ n: '3d:gaveta', r }); } if (globo && globo.visivel && globo.rect) out.push({ n: '3d:globo', r: globo.rect }); return out; },
  depuracao: () => ({ cena, camara, globo, CLIMA, torre }),
  pausar: v => { pausado = !!v; return pausado; },
  forcarPR: v => { PR.vivo = [v, v]; PR.interaccao = [v, v]; degrau.vivo = 0; degrau.interaccao = 0; aplicarPR(performance.now() + 1e6); return renderer.getPixelRatio(); },   // 05/10: so para medir (perfil_t3b.js --pr)
  globo: () => globo ? { visivel: globo.visivel, raioPx: Math.round(globo.rPx), arcos: globo.arcos.length, eventos: globo.n, rect: globo.rect } : null,
  roteiroEscritorio: () => ANDAR.ROTEIRO.map(p => ({ id: p.id, itens: p.itens, espera: p.espera })),
  passoEscritorio: id => { if (!aberto || !aberto.pronto) return { ok: false, nota: 'andar fechado' }; const r = ANDAR.demonstrar(aberto, CTX, id) || {}; if (r.foco) olharLocal(r.foco.x, r.foco.z, r.foco.dist || 9, r.foco.alt || 6, r.foco.ang); return { ok: !!r.ok, nota: r.nota || '' }; },
  depurar: () => { const r = x => x ? x.toArray().map(v => Math.round(v * 10) / 10) : null, v = new THREE.Vector3(), w = new THREE.Vector3();
    if (aberto && aberto.actores[0]) aberto.actores[0].obj.getWorldPosition(v); if (aberto) aberto.gaveta.getWorldPosition(w);
    return { view: camara.view && camara.view.enabled ? [camara.view.offsetX, camara.view.fullWidth, camara.view.fullHeight] : null, fov: camara.fov, aspect: camara.aspect, alvo: r(controles.target), cam: r(camara.position), actor0: aberto ? r(v) : null, gaveta: aberto ? r(w) : null, desl: aberto ? [aberto.desl, aberto.alvoDesl] : null, focoY: aberto ? aberto.a.y : null }; }
};

if (!temWebGL()) { const a = $('aviso3d'); if (a) { a.hidden = false; a.textContent = 'Esta máquina não tem WebGL: a torre 3D não arranca. Os números, o chat e o instrumento continuam vivos.'; } }
else iniciar();
