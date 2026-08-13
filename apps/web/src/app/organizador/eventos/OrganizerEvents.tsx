"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { EventCard } from "../../../components/event-card/EventCard";
import { SiteHeader } from "../../../components/site-header/SiteHeader";
import actions from "../../../components/ui/Action.module.css";
import { CatalogEvent } from "../../../lib/events";
import { fetchOrganizerEvents } from "../../../lib/organizer-events";
import { useOrganizerSession } from "../../../lib/use-organizer-session";
import styles from "./page.module.css";

export function OrganizerEvents() {
  const searchParams = useSearchParams();
  const { session, isReady, isOrganizer, logout } = useOrganizerSession();
  const [events, setEvents] = useState<CatalogEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const wasCreated = searchParams.get("created") === "1";

  useEffect(() => {
    if (!session || !isOrganizer) {
      return;
    }

    const controller = new AbortController();

    fetchOrganizerEvents(session.token, controller.signal)
      .then((response) => setEvents(response.events))
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Nao foi possivel carregar seus eventos.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [isOrganizer, session]);

  if (!isReady || !isOrganizer || !session) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Preparando painel...</div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <SiteHeader onLogout={logout} session={session} />

      <section className={styles.catalog} aria-labelledby="my-events-title">
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Painel do organizador</p>
            <h1 id="my-events-title">Meus eventos</h1>
            <p>Eventos publicados por {session.user.name}.</p>
          </div>
          <Link
            className={`${actions.action} ${actions.primary} ${styles.createAction}`}
            href="/organizador/eventos/novo"
          >
            <Plus aria-hidden="true" size={19} />
            Criar evento
          </Link>
        </div>

        {wasCreated && (
          <div className={styles.success} role="status">
            <CheckCircle2 aria-hidden="true" size={20} />
            Evento publicado e disponivel no catalogo.
          </div>
        )}

        <div className={styles.resultsRow}>
          <h2>Catalogo do organizador</h2>
          {!isLoading && !error && (
            <span>
              {events.length} {events.length === 1 ? "evento" : "eventos"}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className={styles.loading}>Carregando seus eventos...</div>
        ) : error ? (
          <div className={styles.status} role="alert">
            <strong>Painel indisponivel</strong>
            <p>{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className={styles.status}>
            <strong>Nenhum evento publicado</strong>
            <p>Escolha uma atracao e publique seu primeiro evento.</p>
            <Link
              className={`${actions.action} ${actions.primary}`}
              href="/organizador/eventos/novo"
            >
              Criar evento
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {events.map((event) => (
              <EventCard event={event} key={event.id} showInventory />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
