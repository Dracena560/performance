import * as XLSX from 'xlsx';

const categories: Record<string, string> = {
  'Health_Diário': 'daily_metrics', 'Health_Treinos': 'workout', 'Refeições': 'meal_history', 'Hidratação': 'hydration_history',
  'Check-ins': 'checkin_history', 'Check-ins_Detalhados': 'checkin_history', 'Sono': 'sleep', 'Atividade': 'activity',
  'Fezes': 'bowel', 'Suplementos': 'supplement', 'Tênis_Desempenho': 'tennis', 'Tênis_Checkins': 'tennis',
  'Agenda_Tênis': 'schedule', 'Métricas_Corporais': 'body_metrics', 'Bioimpedância': 'body_metrics',
};

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') { const match = value.match(/^\d{4}-\d{2}-\d{2}/); if (match) return match[0]; }
  return null;
}

function clean(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value.trim() || null;
  return value;
}

export function readHealthWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const records: Array<{ category: string; recorded_on: string; recorded_at: string | null; payload: Record<string, unknown>; source: string }> = [];
  for (const sheetName of workbook.SheetNames) {
    const category = categories[sheetName]; if (!category) continue;
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true }) as unknown[][];
    const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell ?? '').trim() === 'Data'));
    if (headerIndex < 0) continue;
    const headers = rows[headerIndex].map((header) => String(header ?? '').trim());
    for (const row of rows.slice(headerIndex + 1)) {
      const date = dateValue(row[0]); if (!date) continue;
      const payload = Object.fromEntries(headers.map((header, index) => [header || `campo_${index + 1}`, clean(row[index])]).filter(([, value]) => value !== null));
      if (Object.keys(payload).length <= 1) continue;
      records.push({ category, recorded_on: date, recorded_at: `${date}T12:00:00.000Z`, payload, source: `Planilha Felipe Saúde · ${sheetName}` });
    }
  }
  return records;
}
