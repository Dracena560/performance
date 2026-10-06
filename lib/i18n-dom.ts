/**
 * English rendering of the Portuguese interface. The UI is written in pt-BR; when English is chosen,
 * visible text is mapped through a dictionary (exact phrases), template patterns (phrases with
 * values) and generic rules for dates and numbers. User-entered content is left as typed.
 */
const collapse=(text:string)=>text.replace(/\s+/g,' ').trim();
const escapeRe=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

type Pattern={re:RegExp;out:string};
function compile(dictionary:Record<string,string>){
 const exact=new Map<string,string>();const patterns:Pattern[]=[];
 for(const [pt,en] of Object.entries(dictionary)){
  if(!pt.includes('${')){exact.set(collapse(pt),en);continue;}
  const exprs:string[]=[];const source=pt.split(/(\$\{[^}]*\})/).map(part=>{if(/^\$\{[^}]*\}$/.test(part)){exprs.push(part);return '(.+?)';}return escapeRe(collapse(part).length?part.replace(/\s+/g,' '):part);}).join('');
  // Patterns need real words around the values, otherwise "${a}. ${b}" would swallow any sentence.
  if(!exprs.length||pt.replace(/\$\{[^}]*\}/g,'').replace(/[^\p{L}]/gu,'').length<4)continue;
  let out=en;exprs.forEach((expr,i)=>{out=out.split(expr).join(`{{${i+1}}}`);});
  try{patterns.push({re:new RegExp(`^${source.trim()}$`),out});}catch{/* skip invalid pattern */}
 }
 // Longer literal templates first, so specific phrases win over generic ones.
 patterns.sort((a,b)=>b.re.source.replace(/\(\.\+\?\)/g,'').length-a.re.source.replace(/\(\.\+\?\)/g,'').length);
 return {exact,patterns};
}

const weekdays:Record<string,string>={'segunda-feira':'Monday','terça-feira':'Tuesday','quarta-feira':'Wednesday','quinta-feira':'Thursday','sexta-feira':'Friday','sábado':'Saturday','domingo':'Sunday'};
const shortDays:Record<string,string>={seg:'Mon',ter:'Tue',qua:'Wed',qui:'Thu',sex:'Fri','sáb':'Sat',dom:'Sun'};
const months:Record<string,string>={janeiro:'January',fevereiro:'February','março':'March',abril:'April',maio:'May',junho:'June',julho:'July',agosto:'August',setembro:'September',outubro:'October',novembro:'November',dezembro:'December'};
const shortMonths:Record<string,string>={jan:'Jan',fev:'Feb',mar:'Mar',abr:'Apr',mai:'May',jun:'Jun',jul:'Jul',ago:'Aug',set:'Sep',out:'Oct',nov:'Nov',dez:'Dec'};
const cap=(word:string,like:string)=>like[0]===like[0]?.toUpperCase()?word:word;

/** "segunda-feira, 5 de outubro de 2026" → "Monday, 5 October 2026"; "qui., 08 de out." → "Thu, 08 Oct". */
export function englishDates(text:string){
 const onlyToken=/^\p{L}+\.?$/u.test(text.trim());
 if(!/\d/.test(text)&&!onlyToken&&!Object.keys(weekdays).some(w=>text.toLowerCase().includes(w)))return text;
 let out=text.replace(/\b(segunda|terça|quarta|quinta|sexta)-feira\b|\bsábado\b|\bdomingo\b/giu,m=>cap(weekdays[m.toLowerCase()]??m,m));
 out=out.replace(/(?<![\p{L}])(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?![\p{L}])/giu,m=>months[m.toLowerCase()]??m);
 const mon='(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)';
 // Short months only next to a day or a year ("08 de out.", "out. de 2026", "abr de 26") or on their own (axis labels).
 out=out.replace(new RegExp(`(\\d{1,2}\\.?\\s(?:de\\s)?)${mon}\\.?(?![\\p{L}])`,'giu'),(m,pre,w)=>pre+shortMonths[w.toLowerCase()]);
 out=out.replace(new RegExp(`(?<![\\p{L}])${mon}\\.?(?=\\s(?:de\\s)?\\d{2,4}\\b)`,'giu'),(m,w)=>shortMonths[w.toLowerCase()]);
 if(onlyToken)out=out.replace(new RegExp(`^${mon}\\.?$`,'iu'),(m,w)=>shortMonths[w.toLowerCase()]);
 out=out.replace(new RegExp(`(?<![\\p{L}])${mon}\\/(?=\\d{4})`,'giu'),(m,w)=>shortMonths[w.toLowerCase()]+'/');
 // Short weekdays only at the start of a date ("qui., 08") or on their own.
 out=out.replace(/^(seg|ter|qua|qui|sex|sáb|dom)\.?(?=,|\s\d)/iu,(m,w)=>shortDays[w.toLowerCase()]??m);
 if(onlyToken)out=out.replace(/^(seg|ter|qua|qui|sex|sáb|dom)\.?$/iu,(m,w)=>shortDays[w.toLowerCase()]??m);
 out=out.replace(/(\d{1,2}) de (?=[A-Z][a-z]+)/g,'$1 ').replace(/([A-Z][a-z]+\.?) de (?=\d{4})/g,'$1 ').replace(/ de (?=\d{4}\b)/g,' ').replace(/\b([A-Z][a-z]{2}) de (?=\d{2}\b)/g,'$1 ');
 out=out.replace(/(\d{1,2}):(\d{2}) às /g,'$1:$2 at ').replace(/\bàs (?=\d{1,2}:\d{2})/g,'at ');
 return out;
}
/** pt-BR numbers to en-GB: "1.240" → "1,240", "7,9" → "7.9". Amounts already in en-GB are untouched. */
export function englishNumbers(text:string){
 return text.replace(/(?<![\d.,])\d{1,3}(?:\.\d{3})+(?:,\d+)?(?![\d.,])|(?<![\d.,])\d+,\d+(?![\d.,])/g,m=>m.replace(/\./g,'§').replace(/,/g,'.').replace(/§/g,','));
}

export function createTranslator(dictionary:Record<string,string>){
 const {exact,patterns}=compile(dictionary);
 const phrase=(text:string):string|null=>{
  const hit=exact.get(text);if(hit!==undefined)return hit;
  for(const p of patterns){const m=text.match(p.re);if(m)return p.out.replace(/\{\{(\d)\}\}/g,(_,i)=>translateValue(m[Number(i)]??''));}
  return null;
 };
 // Values captured by templates (a type, an option) are translated on their own when known.
 const translateValue=(value:string):string=>exact.get(collapse(value))??(value.includes(' · ')?value.split(' · ').map(translateValue).join(' · '):patternOnly(collapse(value))??englishNumbers(englishDates(value)));
 const patternOnly=(text:string):string|null=>{for(const p of patterns){const m=text.match(p.re);if(m)return p.out.replace(/\{\{(\d)\}\}/g,(_,i)=>translateValue(m[Number(i)]??''));}return null;};
 const ptWords=new Set(['de','do','da','dos','das','e','em','no','na','nos','nas','para','pra','com','sem','há','por','que','ao','aos','um','uma','os','as','o','a','seu','sua','até','mais','menos','não','dia','dias','mês','ano','semana']);
 /** Reads left to right, taking the longest known phrase at each point, e.g. "Edit Café da manhã" or "Profundo: 37 min. Acordado: 10 min.". */
 const split=(text:string):string|null=>{
  const words=text.split(' ');if(words.length<2)return null;const out:string[]=[];let i=0,changed=false;
  while(i<words.length){let matched=false;
   for(let j=Math.min(words.length,i+10);j>i;j--){const part=words.slice(i,j).join(' ');const p=phrase(part);if(p!==null){out.push(p);if(p!==part)changed=true;i=j;matched=true;break;}}
   if(!matched){const w=words[i];if(/[ãõçáéíóúâêôà]/i.test(w)||ptWords.has(w.toLowerCase().replace(/[.,:;]$/,'')))return null;out.push(englishNumbers(englishDates(w)));i++;}
  }
  return changed?out.join(' '):null;
 };
 const translate=(raw:string):string=>{
  const text=collapse(raw);if(!text||!/\p{L}/u.test(text))return englishNumbers(raw);
  let out=phrase(text);
  if(out===null&&text.includes(' · '))out=text.split(' · ').map(part=>phrase(part)??englishNumbers(englishDates(part))).join(' · ');
  if(out===null){const colon=text.match(/^([^:]{2,40}): (.+)$/);if(colon){const label=phrase(colon[1]);if(label)out=`${label}: ${phrase(colon[2])??englishNumbers(englishDates(colon[2]))}`;}}
  if(out===null){const trailing=text.match(/^(.*?)([\s:]*[+↗→]?)$/);if(trailing&&trailing[1]!==text){const base=phrase(trailing[1]);if(base)out=base+trailing[2];}}
  if(out===null&&text.length<=240)out=split(text);
  if(out===null)out=englishNumbers(englishDates(text));
  if(out===text)return raw;
  const lead=raw.match(/^\s*/)![0],tail=raw.match(/\s*$/)![0];return lead+out+tail;
 };
 return translate;
}
