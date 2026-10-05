'use client';
import {useEffect,useRef,useState} from 'react';
import * as echarts from 'echarts/core';
import {LineChart,BarChart,HeatmapChart,ScatterChart} from 'echarts/charts';
import {GridComponent,TooltipComponent,MarkLineComponent,CalendarComponent,VisualMapComponent,DatasetComponent} from 'echarts/components';
import {SVGRenderer} from 'echarts/renderers';
import type {EChartsCoreOption} from 'echarts/core';

echarts.use([LineChart,BarChart,HeatmapChart,ScatterChart,GridComponent,TooltipComponent,MarkLineComponent,CalendarComponent,VisualMapComponent,DatasetComponent,SVGRenderer]);

/** Design-system colours resolved for the element the chart sits in (so page-level tokens and Dark Mode apply). */
export type ChartTheme={color:(token:string)=>string;label:string;label2:string;separator:string;surface:string;reduceMotion:boolean;
 axis:()=>Record<string,unknown>;tooltip:(extra?:Record<string,unknown>)=>Record<string,unknown>};

const font='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';
function resolver(host:HTMLElement){
 const probe=document.createElement('span');probe.style.display='none';host.appendChild(probe);const cache=new Map<string,string>();
 const color=(token:string)=>{if(cache.has(token))return cache.get(token)!;probe.style.color=token.startsWith('--')?`var(${token})`:token;const value=getComputedStyle(probe).color;cache.set(token,value);return value;};
 return {color,done:()=>probe.remove()};
}
function theme(color:(token:string)=>string):ChartTheme{
 const t={label:color('--label'),label2:color('--label-2'),separator:color('--separator-soft'),surface:color('--bg-elevated'),border:color('--separator')};
 const reduceMotion=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 return {color,label:t.label,label2:t.label2,separator:t.separator,surface:t.surface,reduceMotion,
  axis:()=>({axisLine:{show:false},axisTick:{show:false},axisLabel:{color:t.label2,fontSize:12,fontFamily:font},splitLine:{lineStyle:{color:t.separator}}}),
  tooltip:(extra={})=>({trigger:'axis',backgroundColor:t.surface,borderColor:t.border,borderWidth:1,padding:[8,12],textStyle:{color:t.label,fontSize:13,fontFamily:font},extraCssText:'border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);',axisPointer:{type:'line',lineStyle:{color:t.border}},...extra})};
}

/**
 * ECharts with the site's look: SVG renderer, colours from CSS tokens, follows Dark Mode,
 * resizes with its container and skips animation when Reduce Motion is on.
 */
export function EChart({option,height=260,className,label}:{option:(t:ChartTheme)=>EChartsCoreOption;height?:number|string;className?:string;label:string}){
 const ref=useRef<HTMLDivElement>(null),chart=useRef<echarts.ECharts|null>(null);const [scheme,setScheme]=useState(0);
 useEffect(()=>{const el=ref.current;if(!el)return;const instance=echarts.init(el,undefined,{renderer:'svg'});chart.current=instance;
  const resize=new ResizeObserver(()=>instance.resize());resize.observe(el);
  const media=matchMedia('(prefers-color-scheme: dark)'),change=()=>setScheme(s=>s+1);media.addEventListener('change',change);
  const attr=new MutationObserver(change);attr.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-lang','class']});
  return()=>{resize.disconnect();media.removeEventListener('change',change);attr.disconnect();instance.dispose();chart.current=null;};},[]);
 useEffect(()=>{const el=ref.current;if(!el||!chart.current)return;const {color,done}=resolver(el);const t=theme(color);const value=option(t);done();chart.current.setOption({animation:!t.reduceMotion,animationDuration:400,textStyle:{fontFamily:font},...value},{notMerge:true});});
 return <div ref={ref} className={className} role="img" aria-label={label} style={{height,width:'100%'}} data-scheme={scheme}/>;
}

export type LineSpec={name:string;values:(number|null)[];color:string;area?:boolean;dashed?:boolean;dots?:boolean;width?:number;connectNulls?:boolean;smooth?:boolean};
/** Category line/area chart in the site's style; `color` is a CSS token or colour. */
export function lineOption(t:ChartTheme,{categories,series,min,max,interval,scale,format,axisFormat,labelFormat,titleFormat,grid}:{categories:string[];scale?:boolean;titleFormat?:(c:string)=>string;series:LineSpec[];min?:number;max?:number;interval?:number;format?:(v:number)=>string;axisFormat?:(v:number)=>string;labelFormat?:(c:string)=>string;grid?:Record<string,number>}):EChartsCoreOption{
 const fmt=format??((v:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v));
 return {
  grid:{left:8,right:12,top:12,bottom:4,containLabel:true,...grid},
  tooltip:t.tooltip({formatter:(params:unknown)=>tooltipHtml(t,params,v=>fmt(v),titleFormat??labelFormat)}),
  xAxis:{type:'category',data:categories,boundaryGap:false,...t.axis(),splitLine:{show:false},axisLabel:{...(t.axis().axisLabel as object),hideOverlap:true,margin:10,alignMinLabel:'left',alignMaxLabel:'right',...(labelFormat?{formatter:labelFormat}:{})}},
  yAxis:{type:'value',min,max,interval,scale,...t.axis(),axisLabel:{...(t.axis().axisLabel as object),formatter:axisFormat??fmt}},
  series:series.map(s=>{const c=t.color(s.color);return {type:'line',name:s.name,data:s.values,smooth:s.smooth??false,connectNulls:s.connectNulls??true,showSymbol:s.dots??s.values.length<=16,symbol:'circle',symbolSize:7,
   lineStyle:{color:c,width:s.width??2.5,type:s.dashed?[6,4]:'solid'},itemStyle:{color:c,borderColor:t.surface,borderWidth:2},emphasis:{focus:'series'},
   ...(s.area?{areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:c.replace('rgb(','rgba(').replace(')',',.26)')},{offset:1,color:c.replace('rgb(','rgba(').replace(')',',0)')}]}}}:{})};})
 };
}

export const escapeHtml=(text:string)=>text.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
/** Axis tooltip: formatted title, then one row per series that has a value. */
export function tooltipHtml(t:ChartTheme,params:unknown,format:(v:number)=>string,title?:(c:string)=>string){
 const list=(Array.isArray(params)?params:[params]) as {axisValue?:string;name?:string;seriesName:string;value:unknown;color:string}[];
 const head=String(list[0]?.axisValue??list[0]?.name??'');
 const rows=list.filter(p=>typeof p.value==='number').map(p=>`<div style="display:flex;align-items:center;gap:8px;justify-content:space-between"><span style="display:inline-flex;align-items:center;gap:6px;color:${t.label2}"><i style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></i>${escapeHtml(p.seriesName)}</span><b style="font-weight:600;color:${t.label}">${escapeHtml(format(p.value as number))}</b></div>`).join('');
 return `<div style="font-weight:600;margin-bottom:4px;color:${t.label}">${escapeHtml(title?title(head):head)}</div>${rows||`<div style="color:${t.label2}">Sem dados</div>`}`;
}
