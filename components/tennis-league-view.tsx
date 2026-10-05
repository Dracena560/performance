'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {CalendarDays,Check,Copy,Settings2,Share2,Trophy,Users} from 'lucide-react';
import {useLang} from './i18n';
import {countryName} from '@/lib/countries';
import {flag,seasonStatus,standings,type LeaguePlayer,type LeagueSeason,type TennisLeague} from '@/lib/tennis-league';
import {initials} from '@/lib/tennis-stats';

const sortedSeasons=(league:TennisLeague)=>[...league.seasons].sort((a,b)=>b.start.localeCompare(a.start));
const monthRange=(s:LeagueSeason,locale:string)=>{const m=(d:string)=>new Date(d+'T12:00:00Z').toLocaleDateString(locale,{month:'long',timeZone:'UTC'});const cap=(x:string)=>x.charAt(0).toUpperCase()+x.slice(1);return `${cap(m(s.start))}–${cap(m(s.end))} ${s.end.slice(0,4)}`;};
/** Seasons named automatically (e.g. "Outubro–Dezembro 2026") follow the chosen language; custom names are kept. */
export const seasonLabel=(s:LeagueSeason,locale:string)=>s.name===monthRange(s,'pt-BR')?monthRange(s,locale):s.name;

export function PlayerPhoto({player,size=40}:{player:LeaguePlayer|undefined;size?:number}){
 const style={width:size,height:size};
 return <span className={`lg-photo${player?.me?' me':''}`} style={style} aria-hidden="true">{player?.photo?<img src={player.photo} alt="" loading="lazy"/>:<span style={{fontSize:Math.round(size*0.36)}}>{initials(player?.name)}</span>}{player?.country&&<i className="lg-flag" style={{fontSize:Math.max(12,Math.round(size*0.34))}}>{flag(player.country)}</i>}</span>;
}

/** Season page shared by the public link and the private league screen. */
export function LeagueView({league,today,initialSeason,publicMode=false,manageHref}:{league:TennisLeague;today:string;initialSeason?:string|null;publicMode?:boolean;manageHref?:string}){
 const {t,locale}=useLang();const seasons=sortedSeasons(league);
 const [seasonId,setSeasonId]=useState(()=>seasons.find(s=>s.id===initialSeason)?.id??(seasons.find(s=>s.start<=today&&s.end>=today)??seasons.find(s=>s.start<=today)??seasons[0])?.id);
 const [copied,setCopied]=useState(false),[allResults,setAllResults]=useState(false),[allPending,setAllPending]=useState(false);
 useEffect(()=>{if(!seasonId)return;const url=new URL(window.location.href);url.searchParams.set('season',seasonId);window.history.replaceState(null,'',url);},[seasonId]);
 const season=seasons.find(s=>s.id===seasonId);
 if(!season)return <section className="panel lg-empty"><Trophy/><p>{t('league.empty')}</p></section>;
 const players=new Map(league.players.map(p=>[p.id,p]));const table=standings(league,season);const status=seasonStatus(season,today);
 const me=league.players.find(p=>p.me&&season.players.includes(p.id));
 const myPending=me?status.pending.filter(pair=>pair.includes(me.id)).map(pair=>players.get(pair[0]===me.id?pair[1]:pair[0])!):[];
 const date=(d:string,o:Intl.DateTimeFormatOptions={day:'2-digit',month:'short',year:'numeric'})=>new Date(d+'T12:00:00Z').toLocaleDateString(locale,{timeZone:'UTC',...o});
 const stateLabel=(s:LeagueSeason)=>{const st=seasonStatus(s,today).state;return st==='live'?t('league.live'):st==='finished'?t('league.past'):t('league.upcoming');};
 const share=async()=>{const url=window.location.href;try{if(navigator.share){await navigator.share({title:`${league.title} · ${seasonLabel(season,locale)}`,url});return;}}catch{/* fall back to copy */}try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{/* clipboard blocked */}};
 const cell=(row:string,col:string)=>{const m=season.matches.find(m=>(m.home===row&&m.away===col)||(m.home===col&&m.away===row));if(!m)return null;const mine=m.home===row?m.homeSets:m.awaySets,theirs=m.home===row?m.awaySets:m.homeSets;return {mine,theirs,won:mine>theirs};};
 const leader=table[0];
 return <div className="league wimbledon">
  <header className="lg-hero">
   <div className="lg-hero-top">
    <span className="lg-chip">{[season.division,stateLabel(season)].filter(Boolean).join(' · ')}</span>
    <span className="lg-hero-actions">
     <button className="button wb-glass" onClick={share}>{copied?<Check size={16}/>:publicMode?<Share2 size={16}/>:<Copy size={16}/>}{copied?t('league.copied'):t('league.share')}</button>
     {manageHref&&<Link className="button wb-glass" href={manageHref}><Settings2 size={16}/>{t('league.manage')}</Link>}
    </span>
   </div>
   <div className="lg-hero-main">
    <span className="lg-kicker">{t('league.eyebrow')} · {league.title}</span>
    <h1>{seasonLabel(season,locale)}</h1>
    <p>{date(season.start,{day:'2-digit',month:'short'})} – {date(season.end)}{season.league?` · ${season.league}`:''}</p>
   </div>
   <div className="lg-progress" aria-label={t('league.progress')}>
    <div><b>{t('league.matchesPlayed',{played:status.played,total:status.total})}</b><span>{status.state==='live'?t('league.daysLeft',{days:status.daysLeft}):status.state==='finished'?t('league.ended',{date:date(season.end)}):t('league.startsIn',{date:date(season.start)})}</span></div>
    <i><em style={{width:`${status.percent}%`}}/></i>
   </div>
  </header>

  {seasons.length>1&&<nav className="lg-seasons" aria-label={t('league.seasons')}>{seasons.map(s=><button key={s.id} aria-pressed={s.id===season.id} onClick={()=>setSeasonId(s.id)}><strong>{seasonLabel(s,locale)}</strong><small>{s.division?`${s.division} · `:''}{stateLabel(s)}</small></button>)}</nav>}

  <div className="lg-grid">
   <section className="panel lg-status" aria-labelledby="lg-status-title">
    <span className="eyebrow">{t('league.status')}</span>
    <h2 id="lg-status-title" className="sr-only">{t('league.status')}</h2>
    <div className="lg-status-figures">
     <div><b>{status.percent}%</b><small>{t('league.progress')}</small></div>
     <div><b>{status.state==='finished'?status.played:status.daysLeft}</b><small>{status.state==='finished'?t('league.results'):t('league.daysLeft',{days:''}).trim()}</small></div>
     <div><b>{status.pending.length}</b><small>{t('league.pending')}</small></div>
    </div>
    {leader&&leader.played>0&&<div className="lg-leader"><PlayerPhoto player={leader.player} size={44}/><div><small>{status.state==='finished'?t('league.champion'):t('league.leader')}</small><strong>{leader.player.name}</strong><span>{leader.won}{t('league.won')} · {leader.lost}{t('league.lost')} · {leader.points} {t('league.points')}</span></div><Trophy aria-hidden/></div>}
    {me&&status.state!=='finished'&&<div className="lg-mine"><small>{t('league.yourPending')}</small>{myPending.length?<ul>{myPending.map(p=><li key={p.id}><PlayerPhoto player={p} size={28}/>{p.name}</li>)}</ul>:<p>{t('league.pendingNone')}</p>}</div>}
   </section>

   <section className="panel lg-table" aria-labelledby="lg-table-title">
    <div className="panel-heading"><h2 id="lg-table-title">{t('league.standings')}</h2><span className="eyebrow">{season.division}</span></div>
    <div className="personal-table-scroll"><table>
     <thead><tr><th scope="col">{t('league.pos')}</th><th scope="col">{t('league.player')}</th><th scope="col">{t('league.played')}</th><th scope="col">{t('league.won')}</th><th scope="col">{t('league.lost')}</th><th scope="col">{t('league.sets')}</th><th scope="col">{t('league.points')}</th><th scope="col" className="lg-form-col">{t('league.form')}</th></tr></thead>
     <tbody>{table.map(r=><tr key={r.player.id} className={r.player.me?'me':''}>
      <td><span className={`lg-pos p${r.position}`}>{r.position}</span></td>
      <th scope="row"><span className="lg-name"><PlayerPhoto player={r.player} size={30}/><span>{r.player.name}</span></span></th>
      <td>{r.played}</td><td><b>{r.won}</b></td><td>{r.lost}</td><td>{r.setsWon}–{r.setsLost}</td><td><b>{r.points}</b></td>
      <td className="lg-form-col"><span className="lg-form">{r.form.map((f,i)=><i key={i} className={f==='V'?'win':'loss'}>{f==='V'?t('league.won'):t('league.lost')}</i>)}</span></td>
     </tr>)}</tbody>
    </table></div>
    <p className="field-help">{t('league.pointsRule')}</p>
   </section>
  </div>

  <section className="panel lg-box" aria-labelledby="lg-box-title">
   <div className="panel-heading"><div><h2 id="lg-box-title">{t('league.box')}</h2><p className="field-help">{t('league.boxHint')}</p></div></div>
   <div className="personal-table-scroll"><table>
    <thead><tr><th scope="col"><span className="sr-only">{t('league.player')}</span></th>{season.players.map((id,i)=><th scope="col" key={id} title={players.get(id)?.name}><span className="lg-letter">{String.fromCharCode(65+i)}</span><PlayerPhoto player={players.get(id)} size={26}/></th>)}</tr></thead>
    <tbody>{season.players.map((row,ri)=><tr key={row} className={players.get(row)?.me?'me':''}>
     <th scope="row"><span className="lg-name"><span className="lg-letter">{String.fromCharCode(65+ri)}</span><span>{players.get(row)?.name}</span></span></th>
     {season.players.map(col=>{if(col===row)return <td key={col} className="self" aria-hidden/>;const c=cell(row,col);return <td key={col} className={c?c.won?'win':'loss':''}>{c?`${c.mine}–${c.theirs}`:''}</td>;})}
    </tr>)}</tbody>
   </table></div>
  </section>

  <div className="lg-grid">
   <section className="panel lg-results" aria-labelledby="lg-results-title">
    <div className="panel-heading"><h2 id="lg-results-title">{t('league.results')}</h2><span className="badge">{season.matches.length}</span></div>
    {season.matches.length?<ol>{[...season.matches].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,allResults?undefined:12).map(m=>{const h=players.get(m.home),a=players.get(m.away),homeWon=m.homeSets>m.awaySets;return <li key={m.id}>
     <span className={homeWon?'won':''}><PlayerPhoto player={h} size={28}/>{h?.name}</span>
     <b>{m.homeSets}–{m.awaySets}</b>
     <span className={!homeWon?'won':''}>{a?.name}<PlayerPhoto player={a} size={28}/></span>
     {(m.date||m.score)&&<small>{[m.date&&date(m.date,{day:'2-digit',month:'short'}),m.score].filter(Boolean).join(' · ')}</small>}
    </li>;})}</ol>:<p className="field-help">{t('league.noResults')}</p>}
    {season.matches.length>12&&<button className="button secondary lg-more" onClick={()=>setAllResults(v=>!v)}>{allResults?t('league.showLess'):t('league.showAll',{count:season.matches.length})}</button>}
   </section>
   <section className="panel lg-pending" aria-labelledby="lg-pending-title">
    <div className="panel-heading"><h2 id="lg-pending-title">{t('league.pending')}</h2><span className="badge">{status.pending.length}</span></div>
    {status.pending.length?<ul>{status.pending.slice(0,allPending?undefined:10).map(([x,y])=><li key={x+y}><span><PlayerPhoto player={players.get(x)} size={24}/>{players.get(x)?.name}</span><em>{t('league.vs')}</em><span>{players.get(y)?.name}<PlayerPhoto player={players.get(y)} size={24}/></span></li>)}</ul>:<p className="field-help">{t('league.pendingNone')}</p>}
    {status.pending.length>10&&<button className="button secondary lg-more" onClick={()=>setAllPending(v=>!v)}>{allPending?t('league.showLess'):t('league.showAll',{count:status.pending.length})}</button>}
   </section>
  </div>

  <section className="lg-section" aria-labelledby="lg-players-title">
   <header className="wb-section-heading"><div><span className="eyebrow"><Users size={14}/> {season.players.length}</span><h2 id="lg-players-title">{t('league.players')}</h2></div></header>
   <div className="lg-players">{table.map(r=>{const p=r.player;const facts:[string,string][]=([[t('league.country'),p.country?`${flag(p.country)} ${countryName(p.country,locale)}`:''],[t('league.hand'),p.hand?t(`hand.${p.hand}` as never):''],[t('league.backhand'),p.backhand?t(`backhand.${p.backhand}` as never):''],[t('league.racket'),p.racket],[t('league.strings'),p.strings],[t('league.level'),p.level],[t('league.favouriteShot'),p.favouriteShot],[t('league.favouritePlayer'),p.favouritePlayer],[t('league.since'),p.since],[t('league.sex'),p.sex]] as [string,string][]).filter(([,v])=>v);
    return <article key={p.id} className={`panel lg-player${p.me?' me':''}`}>
     <header><PlayerPhoto player={p} size={64}/><div><h3>{p.name}</h3>{p.nickname&&<small>“{p.nickname}”</small>}<span className="lg-player-record">#{r.position} · {r.won}{t('league.won')}–{r.lost}{t('league.lost')}</span></div></header>
     {facts.length>0&&<dl>{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
     {p.notes&&<p className="field-help">{p.notes}</p>}
    </article>;})}</div>
  </section>

  {season.images.length>0&&<section className="lg-section" aria-labelledby="lg-images-title">
   <header className="wb-section-heading"><div><span className="eyebrow"><CalendarDays size={14}/> {seasonLabel(season,locale)}</span><h2 id="lg-images-title">{t('league.images')}</h2></div></header>
   <div className="lg-images">{season.images.map(img=><figure key={img.id} className="panel"><a href={img.url} target="_blank" rel="noreferrer"><img src={img.url} alt={img.caption||season.name} loading="lazy"/></a>{(img.caption||img.date)&&<figcaption>{img.caption}{img.date?` · ${date(img.date)}`:''}</figcaption>}</figure>)}</div>
  </section>}
  {season.notes&&!publicMode&&<p className="field-help lg-notes">{t('league.notes')}: {season.notes}</p>}
  {publicMode&&<p className="field-help lg-notes">{t('league.publicNote')}</p>}
 </div>;
}
