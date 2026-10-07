/** Tiny trend line for cards: inline SVG (no chart library), colour by direction, last point marked. */
export function Sparkline({values,label,className=''}:{values:number[];label:string;className?:string}){
 const w=120,h=48,pad=4;
 if(!values.length)return null;
 const min=Math.min(...values),max=Math.max(...values),span=max-min||1;
 const pts=values.map((v,i)=>[values.length===1?w-pad:pad+i*(w-2*pad)/(values.length-1),values.length===1||max===min?h/2:pad+(1-(v-min)/span)*(h-2*pad)] as const);
 const line=values.length===1?`M${pad},${h/2} L${w-pad},${h/2}`:pts.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
 const area=`${line} L${pts.at(-1)![0].toFixed(1)},${h} L${values.length===1?pad:pts[0][0].toFixed(1)},${h} Z`;
 const dir=values.length<2||values.at(-1)===values[0]?'flat':values.at(-1)!>values[0]?'up':'down';
 const id=`spark-${Math.abs(label.split('').reduce((a,c)=>a*31+c.charCodeAt(0)|0,7))}`;
 const [lx,ly]=pts.at(-1)!;
 return <svg className={`sparkline ${dir} ${className}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={label}>
  <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".28"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
  <path d={area} fill={`url(#${id})`} stroke="none"/>
  <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
  <path d={`M${lx.toFixed(1)},${ly.toFixed(1)} l0,0`} stroke="currentColor" strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
 </svg>;
}
