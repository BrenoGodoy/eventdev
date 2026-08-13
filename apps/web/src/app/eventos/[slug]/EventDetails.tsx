"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  Ticket,
} from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { SiteHeader } from "../../../components/site-header/SiteHeader";
import {
  CatalogEvent,
  EventNotFoundError,
  fetchEventBySlug,
  formatEventDate,
  formatEventPrice,
  formatEventTime,
} from "../../../lib/events";
import { useAuthSession } from "../../../lib/use-auth-session";
import styles from "./page.module.css";

type EventDetailsProps = {
  slug: string;
};

export function EventDetails({ slug }: EventDetailsProps) {
  const { session, logout } = useAuthSession();
  const [event, setEvent] = useState<CatalogEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"not-found" | "request" | "">("");

  useEffect(() => {
    const controller = new AbortController();

    fetchEventBySlug(slug, controller.signal)
      .then((response) => setEvent(response.event))
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof EventNotFoundError ? "not-found" : "request",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug]);

  return (
    <main className={styles.page}>
      <SiteHeader onLogout={logout} session={session} />

      {isLoading ? (
        <div className={styles.status} role="status">
          Carregando evento...
        </div>
      ) : error || !event ? (
        <section className={styles.status} role={error === "request" ? "alert" : undefined}>
          <p className={styles.eyebrow}>EventDev</p>
          <h1>
            {error === "not-found"
              ? "Evento nao encontrado"
              : "Nao foi possivel carregar o evento"}
          </h1>
          <p>
            {error === "not-found"
              ? "Este evento nao existe ou nao esta publicado."
              : "Tente novamente em alguns instantes."}
          </p>
          <Link className={styles.backButton} href="/eventos">
            <ArrowLeft aria-hidden="true" size={19} />
            Voltar aos eventos
          </Link>
        </section>
      ) : (
        <>
          <section className={styles.hero} aria-labelledby="event-title">
            <div className={styles.heroInner}>
              <div className={styles.posterFrame}>
                <Image
                  alt={event.imageAlt}
                  className={styles.poster}
                  fill
                  priority
                  sizes="(max-width: 760px) calc(100vw - 2.5rem), (max-width: 1100px) 42vw, 460px"
                  src={event.imageUrl}
                />
              </div>

              <div className={styles.summary}>
                <Link className={styles.backLink} href="/eventos">
                  <ArrowLeft aria-hidden="true" size={18} />
                  Todos os eventos
                </Link>
                <p className={styles.eyebrow}>{event.category}</p>
                <h1 id="event-title">{event.title}</h1>
                <div className={styles.metadata}>
                  <p>
                    <CalendarDays aria-hidden="true" size={22} />
                    <span>
                      <strong>{formatEventDate(event.date)}</strong>
                      {formatEventTime(event.date)}
                    </span>
                  </p>
                  <p>
                    <MapPin aria-hidden="true" size={22} />
                    <span>
                      <strong>{event.venue}</strong>
                      {event.city}, {event.state}
                    </span>
                  </p>
                </div>
                <div className={styles.purchaseRow}>
                  <div className={styles.price}>
                    <Ticket aria-hidden="true" size={21} />
                    <span>
                      A partir de
                      <strong>{formatEventPrice(event.price)}</strong>
                    </span>
                  </div>
                  <Link
                    aria-label={`Comprar ingresso para ${event.title}`}
                    className={styles.buyButton}
                    href={session ? "/#painel" : "/login"}
                  >
                    Comprar ingresso
                    <ArrowRight aria-hidden="true" size={20} />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section
            className={styles.description}
            id="descricao"
            aria-labelledby="description-title"
          >
            <p className={styles.eyebrow}>Conheca a experiencia</p>
            <h2 id="description-title">Sobre o evento</h2>
            <div className={styles.markdown}>
              <ReactMarkdown>{event.description}</ReactMarkdown>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
