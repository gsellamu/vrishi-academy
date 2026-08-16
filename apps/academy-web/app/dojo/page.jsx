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

/* Dec 10 countdown color logic: green >90d · amber 30–90d · red <30d */
function countdownTone(days) {
  if (days > 90) return "green";
  if (days >= 30) return "amber";
  return "red";
}

export default function Dojo() {
  const total = Math.ceil((new Date(gap.hardStop) - new Date(gap.asOf)) / 86400000);
  const days = Math.max(0, Math.ceil((new Date(gap.hardStop) - Date.now()) / 86400000));
  const tone = countdownTone(days);
  const elapsed = Math.min(100, Math.max(0, ((total - days) / total) * 100));

  return (
    <article>
      <span className="eyebrow">Dojo · dual ledger</span>
      <h1>Real gap to <em>CHt</em></h1>
      <p className="note">
        Sim reps sharpen the craft; only these four numbers graduate you. SAP hard stop {gap.hardStop}.
        Season pace below — hold it and the dials close on their own.
      </p>

      <div className={`countdown ${tone}`}>
        <div>
          <div className="big">{days}</div>
          <div className="unit">days to Dec 10</div>
        </div>
        <div className="cdbar"><span style={{ width: `${elapsed}%` }} /></div>
        <div className="to">
          {tone === "green" && "On the clock — steady accumulation now beats a scramble in November."}
          {tone === "amber" && "Inside the window — every week of pace matters from here."}
          {tone === "red" && "Final stretch — protect contact and workshop slots above all else."}
        </div>
      </div>

      <div className="dials">
        <Dial label="Client contacts" {...gap.contacts} />
        <Dial label="Case conferences" {...gap.conferences} />
        <Dial label="401 electives" {...gap.electives} />
        <Dial label="Practicum workshops" {...gap.workshops} />
      </div>

      <div className="rhythm">
        <span className="rl">Weekly rhythm</span>
        <span className="rp"><b>{Math.max(1, Math.ceil((gap.contacts.need - gap.contacts.done) / Math.max(1, Math.ceil(days / 7))))}</b> contacts</span>
        <span className="rp"><b>{Math.max(1, Math.ceil((gap.conferences.need - gap.conferences.done) / Math.max(1, Math.ceil(days / 7))))}</b> conferences</span>
        <span className="rp"><b>{Math.max(1, Math.ceil((gap.electives.need - gap.electives.done) / Math.max(1, Math.ceil(days / 7))))}</b> elective hrs</span>
        <span className="rp"><b>{Math.max(1, Math.ceil((gap.workshops.need - gap.workshops.done) / Math.max(1, Math.ceil(days / 7))))}</b> workshop</span>
      </div>

      <p className="note" style={{ marginTop: 26 }}>
        Update <code>apps/academy-web/data/gap.json</code> after each week (progress-svc automates this in P0).
        As of {gap.asOf}.
      </p>
    </article>
  );
}
