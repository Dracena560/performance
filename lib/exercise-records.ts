import { z } from 'zod';
export const workoutCategories=['activity','workout','tennis'] as const;
export const isWorkout=(row:{category:string})=>workoutCategories.some(c=>c===row.category);
export const isTennis=(row:{category:string;payload:Record<string,unknown>})=>row.category==='tennis'||/^(tennis|tênis|tenis)$/i.test(String(row.payload.activity_type??row.payload.workout_type??row.payload.sport??''));
const positive=z.number().finite().nonnegative();
export const exercisePayloadSchema=z.object({
 kind:z.enum(['workout','daily_metrics']).optional(),record_id:z.string().uuid().optional(),activity_type:z.string().optional(),
 duration_seconds:positive.optional(),duration_minutes:positive.nullable().optional(),active_calories:positive.optional(),total_calories:positive.optional(),steps:positive.int().optional(),distance_km:positive.optional(),
 started_at:z.string().datetime({offset:true}).optional(),ended_at:z.string().datetime({offset:true}).optional(),snapshot_at:z.string().datetime({offset:true}).optional(),
 heart_rate_average:positive.optional(),watch_effort:z.number().min(0).max(10).optional(),watch_effort_label:z.string().optional(),
 heart_rate_zones:z.array(z.object({zone:z.number().int().min(1).max(5),duration_seconds:positive,min_bpm:positive.optional(),max_bpm:positive.optional(),max_bpm_exclusive:positive.optional()}).passthrough()).optional(),
 post_workout_heart_rate:z.array(z.object({elapsed_minutes:positive,bpm:positive}).passthrough()).optional(),
 weather:z.object({temperature_c:z.number().finite().optional(),humidity_percent:z.number().min(0).max(100).optional(),air_quality_index:positive.optional()}).passthrough().optional(),
 stand_hours:positive.optional(),exercise_minutes:positive.optional()
}).passthrough();
export function exerciseCategory(payload:Record<string,unknown>,tennis=false){return payload.kind==='daily_metrics'?'daily_metrics':tennis||isTennis({category:'',payload})?'tennis':'workout';}
export function secondsDuration(seconds:unknown){if(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0)return '—';const n=Math.round(seconds);return `${Math.floor(n/3600)?Math.floor(n/3600)+'h ':''}${String(Math.floor(n%3600/60)).padStart(2,'0')}min ${String(n%60).padStart(2,'0')}s`;}
