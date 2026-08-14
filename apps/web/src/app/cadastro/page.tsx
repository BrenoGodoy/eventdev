"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "../../components/brand/Brand";
import { EventTicket } from "../../components/event-ticket/EventTicket";
import actions from "../../components/ui/Action.module.css";
import { registerCustomer, storeSession } from "../../lib/auth";
import loginStyles from "../login/page.module.css";
import styles from "./page.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== passwordConfirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await registerCustomer(name, email, password);
      storeSession(session);
      router.push("/");
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : "Não foi possível criar sua conta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={loginStyles.page}>
      <section className={loginStyles.story} aria-labelledby="register-title">
        <Brand inverse />
        <div className={loginStyles.storyCopy}>
          <p className={loginStyles.eyebrow}>Sua jornada EventDev</p>
          <h1 id="register-title">Criar seu perfil</h1>
          <p>
            Tenha seus ingressos em um só lugar e acompanhe cada experiência
            desde a compra até a entrada.
          </p>
        </div>
      </section>

      <section
        className={loginStyles.panel}
        aria-label="Formulário de cadastro"
      >
        <div className={loginStyles.panelInner}>
          <div className={loginStyles.panelHeading}>
            <p className={loginStyles.panelEyebrow}>Perfil de cliente</p>
            <h2>Comece por aqui</h2>
            <p>Preencha seus dados para criar uma conta de cliente.</p>
          </div>

          <form
            className={`${loginStyles.form} ${styles.form}`}
            onSubmit={handleSubmit}
          >
            <label className={loginStyles.field}>
              Nome
              <input
                autoComplete="name"
                maxLength={80}
                minLength={2}
                onChange={(event) => setName(event.target.value)}
                required
                type="text"
                value={name}
              />
            </label>
            <label className={loginStyles.field}>
              E-mail
              <input
                autoComplete="email"
                maxLength={160}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label className={loginStyles.field}>
              Senha
              <input
                autoComplete="new-password"
                maxLength={72}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <label className={loginStyles.field}>
              Confirmar senha
              <input
                autoComplete="new-password"
                maxLength={72}
                minLength={8}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
                required
                type="password"
                value={passwordConfirmation}
              />
            </label>

            <p className={styles.passwordHint}>
              Use ao menos 8 caracteres, com letra maiúscula, minúscula e
              número.
            </p>

            {error ? (
              <p className={loginStyles.error} role="alert">
                {error}
              </p>
            ) : null}

            <button
              className={`${actions.action} ${actions.primary} ${actions.block}`}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Criando perfil..." : "Criar perfil"}
            </button>

            <p className={loginStyles.signupPrompt}>
              Já possui uma conta? <Link href="/login">Entrar</Link>
            </p>
          </form>
        </div>
      </section>

      <section
        className={loginStyles.ticketStage}
        aria-label="Evento em destaque"
      >
        <EventTicket />
      </section>
    </main>
  );
}
