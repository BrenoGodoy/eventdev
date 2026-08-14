"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Sparkles,
  TicketCheck,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuthSession } from "../../lib/auth";
import { EventTicket, fetchMyTickets } from "../../lib/checkout";
import {
  CatalogEvent,
  fetchEvents,
  formatEventDate,
  formatEventTime,
} from "../../lib/events";
import styles from "./RoleHome.module.css";
import {
  CompactEventList,
  EventCollection,
  firstName,
  LoadState,
  Metric,
  RoleHomeStatus,
} from "./RoleHomeShared";

export function CustomerHome({ session }: { session: AuthSession }) {
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [events, setEvents] = useState<CatalogEvent[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const [referenceTime] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetchMyTickets(session.token, controller.signal),
      fetchEvents({}, controller.signal),
    ])
      .then(([ticketResponse, eventResponse]) => {
        setTickets(ticketResponse.tickets);
        setEvents(eventResponse.events);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [session.token]);

  const activeTickets = useMemo(
    () =>
      tickets
        .filter(
          (ticket) =>
            ticket.status === "ACTIVE" &&
            new Date(ticket.event.date).getTime() >= referenceTime,
        )
        .sort(
          (left, right) =>
            new Date(left.event.date).getTime() -
            new Date(right.event.date).getTime(),
        ),
    [referenceTime, tickets],
  );
  const uniqueActiveTickets = Array.from(
    new Map(activeTickets.map((ticket) => [ticket.event.id, ticket])).values(),
  );
  const nextTicket = uniqueActiveTickets[0];
  const ownedEventIds = new Set(activeTickets.map((ticket) => ticket.event.id));
  const preferredState = nextTicket?.event.state;
  const availableEvents = events.filter(
    (event) =>
      new Date(event.date).getTime() >= referenceTime &&
      !ownedEventIds.has(event.id),
  );
  const nearbyEvents = preferredState
    ? availableEvents.filter((event) => event.state === preferredState).slice(0, 3)
    : [];
  const nearbyIds = new Set(nearbyEvents.map((event) => event.id));
  const recommendations = availableEvents
    .filter((event) => !nearbyIds.has(event.id))
    .slice(0, 3);

  if (status !== "ready") {
    return (
      <RoleHomeStatus
        error={status === "error"}
        eyebrow="Sua EventDev"
        title="Sua agenda esta chegando"
      />
    );
  }

  return (
    <section
      className={styles.section}
      id="painel"
      aria-labelledby="customer-home-title"
    >
      <div className={styles.inner}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Sua EventDev</p>
            <h2 id="customer-home-title">Olá, {firstName(session.user.name)}.</h2>
          </div>
          <Link className={styles.textLink} href="/meus-ingressos">
            Meus ingressos <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>

        <div className={styles.customerLead}>
          <article className={styles.spotlight}>
            {nextTicket ? (
              <>
                <Image
                  alt={nextTicket.event.imageAlt}
                  className={styles.spotlightImage}
                  fill
                  sizes="(max-width: 760px) 100vw, 58vw"
                  src={nextTicket.event.imageUrl}
                />
                <div className={styles.spotlightShade} />
                <div className={styles.spotlightContent}>
                  <p>
                    <Sparkles aria-hidden="true" size={16} /> Sua proxima
                    experiencia
                  </p>
                  <h3>{nextTicket.event.title}</h3>
                  <div className={styles.spotlightMeta}>
                    <span>
                      <CalendarDays aria-hidden="true" size={17} />
                      {formatEventDate(nextTicket.event.date)} ·{" "}
                      {formatEventTime(nextTicket.event.date)}
                    </span>
                    <span>
                      <MapPin aria-hidden="true" size={17} />
                      {nextTicket.event.venue} · {nextTicket.event.state}
                    </span>
                  </div>
                  <Link className={styles.acidAction} href="/meus-ingressos">
                    <TicketCheck aria-hidden="true" size={18} /> Abrir ingresso
                  </Link>
                </div>
              </>
            ) : (
              <div className={styles.emptySpotlight}>
                <WalletCards aria-hidden="true" size={34} />
                <p className={styles.darkEyebrow}>Sua agenda</p>
                <h3>Sua próxima história começa por aqui.</h3>
                <p>Encontre uma experiência e leve seu ingresso no celular.</p>
                <Link className={styles.acidAction} href="/eventos">
                  Explorar eventos <ArrowRight aria-hidden="true" size={18} />
                </Link>
              </div>
            )}
          </article>

          <div className={styles.metrics}>
            <Metric
              icon={TicketCheck}
              label="Ingressos ativos"
              value={activeTickets.length}
            />
            <Metric
              icon={CalendarDays}
              label="Eventos na agenda"
              value={uniqueActiveTickets.length}
            />
            <Metric
              icon={CheckCircle2}
              label="Experiencias vividas"
              value={tickets.filter((ticket) => ticket.status === "USED").length}
            />
          </div>
        </div>

        <div className={styles.discoveryGrid}>
          <EventCollection
            description="Novas experiências publicadas para continuar explorando."
            events={recommendations}
            eyebrow="Escolhas para voce"
            title="Eventos para viver"
          />
        </div>
      </div>
    </section>
  );
}
