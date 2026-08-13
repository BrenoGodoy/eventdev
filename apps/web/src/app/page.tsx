"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { FeaturedCarousel } from "../components/featured-carousel/FeaturedCarousel";
import { SiteHeader } from "../components/site-header/SiteHeader";
import actions from "../components/ui/Action.module.css";
import { roleNavigation } from "../lib/role-navigation";
import { useAuthSession } from "../lib/use-auth-session";
import styles from "./page.module.css";

const roleHome = {
  ORGANIZER: {
    title: "Painel do organizador",
    summary: "Publique eventos a partir do catalogo e acompanhe estoque, receita e check-ins.",
    stats: ["Catalogo integrado", "R$ 18.420 receita", "74% ocupacao"],
    primary: "Novo evento",
    primaryHref: "/organizador/eventos/novo",
    secondary: "Meus eventos",
    secondaryHref: "/organizador/eventos",
  },
  CUSTOMER: {
    title: "Home do cliente",
    summary: "Explore eventos publicados, reserve lugares e acompanhe seus ingressos.",
    stats: ["Eventos publicados", "1 ticket ativo", "Checkout demo"],
    primary: "Explorar eventos",
    primaryHref: "/eventos",
    secondary: "Meus ingressos",
    secondaryHref: "/meus-ingressos",
  },
  GATE: {
    title: "Console da portaria",
    summary: "Valide QR ou codigo manual com retorno grande, direto e auditavel.",
    stats: ["Scanner mobile-first", "Codigo manual", "Historico local"],
    primary: "Abrir scanner",
    primaryHref: "#painel",
    secondary: "Ultimas leituras",
    secondaryHref: "#painel",
  },
};

export default function HomePage() {
  const { session, isReady, logout } = useAuthSession();

  const roleContent = useMemo(() => {
    if (!session) {
      return null;
    }

    return roleHome[session.user.role];
  }, [session]);

  const navigationContent = session
    ? roleNavigation[session.user.role]
    : null;

  return (
    <main className={styles.page}>
      <SiteHeader onLogout={logout} session={session} />

      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroMedia}>
          <Image
            alt="Amigos celebrando em um evento com palco violeta e iluminacao verde acido"
            className={styles.heroImage}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 48vw"
            src="/home/elite-experiences.png"
          />
          <div className={styles.heroBadge}>
            <span>Elite selection</span>
            <strong>ED</strong>
          </div>
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Seu proximo evento comeca aqui</p>
          <h1 id="home-title">
            Eventos para <span className={styles.violetWord}>viver</span>,
            historias para <span className={styles.acidWord}>lembrar</span>.
          </h1>
          <p>
            Descubra shows, festivais, cinema e experiencias que aproximam
            pessoas. Da escolha do evento ate a entrada, tudo em uma so jornada.
          </p>
          <div className={styles.heroActions}>
            <Link
              className={`${actions.action} ${actions.primary}`}
              href="/eventos"
            >
              Eventos em destaque
            </Link>
            {session && navigationContent ? (
              <Link
                className={`${actions.action} ${actions.secondary}`}
                href={navigationContent.href}
              >
                {navigationContent.label}
              </Link>
            ) : (
              <Link
                className={`${actions.action} ${actions.secondary}`}
                href="/login"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </section>

      <FeaturedCarousel />

      <section
        className={styles.roleSection}
        id="painel"
        aria-live="polite"
      >
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
                  <Link
                    className={`${actions.action} ${actions.primary} ${styles.primaryOnDark}`}
                    href={roleContent.primaryHref}
                  >
                    {roleContent.primary}
                  </Link>
                  <Link
                    className={`${actions.action} ${actions.secondary} ${styles.secondaryOnDark}`}
                    href={roleContent.secondaryHref}
                  >
                    {roleContent.secondary}
                  </Link>
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
