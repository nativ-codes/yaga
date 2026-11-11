import { FormEvent, Fragment, ReactNode, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BookingForm, { Booking } from "./BookingForm";

type Line = { role: "user" | "assistant" | "moderated" | "error"; text: string; booking?: Booking | null };

// One thread per page load; the server keeps the history for it.
const thread = crypto.randomUUID();

const SailIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5v14M12 3.5l7.5 12.5H12M10.5 6 4.5 16h6M2.5 18.5h19l-2.5 3h-14z" />
  </svg>
);

const HelmIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.2" />
    <path d="M12 2v7.8M12 14.2V22M2 12h7.8M14.2 12H22M4.9 4.9l5.5 5.5M13.6 13.6l5.5 5.5M19.1 4.9l-5.5 5.5M10.4 13.6l-5.5 5.5" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

type Offer = { icon: ReactNode; kicker: string; title: string; text: string; tags: string[]; ask: string; book: string };

// shortcut: card facts are copied from server/knowledge.md by hand; update both when events change.
const offers: Offer[] = [
  {
    icon: <SailIcon />,
    kicker: "Sail with a crew",
    title: "Yacht gatherings",
    text: "Week-long sailing trips, up to 8 people aboard a catamaran or monohull.",
    tags: ["Cyclades", "Peloponnese", "Dodecanese", "Sicily", "Ibiza", "Caribbean"],
    ask: "Tell me about your yacht gatherings: which trips do you have, when, and how much do they cost?",
    book: "I want to book a place on a yacht gathering.",
  },
  {
    icon: <HelmIcon />,
    kicker: "Take the helm",
    title: "Skipper licence",
    text: "ISSA Inshore Skipper: 7 days on board in Greece with instructor Cristian Negoiu. 2 licences included.",
    tags: ["April 2027", "Yachts up to 24 m", "Day & night sailing", "Max 6 students"],
    ask: "Tell me about the skipper licence course: how it works, the requirements and the price.",
    book: "I want to book the skipper licence course.",
  },
];

const quickQuestions = ["When is the next trip?", "Catamaran or monohull?", "Do I need experience?", "What does the licence let me do?"];

export default function App() {
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (lines.length) end.current?.scrollIntoView({ behavior: "smooth" }); }, [lines, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    setLines((l) => [...l, { role: "user", text: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread, message }),
      });
      const body = await res.json();
      setLines((l) => [
        ...l,
        res.ok
          ? { role: body.moderated ? "moderated" : "assistant", text: body.reply, booking: body.booking }
          : { role: "error", text: String(body.detail) },
      ]);
    } catch {
      setLines((l) => [...l, { role: "error", text: "Can't reach the server, please try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  const started = lines.length > 0;

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo"><SailIcon /></span>
        <div>
          <strong>YAGA</strong>
          <span className="tagline">Yacht gatherings &amp; skipper school</span>
        </div>
      </header>

      <main className="chat" aria-live="polite">
        {!started && (
          <section className="welcome">
            <h1>Ahoy! Where are we sailing next?</h1>
            <p>Join a crew for a week at sea, or earn your skipper licence with our instructor. Ask me anything.</p>
          </section>
        )}

        <section className={started ? "offers compact" : "offers"} aria-label="What we offer">
          {offers.map((offer) => (
            <article key={offer.title} className="offer">
              <span className="offer-icon">{offer.icon}</span>
              <div className="offer-body">
                <span className="kicker">{offer.kicker}</span>
                <h2>{offer.title}</h2>
                {!started && <p>{offer.text}</p>}
                {!started && <ul className="tags">{offer.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>}
              </div>
              <div className="offer-actions">
                <button className="ghost" onClick={() => send(offer.ask)} disabled={busy}>Learn more</button>
                <button onClick={() => send(offer.book)} disabled={busy}>Book</button>
              </div>
            </article>
          ))}
        </section>

        {lines.map((line, i) =>
          line.role === "user" ? (
            <p key={i} className="bubble user">{line.text}</p>
          ) : (
            <Fragment key={i}>
              <div className="from-crew">
                <span className="avatar"><SailIcon /></span>
                {/* react-markdown never renders raw HTML, so model output can't inject markup. */}
                <div className={`bubble ${line.role}`}>
                  <Markdown remarkPlugins={[remarkGfm]}>{line.text}</Markdown>
                </div>
              </div>
              {line.booking && <BookingForm booking={line.booking} thread={thread} />}
            </Fragment>
          ),
        )}
        {busy && (
          <div className="from-crew">
            <span className="avatar"><SailIcon /></span>
            <p className="bubble assistant typing" aria-label="Typing"><span /><span /><span /></p>
          </div>
        )}
        <div ref={end} />
      </main>

      <footer className="composer">
        <div className="quick" aria-label="Quick questions">
          {quickQuestions.map((q) => (
            <button key={q} className="chip" onClick={() => send(q)} disabled={busy}>{q}</button>
          ))}
        </div>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(draft); }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about trips, boats or the licence…" aria-label="Message" autoFocus />
          <button className="send" disabled={busy || !draft.trim()} aria-label="Send"><SendIcon /></button>
        </form>
      </footer>
    </div>
  );
}
