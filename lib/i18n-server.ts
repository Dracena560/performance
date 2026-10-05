import { cookies } from 'next/headers';
import { LANG_COOKIE,readLang,translate,type Lang,type MessageKey } from './i18n';
export async function getLang():Promise<Lang>{return readLang((await cookies()).get(LANG_COOKIE)?.value);}
export async function getT(){const lang=await getLang();return {lang,t:(key:MessageKey,vars?:Record<string,string|number>)=>translate(lang,key,vars)};}
