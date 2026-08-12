"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "../components/brand/Brand";
import { FeaturedCarousel } from "../components/featured-carousel/FeaturedCarousel";
import actions from "../components/ui/Action.module.css";
import { AuthSession, clearSession, readSession } from "../lib/auth";
import styles from "./page.module.css";

const roleHome = {
  ORGANIZER: {
    title: "Painel do organizador",
    summary: "Publique eventos a partir do catalogo e acompanhe estoque, receita e check-ins.",
    stats: ["2 eventos seed", "R$ 18.420 receita", "74% ocupacao"],
    primary: "Novo evento",
    secondary: "Ver analytics",
  },
  CUSTOMER: {
    title: "Home do cliente",
    summary: "Explore eventos publicados, reserve lugares e acompanhe seus ingressos.",
    stats: ["2 eventos publicados", "1 ticket ativo", "Checkout demo"],
    primary: "Explorar eventos",
    secondary: "Meus ingressos",
  },
  GATE: {
    title: "Console da portaria",
    summary: "Valide QR ou codigo manual com retorno grande, direto e auditavel.",
    stats: ["Scanner mobile-first", "Codigo manual", "Historico local"],
    primary: "Abrir scanner",
    secondary: "Ultimas leituras",
  },
};

export default function HomePage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => {
      setSession(readSession());
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(hydrationId);
  }, []);

  const roleContent = useMemo(() => {
    if (!session) {
      return null;
    }

    return roleHome[session.user.role];
  }, [session]);

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand />
          <nav className={styles.nav} aria-label="Navegacao principal">
            {session ? (
              <>
                <span className={styles.sessionName}>{session.user.name}</span>
                <button
                  className={`${actions.action} ${actions.ghost}`}
                  onClick={handleLogout}
                  type="button"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                className={`${actions.action} ${actions.ghost}`}
                href="/login"
              >
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>MVP Dia 1</p>
          <h1 id="home-title">
            Eventos, ingressos e portaria em uma jornada demonstravel.
          </h1>
          <p>
            A base do desafio com tres papeis, catalogo publico e direcao visual
            pronta para crescer para reserva, pagamento e scanner.
          </p>
          <div className={styles.heroActions}>
            <Link
              className={`${actions.action} ${actions.primary}`}
              href="/login"
            >
              {session ? "Trocar papel" : "Entrar com conta demo"}
            </Link>
            <Link
              className={`${actions.action} ${actions.secondary}`}
              href="#eventos"
            >
              Ver eventos
            </Link>
          </div>
        </div>

      </section>

      <FeaturedCarousel />

      <section className={styles.roleSection} aria-live="polite">
        <div className={styles.roleInner}>
          {isReady && roleContent ? (
            <>
              <div className={styles.roleCopy}>
                <p className={styles.eyebrow}>{session?.user.role}</p>
                <h2>{roleContent.title}</h2>
                <p>{roleContent.summary}</p>
              </div>
              <div className={styles.roleAside}>
                <div className={styles.roleStats}>
                  {roleContent.stats.map((stat) => (
                    <span key={stat}>{stat}</span>
                  ))}
                </div>
                <div className={styles.roleActions}>
                  <button
                    className={`${actions.action} ${actions.primary} ${styles.primaryOnDark}`}
                    type="button"
                  >
                    {roleContent.primary}
                  </button>
                  <button
                    className={`${actions.action} ${actions.secondary} ${styles.secondaryOnDark}`}
                    type="button"
                  >
                    {roleContent.secondary}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.roleCopy}>
                <p className={styles.eyebrow}>Sessao publica</p>
                <h2>Entre para abrir a Home do seu papel.</h2>
                <p>
                  Organizador, Cliente e Portaria recebem chamadas e estados
                  diferentes, mantendo as rotas publicas livres para navegacao.
                </p>
              </div>
              <div className={styles.roleAside}>
                <Link
                  className={`${actions.action} ${actions.primary} ${styles.primaryOnDark}`}
                  href="/login"
                >
                  Acessar login
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
