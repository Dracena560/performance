import { z } from 'zod';
/** YYYY-MM-DD (a real calendar date) or an empty string. */
export const dateValue=z.string().refine(v=>v===''||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v),'Data inválida');
