/* Conjunto pt-PT ALARGADO. O anterior tinha 16 e eu escolhi-as sabendo o que
   a base tinha -- este junta as formas que um portugues usa e que eu NAO
   optimizei: gestao, contratualizacao, IPSS, Seguranca Social, ecra, gerir. */
import { M, ENTRADAS } from './peneira.mjs';
const PT=new Map(); for(const e of ENTRADAS) for(const l of ['pt','en']) if(e[l]) PT.set(String(e[l]).slice(0,120),e.id);
export const CASOS = [
  ['quanto custa por utente',['preco-savi','precos-resumo']],
  ['o savi serve para ERPI',['savi-segmentos']],
  ['trabalham com lares em portugal',['savi-segmentos','mercado-portugues']],
  ['qual o preco por cama',['savi-unidade-leito','preco-savi']],
  ['a aplicacao esta na loja',['onde-publicado']],
  ['quanto e o IVA disso',['imposto-simples']],
  ['voces facturam quanto',['receita-hoje']],
  ['a equipa e de quantas pessoas',['tamanho-time']],
  ['ha ficheiro de dados dos utentes',['rgpd-europa','lgpd-savi']],
  ['o RGPD e cumprido',['rgpd-europa']],
  ['qual o mercado portugues',['mercado-portugues']],
  ['sois de que pais',['onde-ficamos']],
  // as NOVAS, que eu nao optimizei
  ['trabalham com IPSS',['savi-segmentos','mercado-portugues']],
  ['ha contratualizacao com a seguranca social',['mercado-portugues','savi-segmentos']],
  ['o estado comparticipa quanto',['mercado-portugues']],
  ['isto e um dispositivo medico',['anvisa-regulatorio']],
  ['precisa de marcacao CE',['anvisa-regulatorio']],
  ['como se faz a gestao dos registos',['o-que-e-savi','como-entra-o-dado']],
  ['funciona no ecra do posto',['como-entra-o-dado','o-que-e-savi']],
  ['quem gere isto no dia a dia',['o-que-e-savi','como-entra-o-dado']],
  ['ha lista de espera nos lares',['mercado-portugues']],
  ['quantos lugares ha nas ERPI',['mercado-portugues']],
  ['os enfermeiros portugueses usam isto',['quem-usa-savi','savi-piloto']],
  ['e caro para um lar pequeno',['preco-savi','savi-incerteza-leito']],
];
if (process.argv[1].endsWith('ptpt.mjs')) {
  let p1=0,t5=0; const fora=[];
  for (const [q,alvos] of CASOS) {
    const r=M.paraOWorker(q,'pt',null)||[]; const lista=Array.isArray(r)?r:(r.contexto||[]);
    const ids=lista.map(c=>PT.get(String(c.texto||'').slice(0,120))||'?');
    const i=ids.findIndex(x=>alvos.indexOf(x)>=0);
    if(i===0)p1++; if(i>=0&&i<5)t5++;
    if(i<0||i>=5) fora.push([q,alvos.join('/'),ids.slice(0,3).join(', ')]);
  }
  console.log(`LEXICO pt-PT: ${p1}/${CASOS.length} em 1o, ${t5}/${CASOS.length} no top 5`);
  console.log('');
  for(const [q,e,t] of fora) console.log(`  X "${q}"\n      esperava ${e}\n      veio ${t}`);
}
