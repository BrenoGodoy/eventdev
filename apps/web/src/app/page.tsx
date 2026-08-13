"use client";

import Image from "next/image";
import Link from "next/link";
import { FeaturedCarousel } from "../components/featured-carousel/FeaturedCarousel";
import { RoleHome } from "../components/role-home/RoleHome";
import { SiteHeader } from "../components/site-header/SiteHeader";
import actions from "../components/ui/Action.module.css";
import { roleNavigation } from "../lib/role-navigation";
import { useAuthSession } from "../lib/use-auth-session";
import styles from "./page.module.css";

export default function HomePage() {
  const { session, isReady, logout } = useAuthSession();
  const navigationContent = session ? roleNavigation[session.user.role] : null;

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
      <RoleHome isReady={isReady} session={session} />
    </main>
  );
}
