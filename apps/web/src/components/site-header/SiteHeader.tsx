"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, LogOut, Search } from "lucide-react";
import { AuthSession } from "../../lib/auth";
import { roleNavigation } from "../../lib/role-navigation";
import { Brand } from "../brand/Brand";
import actions from "../ui/Action.module.css";
import styles from "./SiteHeader.module.css";

type SiteHeaderProps = {
  session: AuthSession | null;
  onLogout: () => void;
  initialQuery?: string;
};

export function SiteHeader({
  session,
  onLogout,
  initialQuery = "",
}: SiteHeaderProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(initialQuery);
  const navigationContent = session
    ? roleNavigation[session.user.role]
    : null;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchValue.trim();
    router.push(query ? `/eventos?query=${encodeURIComponent(query)}` : "/eventos");
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Brand />
        <form className={styles.searchForm} onSubmit={handleSearch} role="search">
          <Search aria-hidden="true" size={20} strokeWidth={2.2} />
          <input
            aria-label="Buscar eventos"
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Busque por evento, categoria ou cidade"
            type="search"
            value={searchValue}
          />
          <button aria-label="Buscar" type="submit">
            <span>Buscar</span>
            <ArrowRight
              aria-hidden="true"
              className={styles.searchArrow}
              size={19}
            />
          </button>
        </form>
        <nav className={styles.nav} aria-label="Navegacao principal">
          <Link className={styles.eventsLink} href="/eventos">
            <CalendarDays aria-hidden="true" size={19} />
            Eventos
          </Link>
          {session ? (
            <>
              <Link className={styles.profile} href="/#painel">
                <Image
                  alt={`Perfil de ${session.user.name}`}
                  className={styles.profileImage}
                  height={40}
                  src={navigationContent?.profileImage ?? "/profiles/customer.png"}
                  width={40}
                />
                <span className={styles.sessionName}>{session.user.name}</span>
              </Link>
              <button
                className={styles.logoutButton}
                onClick={onLogout}
                type="button"
              >
                <LogOut aria-hidden="true" size={18} />
                <span>Sair</span>
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
  );
}
