"use client";

import Image from "next/image";
import { Clock3, MapPin, QrCode } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CatalogEvent,
  fetchFeaturedEvents,
  formatEventPrice,
  formatEventTime,
} from "../../lib/events";
import styles from "./EventTicket.module.css";

const ROTATION_INTERVAL_MS = 5500;

type EventTicketData = Pick<
  CatalogEvent,
  | "id"
  | "title"
  | "category"
  | "date"
  | "venue"
  | "city"
  | "state"
  | "imageUrl"
  | "imageAlt"
  | "price"
>;

type EventTicketProps = {
  events?: EventTicketData[];
};

const fallbackEvent: EventTicketData = {
  id: "eventdev-selection",
  title: "Experiências que ficam na memória",
  category: "Seleção EventDev",
  date: "2026-08-24T23:00:00.000Z",
  venue: "EventDev Stage",
  city: "São Paulo",
  state: "SP",
  imageUrl: "/home/elite-experiences.png",
  imageAlt: "Pessoas celebrando em um evento EventDev",
  price: 0,
};

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

const yearFormatter = new Intl.DateTimeFormat("pt-BR", {
  year: "numeric",
  timeZone: "UTC",
});

export function EventTicket({ events: providedEvents }: EventTicketProps) {
  const [featuredEvents, setFeaturedEvents] = useState<EventTicketData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (providedEvents) {
      return;
    }

    const controller = new AbortController();

    fetchFeaturedEvents(controller.signal)
      .then(({ events }) => setFeaturedEvents(events.slice(0, 3)))
      .catch(() => {
        if (!controller.signal.aborted) {
          setFeaturedEvents([]);
        }
      });

    return () => controller.abort();
  }, [providedEvents]);

  const events = useMemo(
    () => (providedEvents ?? featuredEvents).slice(0, 3),
    [featuredEvents, providedEvents],
  );

  useEffect(() => {
    if (events.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % events.length);
    }, ROTATION_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [events.length]);

  const safeActiveIndex = events.length ? activeIndex % events.length : 0;
  const activeEvent = events[safeActiveIndex] ?? fallbackEvent;
  const eventDate = new Date(activeEvent.date);
  const ticketCode = `ED-${String(safeActiveIndex + 1).padStart(2, "0")}-${activeEvent.id.slice(0, 4).toUpperCase()}`;

  return (
    <div className={styles.showcase}>
      <article
        className={styles.ticket}
        key={activeEvent.id}
        aria-label={`Ingresso em destaque para ${activeEvent.title}`}
      >
        <div className={styles.mainSection}>
          <Image
            alt={activeEvent.imageAlt}
            className={styles.image}
            fill
            loading="eager"
            sizes="(max-width: 600px) 70vw, (max-width: 960px) 76vw, 42vw"
            src={activeEvent.imageUrl}
          />
          <div className={styles.imageShade} />

          <div className={styles.ticketHeader}>
            <span className={styles.featuredLabel}>Evento em destaque</span>
            <span className={styles.edition}>ED / 2026</span>
          </div>

          <div className={styles.eventCopy}>
            <p>{activeEvent.category}</p>
            <h2>{activeEvent.title}</h2>
          </div>

          <div className={styles.metadata}>
            <span>
              <MapPin aria-hidden="true" size={17} />
              <span className={styles.locationText}>
                <strong>{activeEvent.venue}</strong>
                {activeEvent.city}, {activeEvent.state}
              </span>
            </span>
            <span>
              <Clock3 aria-hidden="true" size={17} />
              <span>
                <strong>Portas</strong>
                {formatEventTime(activeEvent.date)}
              </span>
            </span>
            <span className={styles.price}>
              <strong>Ingresso</strong>
              {activeEvent.price === 0
                ? "Gratuito"
                : formatEventPrice(activeEvent.price)}
            </span>
          </div>
        </div>

        <aside className={styles.stub} aria-hidden="true">
          <span className={styles.accessLabel}>EventDev access</span>

          <div className={styles.ticketDate}>
            <span>
              {monthFormatter
                .format(eventDate)
                .replaceAll(".", "")
                .toUpperCase()}
            </span>
            <strong>{dayFormatter.format(eventDate)}</strong>
            <small>{yearFormatter.format(eventDate)}</small>
          </div>

          <div className={styles.qrFrame}>
            <QrCode size={54} strokeWidth={1.7} />
          </div>

          <div className={styles.ticketNumber}>
            <span>Ticket nº</span>
            <strong>{ticketCode}</strong>
          </div>

          <div className={styles.barcode} />
        </aside>
      </article>

      <div className={styles.ticketFooter}>
        <span>Seleção EventDev</span>
        {events.length > 1 ? (
          <div className={styles.pagination} aria-label="Escolher evento">
            {events.map((event, index) => (
              <button
                aria-label={`Mostrar ${event.title}`}
                aria-pressed={index === safeActiveIndex}
                className={
                  index === safeActiveIndex ? styles.activePage : ""
                }
                key={event.id}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
