"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";
import { EventCard } from "../../../components/event-card/EventCard";
import { SiteHeader } from "../../../components/site-header/SiteHeader";
import actions from "../../../components/ui/Action.module.css";
import { CatalogEvent } from "../../../lib/events";
import {
  cancelOrganizerEvent,
  fetchOrganizerEvents,
} from "../../../lib/organizer-events";
import { useOrganizerSession } from "../../../lib/use-organizer-session";
import styles from "./page.module.css";

export function OrganizerEvents() {
  const searchParams = useSearchParams();
  const { session, isReady, isOrganizer, logout } = useOrganizerSession();
  const [events, setEvents] = useState<CatalogEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventToCancel, setEventToCancel] = useState<CatalogEvent | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const wasCreated = searchParams.get("created") === "1";
  const wasUpdated = searchParams.get("updated") === "1";

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
            : "Não foi possível carregar seus eventos.",
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

  async function handleCancel() {
    if (!eventToCancel || !session) {
      return;
    }

    setIsCanceling(true);
    setError("");

    try {
      const { event } = await cancelOrganizerEvent(
        eventToCancel.id,
        session.token,
      );
      setEvents((current) =>
        current.map((item) => (item.id === event.id ? event : item)),
      );
      setActionNotice(
        `${event.title} foi cancelado e removido do catálogo público.`,
      );
      setEventToCancel(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível cancelar o evento.",
      );
    } finally {
      setIsCanceling(false);
    }
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

        {(wasCreated || wasUpdated || actionNotice) && (
          <div className={styles.success} role="status">
            <CheckCircle2 aria-hidden="true" size={20} />
            {actionNotice ||
              (wasUpdated
                ? "Alterações salvas e catálogo atualizado."
                : "Evento publicado e disponível no catálogo.")}
          </div>
        )}

        <div className={styles.resultsRow}>
          <h2>Catálogo do organizador</h2>
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
            <strong>Painel indisponível</strong>
            <p>{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className={styles.status}>
            <strong>Nenhum evento publicado</strong>
            <p>Escolha uma atração e publique seu primeiro evento.</p>
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
              <EventCard
                actions={
                  event.status === "CANCELED" || event.status === "FINISHED" ? (
                    <span className={styles.closedEvent}>
                      Gerenciamento encerrado
                    </span>
                  ) : (
                    <>
                      <Link
                        aria-label={`Editar ${event.title}`}
                        className={styles.cardAction}
                        href={`/organizador/eventos/${event.id}/editar`}
                      >
                        <Pencil aria-hidden="true" size={16} />
                        Editar
                      </Link>
                      {event.status === "PUBLISHED" && (
                        <Link
                          aria-label={`Abrir página pública de ${event.title}`}
                          className={styles.iconAction}
                          href={`/eventos/${event.slug}`}
                          title="Abrir página pública"
                        >
                          <ExternalLink aria-hidden="true" size={17} />
                        </Link>
                      )}
                      <button
                        aria-label={`Cancelar ${event.title}`}
                        className={styles.cancelAction}
                        onClick={() => setEventToCancel(event)}
                        type="button"
                      >
                        <Ban aria-hidden="true" size={16} />
                        Cancelar
                      </button>
                    </>
                  )
                }
                event={event}
                href={event.status === "PUBLISHED" ? undefined : null}
                key={event.id}
                showInventory
              />
            ))}
          </div>
        )}
      </section>

      {eventToCancel && (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-describedby="cancel-event-description"
            aria-labelledby="cancel-event-title"
            aria-modal="true"
            className={styles.modal}
            role="dialog"
          >
            <button
              aria-label="Fechar confirmação"
              className={styles.closeModal}
              disabled={isCanceling}
              onClick={() => setEventToCancel(null)}
              type="button"
            >
              <X aria-hidden="true" size={20} />
            </button>
            <TriangleAlert aria-hidden="true" className={styles.modalIcon} />
            <h2 id="cancel-event-title">Cancelar este evento?</h2>
            <p id="cancel-event-description">
              <strong>{eventToCancel.title}</strong> sairá do catálogo. Reservas
              abertas serão encerradas, ingressos serão cancelados e pagamentos
              aprovados ficarão marcados como reembolsados. Esta ação não pode
              ser desfeita.
            </p>
            <div className={styles.modalActions}>
              <button
                className={`${actions.action} ${actions.secondary}`}
                disabled={isCanceling}
                onClick={() => setEventToCancel(null)}
                type="button"
              >
                Manter evento
              </button>
              <button
                className={`${actions.action} ${actions.danger}`}
                disabled={isCanceling}
                onClick={handleCancel}
                type="button"
              >
                {isCanceling ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
