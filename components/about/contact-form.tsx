"use client";

import { useState, useTransition, type FormEvent } from "react";
import { sendContactMessage } from "@/app/about/actions";

const EMPTY = { name: "", email: "", message: "" };

export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await sendContactMessage(formData);
      if (result.ok) {
        setSent(result.name || form.name.trim());
      } else {
        setError(result.error);
      }
    });
  };

  const reset = () => {
    setSent(null);
    setError(null);
    setForm(EMPTY);
  };

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit} noValidate>
      {!sent ? (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-message">MENSAJE</label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>

          {/* Honeypot: oculto para humanos */}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="contact-website">WEBSITE</label>
            <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          {error && (
            <div className="terminal-error" role="alert">
              [ERROR] {error}
            </div>
          )}

          <button className="btn xl press" type="submit" style={{ width: "100%" }} disabled={pending}>
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sent.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={reset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
