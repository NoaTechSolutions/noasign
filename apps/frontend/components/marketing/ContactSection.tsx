"use client";

import { useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";
import { openChat } from "../../lib/open-chat";

type SubmitStatus = "idle" | "loading" | "success" | "error";

export function ContactSection() {
  const { lang } = useLang();
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const configured = siteKey.length > 0 && apiUrl.length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnstileToken || !configured) {
      return;
    }

    setStatus("loading");
    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch(`${apiUrl}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          turnstileToken,
          lang,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setStatus("success");
      formRef.current?.reset();
      setTurnstileToken("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="section contact-section" id="contact">
      <div className="contact-inner">
        <div className="contact-left">
          <h2 className="contact-headline rv">
            {T[lang].cf_headline_1}
            <br />
            <span>{T[lang].cf_headline_2}</span>
          </h2>
          <p className="contact-desc rv">{T[lang].cf_desc}</p>
          <button
            type="button"
            onClick={openChat}
            className="btn btn-a contact-chat-btn rv"
            aria-label={T[lang].cf_chat_btn}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{T[lang].cf_chat_btn}</span>
          </button>
        </div>

        <div className="contact-right rv">
          {!configured ? (
            <div className="contact-success" role="alert">
              {T[lang].cf_missing_cfg}
            </div>
          ) : status === "success" ? (
            <div className="contact-success" role="status">
              {T[lang].cf_ok}
            </div>
          ) : (
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="contact-form"
              noValidate
            >
              <div className="cf-row">
                <input
                  name="name"
                  type="text"
                  placeholder={T[lang].cf_name}
                  required
                  maxLength={100}
                  autoComplete="name"
                  className="cf-input"
                />
                <input
                  name="email"
                  type="email"
                  placeholder={T[lang].cf_email}
                  required
                  maxLength={254}
                  autoComplete="email"
                  className="cf-input"
                />
              </div>
              <textarea
                name="message"
                placeholder={T[lang].cf_msg}
                required
                maxLength={5000}
                rows={5}
                className="cf-textarea"
              />
              <div className="cf-footer">
                <div className="cf-turnstile">
                  <Turnstile
                    siteKey={siteKey}
                    onSuccess={setTurnstileToken}
                    onExpire={() => setTurnstileToken("")}
                    onError={() => setTurnstileToken("")}
                    options={{ theme: "auto" }}
                  />
                </div>
                {status === "error" && (
                  <p className="cf-error" role="alert">
                    {T[lang].cf_err}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status === "loading" || !turnstileToken}
                  className="btn btn-a cf-submit"
                >
                  {status === "loading" ? T[lang].cf_sending : T[lang].cf_send}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
