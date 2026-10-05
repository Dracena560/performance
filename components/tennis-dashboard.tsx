"use client";
import { WorkoutDetails } from "./workout-details";
import { TennisSessionEditor } from "./tennis-session-editor";
import { TennisClub } from "./tennis-club";
import { HealthJournal } from "./health-journal";
import { localDate } from "@/lib/domain";
import {
  matchGroup,
  type TennisProfile,
  type Appointment,
} from "@/lib/tennis-club";
import {
  getExplicitTennisScore,
  getExplicitTennisSets,
  getTennisOutcome,
  isCompetitiveTennisMatch,
  normalizeTennisSessionType,
  type TennisSet,
} from "@/lib/tennis-session";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  Pencil,
  Activity,
  CalendarDays,
  MapPin,
  Medal,
  Plus,
  Sparkles,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import {
  seasonRecord,
  headToHead,
  honours,
  leaguePath,
  initials,
} from "@/lib/tennis-stats";
import { updateTennisScore } from "@/app/actions";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
type RecordRow = {
  id: string;
  recorded_on: string;
  recorded_at: string | null;
  payload: Record<string, unknown>;
  source: string;
};
const number = (p: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v)))
      return Number(v);
  }
  return null;
};
const text = (p: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
};
const avg = (x: (number | null)[]) => {
  const v = x.filter((n): n is number => n !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const formatNumber = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
        value,
      );
const flatten = (value: unknown, prefix = ""): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value as Record<string, unknown>).reduce(
        (all, [name, item]) => ({
          ...all,
          ...flatten(item, prefix ? `${prefix} · ${name}` : name),
        }),
        {} as Record<string, unknown>,
      )
    : prefix
      ? { [prefix]: value }
      : {};
function ScoreEditor({ id, initial }: { id: string; initial: TennisSet[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [sets, setSets] = useState<TennisSet[]>(
    initial.length
      ? initial
      : [
          { felipe: 0, adversario: 0 },
          { felipe: 0, adversario: 0 },
        ],
  );
  const change = (index: number, key: keyof TennisSet, value: string) =>
    setSets((current) =>
      current.map((set, i) =>
        i === index ? { ...set, [key]: value === "" ? 0 : Number(value) } : set,
      ),
    );
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await updateTennisScore(id, sets);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="score-editor">
      <button
        type="button"
        className="text-link"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Fechar placar" : "Adicionar/editar placar"}
      </button>
      {open && (
        <div className="scoreboard-entry">
          <h3>Sets da partida</h3>
          {sets.map((set, index) => (
            <div className="set-row" key={index}>
              <span>Set {index + 1}</span>
              <label>
                Felipe
                <input
                  value={set.felipe}
                  onChange={(event) =>
                    change(index, "felipe", event.target.value)
                  }
                  type="number"
                  min="0"
                  max="99"
                />
              </label>
              <label>
                Adversário
                <input
                  value={set.adversario}
                  onChange={(event) =>
                    change(index, "adversario", event.target.value)
                  }
                  type="number"
                  min="0"
                  max="99"
                />
              </label>
            </div>
          ))}
          {sets.length < 5 && (
            <button
              type="button"
              className="text-link"
              onClick={() =>
                setSets((current) => [...current, { felipe: 0, adversario: 0 }])
              }
            >
              + Adicionar set
            </button>
          )}
          <button
            type="button"
            className="button tinted"
            disabled={busy}
            onClick={save}
          >
            {busy ? "Salvando…" : "Salvar placar"}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}
function TennisDetails({
  session,
  onClose,
}: {
  session: {
    record: RecordRow;
    type: string | null;
    opponent: string | null;
    score: string | null;
    outcome: string | null;
    duration: number | null;
    energy: number | null;
    clarity: number | null;
    performance: number | null;
    analysis: string | null;
    postScore: number | null;
    sets: TennisSet[];
    competitive: boolean;
  };
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="dialog-content tennis-details-dialog">
        <DialogTitle>Detalhes da sessão</DialogTitle>
        <DialogDescription>
          Check-in e informações registradas nesta sessão.
        </DialogDescription>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">TÊNIS</span>
            <h2>
              {session.type ?? "Sessão de tênis"}
              {session.opponent ? ` · ${session.opponent}` : ""}
            </h2>
          </div>
          <button className="text-link" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="tennis-detail-summary">
          {session.competitive && (
            <>
              <article>
                <small>Resultado</small>
                <strong>{session.outcome ?? "Sem resultado"}</strong>
              </article>
              {session.score && (
                <article>
                  <small>Placar</small>
                  <strong>{session.score}</strong>
                </article>
              )}
            </>
          )}
          <article>
            <small>Nota pós-jogo</small>
            <strong>
              {formatNumber(session.postScore)}
              <em>/10</em>
            </strong>
          </article>
          <article>
            <small>Duração</small>
            <strong>
              {session.duration === null
                ? "—"
                : `${formatNumber(session.duration)} min`}
            </strong>
          </article>
        </div>
        <section className="tennis-detail-section">
          <h3>Check-in pós-jogo</h3>
          <div className="tennis-detail-summary">
            <article>
              <small>Energia física</small>
              <strong>
                {formatNumber(session.energy)}
                <em>/10</em>
              </strong>
            </article>
            <article>
              <small>Clareza mental</small>
              <strong>
                {formatNumber(session.clarity)}
                <em>/10</em>
              </strong>
            </article>
            <article>
              <small>Desempenho</small>
              <strong>
                {formatNumber(session.performance)}
                <em>/10</em>
              </strong>
            </article>
          </div>
        </section>
        {session.analysis && (
          <section className="tennis-detail-section">
            <h3>Análise e observações</h3>
            <p>{session.analysis}</p>
          </section>
        )}
        {session.competitive && (
          <ScoreEditor id={session.record.id} initial={session.sets} />
        )}
        <TennisSessionEditor
          id={session.record.id}
          type={session.type}
          opponent={session.opponent}
          duration={session.duration}
          analysis={session.analysis}
          onSaved={onClose}
        />
        <WorkoutDetails payload={session.record.payload} />
      </DialogContent>
    </Dialog>
  );
}
type Session = {
  record: RecordRow;
  type: string | null;
  opponent: string | null;
  score: string | null;
  outcome: string | null;
  duration: number | null;
  energy: number | null;
  clarity: number | null;
  performance: number | null;
  analysis: string | null;
  postScore: number | null;
  sets: TennisSet[];
  competitive: boolean;
};
const dayDiff = (from: string, to: string) =>
  Math.round(
    (Date.parse(to + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) /
      86400000,
  );
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(date + "T12:00:00Z").toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    ...options,
  });
const countdown = (today: string, date: string) => {
  const days = dayDiff(today, date);
  return days === 0 ? "Hoje" : days === 1 ? "Amanhã" : `Em ${days} dias`;
};
const minutesLabel = (minutes: number) => {
  const total = Math.round(minutes),
    hours = Math.floor(total / 60),
    rest = total % 60;
  return hours ? (rest ? `${hours} h ${rest} min` : `${hours} h`) : `${rest} min`;
};

/** Mown-lawn court seen from the umpire's chair: stripes, tramlines and the net. */
function GrassCourt() {
  return (
    <svg
      className="wb-grass"
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {Array.from({ length: 10 }, (_, i) => (
        <rect
          key={i}
          x={i * 40}
          y="0"
          width="40"
          height="220"
          className={i % 2 ? "stripe-dark" : "stripe-light"}
        />
      ))}
      <g className="court-lines">
        <path d="M70 196 L130 30 H270 L330 196 Z" />
        <path d="M100 196 L148 30 M300 196 L252 30" />
        <path d="M118 80 H282 M88 160 H312 M200 80 V160" />
        <path d="M96 112 H304" className="net" />
      </g>
      <ellipse cx="200" cy="196" rx="70" ry="10" className="worn" />
    </svg>
  );
}

function Avatar({ name, tone }: { name: string | null; tone: "me" | "them" }) {
  return (
    <span className={`wb-avatar ${tone}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/** Two-row tennis scoreboard: player names, one column per set, winner emphasised. */
function SetScore({
  me,
  opponent,
  sets,
  outcome,
  variant,
}: {
  me: string;
  opponent: string | null;
  sets: TennisSet[];
  outcome: string | null;
  variant: "board" | "card";
}) {
  const rows = [
    {
      name: me,
      tone: "me" as const,
      won: outcome === "vitória",
      games: sets.map((s) => [s.felipe, s.adversario]),
    },
    {
      name: opponent || "Adversário",
      tone: "them" as const,
      won: outcome === "derrota",
      games: sets.map((s) => [s.adversario, s.felipe]),
    },
  ];
  return (
    <table className={`wb-score ${variant}`}>
      <caption className="sr-only">
        Placar por set: {rows[0].name} contra {rows[1].name}
      </caption>
      <thead>
        <tr>
          <th scope="col">
            <span className="sr-only">Jogador</span>
          </th>
          {sets.map((_, i) => (
            <th scope="col" key={i}>
              <span aria-hidden="true">{i + 1}</span>
              <span className="sr-only">Set {i + 1}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.tone} className={row.won ? "winner" : ""}>
            <th scope="row">
              {variant === "card" && <Avatar name={row.name} tone={row.tone} />}
              <span className="wb-score-name">{row.name}</span>
              {row.won && (
                <span className="wb-win-mark" aria-label="vencedor">
                  ◂
                </span>
              )}
            </th>
            {row.games.map(([mine, theirs], i) => (
              <td key={i} className={mine > theirs ? "set-won" : ""}>
                {mine}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MatchHero({
  next,
  last,
  me,
  today,
  record,
  rivals,
  onAgenda,
  onDetails,
}: {
  next: Appointment | undefined;
  last: Session | undefined;
  me: string;
  today: string;
  record: ReturnType<typeof seasonRecord>;
  rivals: ReturnType<typeof headToHead>;
  onAgenda: () => void;
  onDetails: (session: Session) => void;
}) {
  const versus = (name: string | null) =>
    rivals.find((r) => r.opponent.toLowerCase() === name?.trim().toLowerCase());
  if (next) {
    const h2h = versus(next.opponent);
    const training = matchGroup(next.type) === "training";
    return (
      <section className="wb-hero" aria-labelledby="wb-hero-title">
        <GrassCourt />
        <div className="wb-hero-top">
          <span className="wb-chip">{next.type}</span>
          <span className="wb-live">
            <i aria-hidden="true" />
            {countdown(today, next.date)}
          </span>
        </div>
        <h2 id="wb-hero-title" className="sr-only">
          Próxima partida
        </h2>
        <div className="wb-hero-players">
          <div className="wb-hero-player">
            <Avatar name={me} tone="me" />
            <strong>{me}</strong>
            <small>
              {record.played
                ? `${record.wins}V–${record.losses}D na temporada`
                : "Temporada começando"}
            </small>
          </div>
          <div className="wb-hero-center">
            <span className="wb-hero-kicker">
              {training ? "TREINO" : "PRÓXIMA PARTIDA"}
            </span>
            <strong>{next.time || "A definir"}</strong>
            <span>
              {dateLabel(next.date, {
                weekday: "short",
                day: "2-digit",
                month: "short",
              }).replace(/\./g, "")}
            </span>
          </div>
          <div className="wb-hero-player">
            <Avatar name={next.opponent || next.type} tone="them" />
            <strong>{next.opponent || (training ? "Sessão livre" : "A definir")}</strong>
            <small>
              {h2h
                ? `Confronto direto ${h2h.wins}–${h2h.losses}`
                : "Primeiro confronto registrado"}
            </small>
          </div>
        </div>
        <div className="wb-hero-foot">
          <span>
            <MapPin size={15} strokeWidth={2} aria-hidden="true" />
            {next.location || "Local a definir"}
          </span>
          <button className="button wb-glass" onClick={onAgenda}>
            <CalendarDays size={16} strokeWidth={2} aria-hidden="true" />
            Programação
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="wb-hero" aria-labelledby="wb-hero-title">
      <GrassCourt />
      <div className="wb-hero-top">
        <span className="wb-chip">{last?.type ?? "Quadra livre"}</span>
        {last && (
          <span className="wb-live final">
            FINAL · {dateLabel(last.record.recorded_on, { day: "2-digit", month: "short" }).replace(/\./g, "")}
          </span>
        )}
      </div>
      <h2 id="wb-hero-title" className="wb-hero-empty">
        {last
          ? `${me} ${last.outcome === "vitória" ? "venceu" : last.outcome === "derrota" ? "perdeu para" : "×"} ${last.opponent ?? "adversário"}`
          : "Nenhuma partida na programação"}
      </h2>
      {last && last.sets.length > 0 && (
        <div className="wb-hero-score">
          <SetScore me={me} opponent={last.opponent} sets={last.sets} outcome={last.outcome} variant="board" />
        </div>
      )}
      <div className="wb-hero-foot">
        <span>Adicione o próximo jogo ou envie o calendário pelo GPT.</span>
        <span className="wb-hero-actions">
          {last && (
            <button className="button wb-glass" onClick={() => onDetails(last)}>
              Detalhes
            </button>
          )}
          <button className="button wb-glass" onClick={onAgenda}>
            <CalendarDays size={16} strokeWidth={2} aria-hidden="true" />
            Programação
          </button>
        </span>
      </div>
    </section>
  );
}

export function TennisDashboard({
  records,
  profile,
}: {
  records: RecordRow[];
  profile: TennisProfile;
}) {
  const router = useRouter();
  const sessions: Session[] = records
    .filter((record) => record.recorded_on <= localDate())
    .map((record) => {
      const analysis = text(record.payload, [
        "analysis",
        "Contexto / observações",
        "Observações",
      ]);
      const sets = getExplicitTennisSets(record);
      const energy = number(record.payload, [
        "physical_energy",
        "Energia física",
        "Energia/disposição física",
      ]);
      const clarity = number(record.payload, ["clarity", "Clareza mental"]);
      const performance = number(record.payload, [
        "performance",
        "Performance geral",
        "Desempenho geral",
      ]);
      return {
        record,
        duration: number(record.payload, [
          "duration_minutes",
          "Duração min",
          "Duração (min)",
          "Min tênis",
        ]),
        energy,
        clarity,
        performance,
        postScore: avg([energy, clarity, performance]),
        type: normalizeTennisSessionType(record),
        opponent: text(record.payload, [
          "opponent_or_partner",
          "Adversário",
          "Parceiro",
        ]),
        score: getExplicitTennisScore(record),
        analysis,
        sets,
        outcome: getTennisOutcome(record),
        competitive: isCompetitiveTennisMatch(record),
      };
    })
    .sort((a, b) =>
      (a.record.recorded_on + (a.record.recorded_at ?? "")).localeCompare(
        b.record.recorded_on + (b.record.recorded_at ?? ""),
      ),
    );
  const [statFilter, setStatFilter] = useState<string | null>(null),
    [registering, setRegistering] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "training" | "league" | "friendly" | "doubles"
  >("all");
  const [selected, setSelected] = useState<Session | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const historySessions = sessions.filter(
    (session) =>
      historyFilter === "all" ||
      matchGroup(session.type ?? "") === historyFilter,
  );
  const chart = sessions.slice(-14).map((s) => ({
    date: dateLabel(s.record.recorded_on, { day: "2-digit", month: "short" }),
    energia: s.energy,
    clareza: s.clarity,
    desempenho: s.performance,
  }));
  const stats = sessions.map((s) => ({
    id: s.record.id,
    date: s.record.recorded_on,
    type: s.type,
    opponent: s.opponent,
    outcome: s.outcome,
    duration: s.duration,
    postScore: s.postScore,
    sets: s.sets,
    competitive: s.competitive,
  }));
  const record = seasonRecord(stats),
    rivals = headToHead(stats),
    board = honours(stats),
    path = leaguePath(stats);
  const byId = new Map(sessions.map((s) => [s.record.id, s]));
  const lastMatch = [...sessions]
    .reverse()
    .find((s) => s.competitive && (s.sets.length || s.outcome));
  const energy = avg(sessions.map((s) => s.energy)),
    clarity = avg(sessions.map((s) => s.clarity)),
    performance = avg(sessions.map((s) => s.performance));
  const insight = !sessions.length
    ? "Registre pré e pós-tênis para começar a identificar padrões entre carga, estado mental e desempenho."
    : record.played && record.wins < record.losses
      ? "Os resultados registrados ainda têm mais derrotas que vitórias. Compare os jogos por energia, clareza, sono e carga da semana antes de mudar a preparação."
      : clarity !== null && energy !== null && clarity < energy
        ? "A clareza média está abaixo da energia física. Compare sono, refeição pré-jogo e carga mental antes de atribuir uma causa."
        : "Use pré e pós-jogo com o mesmo conjunto de escalas para revelar em quais contextos seu desempenho oscila.";
  const groups = [
    {
      key: "doubles",
      label: "Duplas",
      icon: Users,
      items: sessions.filter((s) => matchGroup(s.type ?? "") === "doubles"),
    },
    {
      key: "league",
      label: "Simples · Liga",
      icon: Trophy,
      items: sessions.filter((s) => matchGroup(s.type ?? "") === "league"),
    },
    {
      key: "friendly",
      label: "Simples · Amistosos",
      icon: Activity,
      items: sessions.filter((s) => matchGroup(s.type ?? "") === "friendly"),
    },
    {
      key: "wins",
      label: "Vitórias",
      icon: Medal,
      items: sessions.filter((s) => s.outcome === "vitória"),
    },
    {
      key: "losses",
      label: "Derrotas",
      icon: XCircle,
      items: sessions.filter((s) => s.outcome === "derrota"),
    },
  ];
  const activeGroup = groups.find((g) => g.key === statFilter);
  // Recharts drives its line animation from JS, so base.css cannot zero it.
  const reduceMotion =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  const me = profile.name || "Você";
  const honourRows: [string, string, string | null][] = [
    [
      "Maior sequência de vitórias",
      board.bestStreak ? `${board.bestStreak}` : "—",
      board.bestStreak === 1 ? "vitória" : board.bestStreak ? "vitórias" : null,
    ],
    [
      "Partida mais longa",
      board.longest ? minutesLabel(board.longest.duration!) : "—",
      board.longest
        ? `${board.longest.opponent ?? board.longest.type ?? "Sessão"} · ${dateLabel(board.longest.date, { day: "2-digit", month: "short", year: "numeric" })}`
        : null,
    ],
    [
      "Melhor nota pós-jogo",
      board.rated ? `${formatNumber(board.rated.postScore)}/10` : "—",
      board.rated
        ? `${board.rated.opponent ?? board.rated.type ?? "Sessão"} · ${dateLabel(board.rated.date, { day: "2-digit", month: "short" })}`
        : null,
    ],
    ["Viradas", String(board.comebacks), "após perder o 1º set"],
    ["Pneus aplicados", String(board.bagels), "sets 6–0"],
    ["Tempo em quadra", minutesLabel(board.minutes), `${sessions.length} sessões`],
    [
      "Morangos com creme merecidos",
      String(record.wins),
      "uma taça por vitória",
    ],
  ];
  return (
    <div className="tennis-dashboard wimbledon">
      <header className="wb-masthead">
        <div>
          <span className="wb-stripe" aria-hidden="true" />
          <span className="eyebrow">CENTRE COURT · DIÁRIO DE QUADRA</span>
          <h1>Tênis</h1>
          <p>Na grama de Wimbledon: resultados, programação e a sua campanha.</p>
        </div>
        <button className="button wb-primary" onClick={() => setRegistering(true)}>
          <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
          Registrar partida
        </button>
      </header>
      <TennisClub initial={profile}>
        {({ profile: player, matches, today, editProfile, manageAgenda }) => (
          <>
            <MatchHero
              next={matches[0]}
              last={lastMatch}
              me={me}
              today={today}
              record={record}
              rivals={rivals}
              onAgenda={manageAgenda}
              onDetails={setSelected}
            />
            <div className="wb-split">
              <section className="wb-board" aria-labelledby="wb-board-title">
                <header>
                  <h2 id="wb-board-title">Último resultado</h2>
                  {lastMatch && (
                    <span>
                      {lastMatch.type} ·{" "}
                      {dateLabel(lastMatch.record.recorded_on, {
                        day: "2-digit",
                        month: "short",
                      }).replace(/\./g, "")}
                    </span>
                  )}
                </header>
                {lastMatch ? (
                  <>
                    {lastMatch.sets.length ? (
                      <SetScore
                        me={me}
                        opponent={lastMatch.opponent}
                        sets={lastMatch.sets}
                        outcome={lastMatch.outcome}
                        variant="board"
                      />
                    ) : (
                      <p className="wb-board-text">
                        {lastMatch.score ?? "Placar não informado"}
                      </p>
                    )}
                    <footer>
                      <span>
                        {lastMatch.outcome === "vitória"
                          ? "Vitória"
                          : lastMatch.outcome === "derrota"
                            ? "Derrota"
                            : "Sem resultado"}
                        {lastMatch.duration !== null
                          ? ` · ${minutesLabel(lastMatch.duration)}`
                          : ""}
                      </span>
                      <button
                        className="button wb-glass"
                        onClick={() => setSelected(lastMatch)}
                      >
                        Detalhes
                      </button>
                    </footer>
                  </>
                ) : (
                  <p className="wb-board-text">Sem partidas registradas</p>
                )}
              </section>
              <section className="panel wb-record" aria-labelledby="wb-record-title">
                <span className="eyebrow">TEMPORADA</span>
                <h2 id="wb-record-title" className="sr-only">
                  Campanha da temporada
                </h2>
                <div className="wb-record-main">
                  <strong>
                    {record.wins}
                    <span>–</span>
                    {record.losses}
                  </strong>
                  <div>
                    <b>{record.rate === null ? "—" : `${record.rate}%`}</b>
                    <small>aproveitamento</small>
                  </div>
                </div>
                <div className="wb-form" aria-label="Últimos cinco resultados">
                  <small>Últimos 5</small>
                  <ol>
                    {record.form.map((f) => (
                      <li key={f.id}>
                        <button
                          className={`wb-form-pill ${f.result === "V" ? "win" : "loss"}`}
                          title={`${f.result === "V" ? "Vitória" : "Derrota"} · ${f.opponent ?? ""} · ${dateLabel(f.date, { day: "2-digit", month: "2-digit" })}`}
                          aria-label={`${f.result === "V" ? "Vitória" : "Derrota"} contra ${f.opponent ?? "adversário"} em ${dateLabel(f.date, { day: "2-digit", month: "2-digit" })}`}
                          onClick={() => {
                            const s = byId.get(f.id);
                            if (s) setSelected(s);
                          }}
                        >
                          {f.result}
                        </button>
                      </li>
                    ))}
                    {!record.form.length && <li className="field-help">Sem jogos decididos</li>}
                  </ol>
                </div>
                <dl className="wb-record-facts">
                  <div>
                    <dt>Sequência</dt>
                    <dd>
                      {record.streak
                        ? `${record.streak.count} ${record.streak.kind === "V" ? (record.streak.count === 1 ? "vitória" : "vitórias") : record.streak.count === 1 ? "derrota" : "derrotas"}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Sets</dt>
                    <dd>
                      {record.setsWon}–{record.setsLost}
                    </dd>
                  </div>
                  <div>
                    <dt>Games</dt>
                    <dd>
                      {record.gamesWon}–{record.gamesLost}
                    </dd>
                  </div>
                  <div>
                    <dt>Nota média</dt>
                    <dd>{formatNumber(performance)}/10</dd>
                  </div>
                </dl>
              </section>
            </div>
            <section className="wb-section" aria-labelledby="wb-order-title">
              <header className="wb-section-heading">
                <div>
                  <span className="eyebrow">ORDER OF PLAY</span>
                  <h2 id="wb-order-title">Programação</h2>
                </div>
                <button className="button secondary" onClick={manageAgenda}>
                  <CalendarDays size={16} strokeWidth={1.9} aria-hidden="true" />
                  Gerenciar
                </button>
              </header>
              {matches.length ? (
                <ol className="panel wb-order">
                  {matches.slice(0, 6).map((m, i) => (
                    <li key={m.id}>
                      <span className="wb-order-date">
                        <small>
                          {dateLabel(m.date, { weekday: "short" }).replace(".", "")}
                        </small>
                        <b>{m.date.slice(8, 10)}</b>
                      </span>
                      <span className="wb-order-main">
                        <small>
                          {i === 0 ? "A seguir · " : ""}
                          {m.time || "Horário a definir"} · {m.location || "Local a definir"}
                        </small>
                        <strong>
                          {m.opponent ? (
                            <>
                              {me} <em>vs</em> {m.opponent}
                            </>
                          ) : (
                            m.type
                          )}
                        </strong>
                      </span>
                      <span className={`wb-type ${matchGroup(m.type)}`}>{m.type}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="panel wb-empty">
                  Nenhuma partida agendada. Use Gerenciar ou envie o calendário pelo GPT.
                </p>
              )}
            </section>
            {path.length > 0 && (
              <section className="wb-section" aria-labelledby="wb-path-title">
                <header className="wb-section-heading">
                  <div>
                    <span className="eyebrow">CAMINHO NA LIGA</span>
                    <h2 id="wb-path-title">Rodada a rodada</h2>
                  </div>
                  <span className="badge">
                    {path.filter((p) => p.outcome === "vitória").length}V ·{" "}
                    {path.filter((p) => p.outcome === "derrota").length}D
                  </span>
                </header>
                <ol className="wb-path">
                  {path.map((p) => (
                    <li key={p.id} className={p.outcome === "vitória" ? "win" : p.outcome === "derrota" ? "loss" : ""}>
                      <button onClick={() => { const s = byId.get(p.id); if (s) setSelected(s); }}>
                        <span className="wb-path-node">R{p.round}</span>
                        <strong>{p.opponent ?? "Adversário"}</strong>
                        <small>
                          {p.sets.length ? p.sets.map((s) => `${s.felipe}–${s.adversario}`).join(" ") : (p.outcome ?? "Sem placar")}
                        </small>
                        <small>{dateLabel(p.date, { day: "2-digit", month: "short" }).replace(".", "")}</small>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <section className="wb-section" aria-labelledby="wb-results-title">
              <header className="wb-section-heading">
                <div>
                  <span className="eyebrow">SEU DIÁRIO DE QUADRA</span>
                  <h2 id="wb-results-title">Resultados</h2>
                </div>
                <span className="badge">{historySessions.length} sessões</span>
              </header>
              <div
                className="segmented large history-tabs"
                role="group"
                aria-label="Filtrar resultados"
              >
                {[
                  ["all", "Todos"],
                  ["training", "Treinos"],
                  ["league", "Simples · Liga"],
                  ["friendly", "Simples · Amistosos"],
                  ["doubles", "Duplas"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={historyFilter === key}
                    className={historyFilter === key ? "selected" : ""}
                    onClick={() => setHistoryFilter(key as typeof historyFilter)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="wb-results">
                {historySessions.length ? (
                  historySessions
                    .slice()
                    .reverse()
                    .slice(0, showAll ? undefined : 8)
                    .map((s) => (
                      <article className={`panel wb-match ${s.outcome === "vitória" ? "won" : s.outcome === "derrota" ? "lost" : ""}`} key={s.record.id}>
                        <header>
                          <time dateTime={s.record.recorded_on}>
                            {dateLabel(s.record.recorded_on, {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            }).replace(/\./g, "")}
                          </time>
                          <span className={`wb-type ${matchGroup(s.type ?? "")}`}>
                            {s.type ?? "Sessão"}
                          </span>
                          {s.competitive && (
                            <span className={`wb-result ${s.outcome === "vitória" ? "win" : s.outcome === "derrota" ? "loss" : ""}`}>
                              {s.outcome === "vitória" ? "V" : s.outcome === "derrota" ? "D" : "—"}
                              <span className="sr-only"> {s.outcome ?? "sem resultado"}</span>
                            </span>
                          )}
                        </header>
                        {s.competitive && s.sets.length ? (
                          <SetScore me={me} opponent={s.opponent} sets={s.sets} outcome={s.outcome} variant="card" />
                        ) : (
                          <div className="wb-match-line">
                            <Avatar name={s.opponent || s.type} tone="them" />
                            <span>
                              <strong>{s.opponent || "Sem adversário / parceiro"}</strong>
                              <small>
                                {s.competitive ? s.score ?? "Placar não informado" : "Sessão de treino"}
                              </small>
                            </span>
                          </div>
                        )}
                        <footer>
                          <small>
                            {s.duration === null ? "Duração não informada" : minutesLabel(s.duration)}
                            {s.postScore !== null && <> · <b>{formatNumber(s.postScore)}</b>/10</>}
                          </small>
                          <span>
                            <button
                              className="button icon ghost"
                              title="Editar sessão"
                              aria-label={`Editar ${s.type ?? "sessão de tênis"} de ${s.record.recorded_on}`}
                              onClick={() => setEditingSession(s)}
                            >
                              <Pencil size={17} strokeWidth={1.9} />
                            </button>
                            <button className="button secondary small" onClick={() => setSelected(s)}>
                              Detalhes
                            </button>
                          </span>
                        </footer>
                      </article>
                    ))
                ) : (
                  <p className="panel wb-empty">
                    Nenhuma sessão nesta categoria. Use a canetinha para classificar suas partidas.
                  </p>
                )}
              </div>
              {historySessions.length > 8 && (
                <button className="button secondary wb-more" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Mostrar menos" : `Mostrar todos os ${historySessions.length}`}
                </button>
              )}
            </section>
            <section className="wb-section" aria-labelledby="wb-stats-title">
              <header className="wb-section-heading">
                <div>
                  <span className="eyebrow">ESTATÍSTICAS</span>
                  <h2 id="wb-stats-title">Sua temporada em números</h2>
                </div>
              </header>
              <div className="wb-stats">
                {groups.map(({ key, label, icon: Icon, items }) => (
                  <button key={key} className={`metric wb-stat ${key}`} onClick={() => setStatFilter(key)}>
                    <span className="metric-top">
                      <span>
                        <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                        {label}
                      </span>
                    </span>
                    <strong className="metric-value">{items.length}</strong>
                    <span className="metric-foot">Ver partidas</span>
                  </button>
                ))}
              </div>
              <div className="wb-split">
                <section className="panel wb-chart-panel">
                  <div className="panel-heading">
                    <h3>Energia, clareza e desempenho</h3>
                    <span className="eyebrow">ÚLTIMAS 14 SESSÕES</span>
                  </div>
                  {chart.length ? (
                    <>
                      <div className="tennis-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chart} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="var(--separator-soft)" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={8} tick={{ fontSize: 12, fill: "var(--label-2)" }} />
                            <YAxis domain={[0, 10]} ticks={[0, 5, 10]} width={28} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--label-2)" }} />
                            <Tooltip
                              cursor={{ stroke: "var(--separator)", strokeWidth: 1 }}
                              contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--separator-soft)", borderRadius: 12, boxShadow: "var(--shadow-2)", padding: "8px 12px", fontSize: 13, lineHeight: "18px", color: "var(--label)" }}
                              labelStyle={{ color: "var(--label-2)", fontWeight: 600, marginBottom: 4 }}
                              itemStyle={{ color: "var(--label)", padding: 0 }}
                            />
                            {[
                              ["Energia", "energia", "var(--wb-line-green)"],
                              ["Clareza", "clareza", "var(--wb-line-purple)"],
                              ["Desempenho", "desempenho", "var(--wb-line-gold)"],
                            ].map(([name, key, color]) => (
                              <Line
                                key={key}
                                name={name}
                                dataKey={key}
                                stroke={color}
                                strokeWidth={2.5}
                                dot={{ r: 3, strokeWidth: 0, fill: color }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                                isAnimationActive={!reduceMotion}
                                animationDuration={280}
                                connectNulls
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="tennis-chart-legend" aria-hidden="true">
                        <span><i style={{ ["--legend" as string]: "var(--wb-line-green)" }} />Energia</span>
                        <span><i style={{ ["--legend" as string]: "var(--wb-line-purple)" }} />Clareza</span>
                        <span><i style={{ ["--legend" as string]: "var(--wb-line-gold)" }} />Desempenho</span>
                      </div>
                    </>
                  ) : (
                    <p className="field-help">Ainda não há sessões suficientes para o gráfico.</p>
                  )}
                </section>
                <section className="panel wb-h2h" aria-labelledby="wb-h2h-title">
                  <div className="panel-heading">
                    <h3 id="wb-h2h-title">Confrontos diretos</h3>
                    <span className="eyebrow">HEAD-TO-HEAD</span>
                  </div>
                  {rivals.length ? (
                    <ol>
                      {rivals.slice(0, 6).map((r) => (
                        <li key={r.opponent}>
                          <Avatar name={r.opponent} tone="them" />
                          <span>
                            <strong>{r.opponent}</strong>
                            <small>Último: {dateLabel(r.last, { day: "2-digit", month: "short", year: "numeric" })}</small>
                          </span>
                          <span className="wb-h2h-record">
                            <b>{r.wins}–{r.losses}</b>
                            <i aria-hidden="true">
                              <em style={{ width: `${(r.wins / (r.wins + r.losses)) * 100}%` }} />
                            </i>
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="field-help">Os confrontos aparecem quando houver partidas com resultado e adversário.</p>
                  )}
                </section>
              </div>
            </section>
            <div className="wb-split wb-bottom">
              <section className="wb-honours" aria-labelledby="wb-honours-title">
                <span className="wb-honours-kicker">HONOURS BOARD · {today.slice(0, 4)}</span>
                <h2 id="wb-honours-title">Quadro de honra</h2>
                <dl>
                  {honourRows.map(([label, value, note]) => (
                    <div key={label}>
                      <dt>
                        {label}
                        {note && <small>{note}</small>}
                      </dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {board.rival && (
                  <p className="wb-honours-rival">
                    Maior rival: <b>{board.rival.opponent}</b> · {board.rival.wins}–{board.rival.losses}
                  </p>
                )}
              </section>
              <div className="wb-side">
                <section className="panel wb-player" aria-labelledby="wb-player-title">
                  <div className="wb-player-head">
                    <Avatar name={player.name} tone="me" />
                    <div>
                      <span className="eyebrow">FICHA DO JOGADOR</span>
                      <h2 id="wb-player-title">{player.name || "Seu perfil"}</h2>
                    </div>
                    <button className="button icon ghost" aria-label="Editar ficha do jogador" title="Editar ficha" onClick={editProfile}>
                      <Pencil size={17} strokeWidth={1.9} />
                    </button>
                  </div>
                  <dl>
                    <div><dt>Sexo</dt><dd>{player.sex || "Não informado"}</dd></div>
                    <div><dt>Raquete</dt><dd>{player.racket || "Não informada"}</dd></div>
                    <div><dt>Corda</dt><dd>{player.strings || "Não informada"}</dd></div>
                    <div><dt>Traje</dt><dd>Todo branco, como manda a tradição</dd></div>
                  </dl>
                </section>
                <section className="panel tennis-insight">
                  <Sparkles strokeWidth={1.9} aria-hidden="true" />
                  <div>
                    <span className="eyebrow">LEITURA DO DIÁRIO</span>
                    <h2>Para a próxima sessão</h2>
                    <p>{insight}</p>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </TennisClub>
      {editingSession && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingSession(null);
          }}
        >
          <DialogContent className="dialog-content tennis-details-dialog">
            <DialogTitle>Editar sessão de tênis</DialogTitle>
            <DialogDescription>
              Altere o tipo, adversário e outras informações. Os cards e filtros
              refletem a nova classificação após salvar.
            </DialogDescription>
            <TennisSessionEditor
              id={editingSession.record.id}
              type={editingSession.type}
              opponent={editingSession.opponent}
              duration={editingSession.duration}
              analysis={editingSession.analysis}
              expanded
              onSaved={() => setEditingSession(null)}
            />
          </DialogContent>
        </Dialog>
      )}
      {activeGroup && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setStatFilter(null);
          }}
        >
          <DialogContent className="dialog-content tennis-details-dialog">
            <DialogTitle>{activeGroup.label}</DialogTitle>
            <DialogDescription>
              {activeGroup.items.length} partidas registradas nesta categoria.
            </DialogDescription>
            <div className="list club-match-list">
              {activeGroup.items.length ? (
                activeGroup.items
                  .slice()
                  .reverse()
                  .map((s) => (
                    <button
                      key={s.record.id}
                      onClick={() => {
                        setStatFilter(null);
                        setSelected(s);
                      }}
                    >
                      <span>
                        <small>{dateLabel(s.record.recorded_on, {})}</small>
                        <strong>{s.opponent || s.type || "Partida"}</strong>
                      </span>
                      <span>
                        {s.score || "Sem placar"}
                        <small>
                          {s.outcome || "Resultado não informado"} · Detalhes ↗
                        </small>
                      </span>
                    </button>
                  ))
              ) : (
                <p>Ainda não há partidas identificadas nesta categoria.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {selected && (
        <TennisDetails session={selected} onClose={() => setSelected(null)} />
      )}
      {registering && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setRegistering(false);
          }}
        >
          <DialogContent className="dialog-content tennis-details-dialog">
            <DialogTitle>Registrar tênis</DialogTitle>
            <DialogDescription>
              Este registro aparece em Tênis e Saúde usando a mesma referência.
            </DialogDescription>
            <HealthJournal
              initialKind="tennis"
              showTabs={false}
              onSaved={() => {
                setRegistering(false);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
