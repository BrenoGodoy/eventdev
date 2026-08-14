"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Plus,
  TicketCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AuthSession } from "../../lib/auth";
import { CatalogEvent } from "../../lib/events";
import { fetchOrganizerEvents } from "../../lib/organizer-events";
import styles from "./RoleHome.module.css";
import {
  BlockHeading,
  EmptyBlock,
  integerFormatter,
  LoadState,
  Metric,
  OrganizerEventRow,
  organizerAlerts,
  RoleHomeStatus,
} from "./RoleHomeShared";

export function OrganizerHome({ session }: { session: AuthSession }) {
  const [events, setEvents] = useState<CatalogEvent[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const [referenceTime] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    fetchOrganizerEvents(session.token, controller.signal)
      .then((response) => {
        setEvents(response.events);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [session.token]);

  if (status !== "ready") {
    return (
      <RoleHomeStatus
        error={status === "error"}
        eyebrow="Central do organizador"
        title="Preparando seus eventos"
      />
    );
  }

  const publishedEvents = events.filter((event) => event.status === "PUBLISHED");
  const upcomingEvents = publishedEvents
    .filter((event) => new Date(event.date).getTime() >= referenceTime)
    .sort(
      (left, right) =>
        new Date(left.date).getTime() - new Date(right.date).getTime(),
    );
  const totalCapacity = publishedEvents.reduce(
    (total, event) => total + event.capacity,
    0,
  );
  const allocated = publishedEvents.reduce(
    (total, event) =>
      total + Math.max(0, event.capacity - event.availableQuantity),
    0,
  );
  const occupancy = totalCapacity
    ? Math.round((allocated / totalCapacity) * 100)
    : 0;
  const alerts = organizerAlerts(upcomingEvents);

  return (
    <section
      className={styles.section}
      id="painel"
      aria-labelledby="organizer-home-title"
    >
      <div className={styles.inner}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Central do organizador</p>
            <h2 id="organizer-home-title">Seus eventos, em movimento.</h2>
          </div>
          <Link className={styles.textLink} href="/organizador/eventos">
            Ver todos <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>

        <div className={styles.organizerOverview}>
          <div className={styles.overviewCopy}>
            <p className={styles.darkEyebrow}>Visao geral</p>
            <h3>
              {publishedEvents.length
                ? `${publishedEvents.length} eventos publicados`
                : "Seu primeiro evento está a uma busca de distância."}
            </h3>
            <p>
              {publishedEvents.length
                ? `${integerFormatter.format(allocated)} ingressos já estão alocados da capacidade publicada.`
                : "Busque uma atração, complete os dados da produção e publique no catálogo."}
            </p>
            <div className={styles.leadActions}>
              <Link
                className={styles.acidAction}
                href="/organizador/eventos/novo"
              >
                <Plus aria-hidden="true" size={18} /> Criar evento
              </Link>
              <Link
                className={styles.darkSecondaryAction}
                href="/organizador/eventos"
              >
                Meus eventos
              </Link>
            </div>
          </div>
          <div className={styles.overviewMetrics}>
            <Metric
              dark
              icon={CalendarDays}
              label="Publicados"
              value={publishedEvents.length}
            />
            <Metric
              dark
              icon={TicketCheck}
              label="Ingressos alocados"
              value={allocated}
            />
            <Metric
              dark
              icon={Users}
              label="Ocupação atual"
              value={`${occupancy}%`}
            />
          </div>
        </div>

        <div className={styles.operationsGrid}>
          <section className={styles.listBlock}>
            <BlockHeading eyebrow="Agenda" title="Próximos eventos" />
            {upcomingEvents.length ? (
              <div className={styles.operationList}>
                {upcomingEvents.slice(0, 4).map((event) => (
                  <OrganizerEventRow event={event} key={event.id} />
                ))}
              </div>
            ) : (
              <EmptyBlock
                href="/organizador/eventos/novo"
                label="Criar evento"
                text="Nenhum evento futuro publicado."
              />
            )}
          </section>

          <aside className={styles.alertBlock}>
            <BlockHeading eyebrow="Atencao" title="Alertas operacionais" />
            <div className={styles.alertList}>
              {alerts.map((alert) => (
                <div className={styles.alertItem} key={alert.title}>
                  <alert.icon aria-hidden="true" size={19} />
                  <span>
                    <strong>{alert.title}</strong>
                    {alert.detail}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
