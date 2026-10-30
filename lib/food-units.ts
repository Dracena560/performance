import { z } from 'zod';

/** Household measures (fatia, colher, unidade…) so a portion can be entered without knowing the grams. */
export type FoodUnit={label:string;plural:string;grams:number;custom?:boolean};
export const foodUnitSchema=z.object({label:z.string().trim().min(1).max(40),plural:z.string().trim().max(40).default(''),grams:z.number().positive().max(5000)});
/** Measures you set yourself, by food key (Configurações or Seus alimentos). They win over the defaults. */
export const foodUnitsSchema=z.record(z.string().max(300),z.array(foodUnitSchema).max(10));
export type FoodUnits=z.infer<typeof foodUnitsSchema>;
export const readFoodUnits=(value:unknown):FoodUnits=>{const parsed=foodUnitsSchema.safeParse(value??{});return parsed.success?parsed.data:{};};

const u=(label:string,plural:string,grams:number):FoodUnit=>({label,plural,grams});
const normalize=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
/** Typical weights (Brazilian/UK references); first match wins, so specific foods come before generic ones. */
const rules:[RegExp,FoodUnit[]][]=[
 [/ryvita|crispbread|bolacha|biscoit|cracker|torradinha/,[u('unidade','unidades',10)]],
 [/sourdough/,[u('fatia','fatias',40),u('fatia fina','fatias finas',25)]],
 [/\bpao\b|bread|toast|torrada|baguete|bisnaguinha/,[u('fatia','fatias',30),u('pão francês','pães franceses',50)]],
 [/\bovo|egg/,[u('ovo','ovos',50)]],
 [/banana/,[u('banana média','bananas médias',118),u('banana pequena','bananas pequenas',90)]],
 [/maca\b|apple/,[u('maçã média','maçãs médias',180)]],
 [/laranja|orange|tangerina/,[u('unidade','unidades',150)]],
 [/kiwi/,[u('unidade','unidades',75)]],
 [/blueberr|mirtilo|morango|strawberr|uva|grape|framboesa|raspberr/,[u('punhado','punhados',50),u('xícara','xícaras',150)]],
 [/azeite|olive oil|\boleo\b|\boil\b/,[u('colher de sopa','colheres de sopa',13),u('colher de chá','colheres de chá',4.5),u('fio','fios',5)]],
 [/manteiga|butter|requeijao|cream cheese|pasta de amendoim|peanut|\bmel\b|honey|geleia|\bjam\b|nutella/,[u('colher de sopa','colheres de sopa',15),u('colher de chá','colheres de chá',5),u('camada fina (no pão)','camadas finas',5)]],
 [/cottage|ricota|ricotta/,[u('colher de sopa','colheres de sopa',30),u('colher de chá cheia','colheres de chá cheias',15)]],
 [/skyr|iogurte|yogurt|yoghurt|kefir/,[u('pote','potes',150),u('colher de sopa','colheres de sopa',20)]],
 [/queijo|cheese|cheddar|mussarela|mozzarella|presunto|\bham\b|peito de peru|turkey/,[u('fatia','fatias',20)]],
 [/chocolate|cacau 8|85%|70%/,[u('quadradinho','quadradinhos',10)]],
 [/amendoa|almond|castanha|nuts|pistache|pistachio|amendoim|nozes|walnut/,[u('punhado','punhados',25),u('colher de sopa','colheres de sopa',10)]],
 [/aveia|oats|granola|cereal|corn flakes|cornflakes|muesli/,[u('colher de sopa','colheres de sopa',10),u('tigela','tigelas',40)]],
 [/barra|\bbar\b|nature valley/,[u('barra','barras',21)]],
 [/arroz|rice|quinoa|feijao|beans|lentilha|lentil|grao de bico|chickpea|macarrao|pasta\b|cuscuz|couscous/,[u('colher de servir','colheres de servir',45),u('xícara','xícaras',160)]],
 [/batata|potato|mandioca|cassava|inhame|abobora/,[u('unidade média','unidades médias',150),u('colher de servir','colheres de servir',50)]],
 [/brocolis|broccoli|couve-flor|cauliflower|cenoura|carrot|vagem|legumes|vegetables/,[u('xícara','xícaras',90),u('colher de servir','colheres de servir',40)]],
 [/salada|folha|alface|lettuce|rucula|rocket|spinach|espinafre/,[u('prato de sobremesa','pratos',40),u('xícara','xícaras',30)]],
 [/tomate|tomato/,[u('tomate médio','tomates médios',120),u('fatia','fatias',20)]],
 [/pepino|cucumber/,[u('fatia','fatias',7),u('pepino médio','pepinos médios',200)]],
 [/frango|chicken|carne|beef|bife|steak|costela|rib|porco|pork|peixe|fish|salmao|salmon|atum|tuna/,[u('porção (palma da mão)','porções',120),u('pedaço médio','pedaços médios',80)]],
 [/acucar|sugar|adocante/,[u('colher de chá','colheres de chá',5),u('colher de sopa','colheres de sopa',12)]],
 [/\bsal\b|salt|pimenta|pepper/,[u('pitada','pitadas',0.5)]],
 [/leite|milk|cafe|coffee|\bcha\b|\btea\b|suco|juice|cacau brew|bebida|drink|refrigerante|coke|cola/,[u('xícara (200 ml)','xícaras',200),u('copo (250 ml)','copos',250),u('caneca (300 ml)','canecas',300)]],
];

/** Measures for one food: yours first, then the typical ones, then its usual portion from your history. */
export function unitsFor(name:string,usualGrams:number|null,custom:FoodUnit[]=[]):FoodUnit[]{
 const text=normalize(name);
 const defaults=rules.find(([pattern])=>pattern.test(text))?.[1]??[];
 const list=[...custom.map(unit=>({...unit,plural:unit.plural||unit.label,custom:true})),...defaults.filter(d=>!custom.some(c=>normalize(c.label)===normalize(d.label)))];
 if(usualGrams&&usualGrams>0&&!list.some(unit=>Math.abs(unit.grams-usualGrams)<0.5))list.push(u('porção de costume','porções de costume',Math.round(usualGrams*10)/10));
 return list;
}

const fmt=(n:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n);
/** "2 fatias", "½ colher de sopa", "1 banana média". */
export function portionLabel(qty:number,unit:FoodUnit){
 const amount=qty===0.5?'½':qty===0.25?'¼':qty===1.5?'1½':fmt(qty);
 return `${amount} ${qty>1?unit.plural:unit.label}`;
}
/** Short reference shown next to a food: "1 fatia ≈ 40 g · 1 fatia fina ≈ 25 g". */
export const unitReference=(units:FoodUnit[])=>units.map(unit=>`1 ${unit.label} ≈ ${fmt(unit.grams)} g`).join(' · ');
