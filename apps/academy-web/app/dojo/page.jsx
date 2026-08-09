import gap from "../../data/gap.json";

function Dial({ label, done, need, unit }) {
  const r = 54, c = 2 * Math.PI * r;
  const frac = Math.min(1, done / need);
  return (
    <div className="dial">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`${label}: ${done} of ${need}`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--amber)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 70 70)" />
        <circle cx="70" cy="70" r="34" fill="none" stroke="var(--iris)" strokeWidth="2" opacity="0.5" />
        <circle cx="70" cy="70" r="20" fill="none" stroke="var(--iris)" strokeWidth="2" opacity="0.25" />
      </svg>
      <div className="n"><b>{done}</b> / {need}</div>
      <div className="l">{label} · {unit}</div>
    </div>
  );
}

export const metadata = { title: "Dojo · Real gap to CHt" };

export default function Dojo() {
  const days = Math.max(0, Math.ceil((new Date(gap.hardStop) - Date.now()) / 86400000));
  return (
    <article>
      <span className="eyebrow">Dojo · dual ledger</span>
      <h1>Real gap to <em>CHt</em></h1>
      <p className="note">
        Sim reps sharpen the craft; only these four numbers graduate you. SAP hard stop {gap.hardStop} —
        {" "}{days} days remain. Season pace: 3 contacts, 2–3 conferences, 8 elective hours, 1 workshop per week.
      </p>
      <div className="dials">
        <Dial label="Client contacts" {...gap.contacts} />
        <Dial label="Case conferences" {...gap.conferences} />
        <Dial label="401 electives" {...gap.electives} />
        <Dial label="Practicum workshops" {...gap.workshops} />
      </div>
      <p className="note" style={{ marginTop: 26 }}>
        Update <code>apps/academy-web/data/gap.json</code> after each week (progress-svc automates this in P0).
        As of {gap.asOf}.
      </p>
    </article>
  );
}
