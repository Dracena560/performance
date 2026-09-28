import { redirect } from 'next/navigation';
import { healthService,healthUserId,supabase } from './supabase/server';
import { updateProfile } from './profile-store';
import { investmentsSchema } from './investments';
import { priceInPounds } from './investment-fx';
import { cleanPreferences } from './life';
export async function personalData(){
 const session=await supabase();const {data:{user}}=await session.auth.getUser();if(!user)redirect('/login');const db=healthUserId()?healthService():session;const userId=healthUserId()??user.id;
 const result=await db.from('health_profiles').select('profile').eq('user_id',userId).maybeSingle();if(result.error)throw new Error('Não foi possível carregar seus dados.');
 const profile=result.data?.profile??{};
 const parsed=investmentsSchema.safeParse(profile.personal_investments??[]);
 const upgrades=new Map<string,{before:string;after:any}>();
 if(parsed.success)await Promise.all(parsed.data.filter(s=>s.items.some(i=>!i.asset_type||(i.currency!=='GBP'&&!i.fx))).map(async snapshot=>{try{upgrades.set(snapshot.id,{before:JSON.stringify(snapshot),after:await priceInPounds(snapshot)});}catch{/* Keep original data visible with a missing-rate notice; retry on next visit. */}}));
 const clean=cleanPreferences(profile.personal_preferences??{});
 if(upgrades.size||JSON.stringify(clean)!==JSON.stringify(profile.personal_preferences??{}))return updateProfile(db,userId,current=>({...current,...(current.personal_preferences?{personal_preferences:cleanPreferences(current.personal_preferences)}:{}),...(upgrades.size?{personal_investments:(current.personal_investments??[]).map((snapshot:any)=>{const upgrade=upgrades.get(snapshot.id);const parsed=investmentsSchema.element.safeParse(snapshot);return upgrade&&parsed.success&&JSON.stringify(parsed.data)===upgrade.before?upgrade.after:snapshot;})}:{})}));
 return profile;
}
