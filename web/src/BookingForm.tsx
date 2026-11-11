import { ChangeEvent, FormEvent, useState } from "react";

// What the agent knew when it opened the form (args of its open_booking_form tool call).
export type Booking = { item: string; options: string[]; max_persons: number; option?: string | null; persons?: number | null };

type Step = "edit" | "review" | "sending" | "sent";

function Steps({ at }: { at: 0 | 1 | 2 }) {
  return (
    <ol className="steps">
      {["Details", "Review", "Sent"].map((label, i) => (
        <li key={label} aria-current={i === at ? "step" : undefined}>{i + 1}. {label}</li>
      ))}
    </ol>
  );
}

// Three steps in one card: fill in -> check the summary -> send. The agent prefills what it learned in the chat.
export default function BookingForm({ booking, thread }: { booking: Booking; thread: string }) {
  const maxPersons = Math.max(1, booking.max_persons || 1);
  const [form, setForm] = useState({
    option: booking.option ?? booking.options[0] ?? "",
    persons: Math.min(booking.persons ?? 1, maxPersons),
    name: "",
    address: "",
    social: "",
  });
  const [step, setStep] = useState<Step>("edit");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  const field = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: key === "persons" ? Number(e.target.value) : e.target.value });

  async function submit() {
    setStep("sending");
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread, item: booking.item, ...form }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(res.status === 422 ? "Some details look wrong, please check them." : String(body.detail));
      setReference(body.reference);
      setStep("sent");
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Couldn't send, please try again.");
      setStep("review");
    }
  }

  if (step === "sent") {
    return (
      <section className="booking sent" aria-live="polite">
        <Steps at={2} />
        <h3>Booking request sent ✓</h3>
        <p>
          Reference <strong>{reference}</strong>. The YAGA team will contact you to confirm {booking.item}.
        </p>
      </section>
    );
  }

  if (step === "review" || step === "sending") {
    return (
      <section className="booking">
        <Steps at={1} />
        <h3>Check your booking</h3>
        <dl>
          <dt>Booking</dt><dd>{booking.item}</dd>
          <dt>Boat / package</dt><dd>{form.option}</dd>
          <dt>People</dt><dd>{form.persons}</dd>
          <dt>Name</dt><dd>{form.name}</dd>
          <dt>Address</dt><dd>{form.address}</dd>
          <dt>Social media</dt><dd>{form.social}</dd>
        </dl>
        {error && <p className="booking-error" role="alert">{error}</p>}
        <div className="booking-actions">
          <button type="button" className="secondary" onClick={() => setStep("edit")} disabled={step === "sending"}>Edit</button>
          <button type="button" onClick={submit} disabled={step === "sending"}>{step === "sending" ? "Sending…" : "Send booking"}</button>
        </div>
      </section>
    );
  }

  return (
    <form className="booking" onSubmit={(e: FormEvent) => { e.preventDefault(); setStep("review"); }}>
      <Steps at={0} />
      <h3>Book: {booking.item}</h3>

      {booking.options.length > 0 && (
        <fieldset className="choices">
          <legend>Boat / package</legend>
          {booking.options.map((option) => (
            <label key={option} className={form.option === option ? "chosen" : ""}>
              <input type="radio" name="option" value={option} checked={form.option === option} onChange={field("option")} required />
              {option}
            </label>
          ))}
        </fieldset>
      )}

      <div className="field">
        <span id="persons-label">People <span className="muted">(up to {maxPersons})</span></span>
        <div className="stepper" role="group" aria-labelledby="persons-label">
          <button type="button" aria-label="One less" disabled={form.persons <= 1} onClick={() => setForm({ ...form, persons: form.persons - 1 })}>−</button>
          <output aria-live="polite">{form.persons}</output>
          <button type="button" aria-label="One more" disabled={form.persons >= maxPersons} onClick={() => setForm({ ...form, persons: form.persons + 1 })}>+</button>
        </div>
      </div>
      <label>
        Full name
        <input value={form.name} onChange={field("name")} autoComplete="name" minLength={2} maxLength={100} required />
      </label>
      <label>
        Address
        <input value={form.address} onChange={field("address")} autoComplete="street-address" placeholder="Street, city, country" minLength={5} maxLength={300} required />
      </label>
      <label>
        Social media <span className="muted">(so we know who we're talking to)</span>
        <input value={form.social} onChange={field("social")} placeholder="instagram.com/you or @you" minLength={2} maxLength={200} required />
      </label>

      <button>Review booking</button>
    </form>
  );
}
