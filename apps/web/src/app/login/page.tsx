"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "../../components/brand/Brand";
import actions from "../../components/ui/Action.module.css";
import { demoAccounts, login, storeSession } from "../../lib/auth";
import styles from "./page.module.css";

const roleLabel = {
  ORGANIZER: "Organizador",
  CUSTOMER: "Cliente",
  GATE: "Portaria",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
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
          : "Nao foi possivel entrar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectAccount(accountEmail: string, accountPassword: string) {
    setEmail(accountEmail);
    setPassword(accountPassword);
    setError("");
  }

  return (
    <main className={styles.page}>
      <section className={styles.story} aria-labelledby="login-title">
        <Brand inverse />
        <div className={styles.storyCopy}>
          <p className={styles.eyebrow}>Bilheteria editorial</p>
          <h1 id="login-title">Entrar na plataforma</h1>
          <p>
            Acesso seed para navegar pelos tres papeis do desafio: publicar,
            comprar e validar ingressos.
          </p>
        </div>
        <div className={styles.ticket} aria-hidden="true">
          <div className={styles.ticketDate}>
            <span>Proxima sessao</span>
            <strong>15 OUT</strong>
          </div>
          <div className={styles.ticketRoute}>
            <span>FILME</span>
            <span>SHOW</span>
            <span>PORTARIA</span>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="Formulario de login">
        <div className={styles.panelInner}>
          <div className={styles.panelHeading}>
            <p className={styles.panelEyebrow}>Contas demo</p>
            <h2>Escolha um papel</h2>
            <p>Use uma das contas preparadas para acessar cada jornada.</p>
          </div>

          <div className={styles.accountGrid}>
            {demoAccounts.map((account) => {
              const isActive = email === account.email;

              return (
                <button
                  aria-pressed={isActive}
                  className={`${styles.accountCard} ${isActive ? styles.accountCardActive : ""}`}
                  key={account.email}
                  type="button"
                  onClick={() =>
                    selectAccount(account.email, account.password)
                  }
                >
                  <span>{roleLabel[account.role]}</span>
                  <strong>{account.email}</strong>
                </button>
              );
            })}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              E-mail
              <input
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
              />
            </label>
            <label className={styles.field}>
              Senha
              <input
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
              />
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
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
