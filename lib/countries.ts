const excluded=new Set(['EU','EZ','UN','QO','XA','XB','ZZ']);
/** ISO 3166-1 alpha-2 countries with names in the given locale, sorted by name. */
export function countryOptions(locale:string){
 const names=new Intl.DisplayNames([locale],{type:'region',fallback:'none'});const out:{code:string;name:string}[]=[];
 for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){const code=String.fromCharCode(a,b);if(excluded.has(code))continue;let name:string|undefined;try{name=names.of(code);}catch{name=undefined;}if(name&&name!==code)out.push({code,name});}
 return out.sort((x,y)=>x.name.localeCompare(y.name,locale));
}
export function countryName(code:string,locale:string){if(!/^[A-Z]{2}$/.test(code))return '';try{return new Intl.DisplayNames([locale],{type:'region'}).of(code)??code;}catch{return code;}}
