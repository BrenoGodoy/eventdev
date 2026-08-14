"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { Brand } from "../../components/brand/Brand";
import { EventTicket } from "../../components/event-ticket/EventTicket";
import actions from "../../components/ui/Action.module.css";
import { login, storeSession } from "../../lib/auth";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const session = await login(email, password);
      storeSession(session);
      const requestedRedirect = new URLSearchParams(window.location.search).get(
        "redirect",
      );
      const redirect =
        requestedRedirect?.startsWith("/") &&
        !requestedRedirect.startsWith("//")
          ? requestedRedirect
          : "/";
      router.push(redirect);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Não foi possível entrar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.story} aria-labelledby="login-title">
        <Brand inverse />
        <div className={styles.storyCopy}>
          <p className={styles.eyebrow}>Bilheteria editorial</p>
          <h1 id="login-title">Entrar na plataforma</h1>
          <p>
            Acesse sua jornada EventDev para descobrir eventos, gerenciar
            experiências e validar ingressos.
          </p>
        </div>
      </section>

      <section className={styles.panel} aria-label="Formulário de login">
        <div className={styles.panelInner}>
          <div className={styles.panelHeading}>
            <p className={styles.panelEyebrow}>Acesse sua conta</p>
            <h2>Bem-vindo de volta</h2>
            <p>Entre com seu e-mail e senha para continuar.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              E-mail
              <span className={styles.inputControl}>
                <Mail aria-hidden="true" size={19} />
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>
            <label className={styles.field}>
              Senha
              <span className={styles.inputControl}>
                <LockKeyhole aria-hidden="true" size={19} />
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </span>
            </label>

            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}

            <button
              className={`${actions.action} ${actions.primary} ${actions.block}`}
              disabled={isSubmitting}
              type="submit"
            >
              <span>{isSubmitting ? "Entrando..." : "Entrar"}</span>
              {!isSubmitting ? (
                <ArrowRight aria-hidden="true" size={19} />
              ) : null}
            </button>
            <p className={styles.signupPrompt}>
              Ainda não tem uma conta?{" "}
              <Link href="/cadastro">Criar perfil</Link>
            </p>
          </form>
        </div>
      </section>

      <section className={styles.ticketStage} aria-label="Evento em destaque">
        <EventTicket />
      </section>
    </main>
  );
}
