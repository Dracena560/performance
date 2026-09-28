/** Display minutes as a duration, never as rounded decimal hours. */
export function formatSleepDuration(minutes:number|null|undefined):string {
  if(minutes==null||!Number.isFinite(minutes)||minutes<0)return '—';
  const total=Math.round(minutes);
  if(total<60)return `${total} min`;
  return `${Math.floor(total/60)}h${String(total%60).padStart(2,'0')}`;
}
