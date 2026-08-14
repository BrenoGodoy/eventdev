import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleX,
  Clock3,
  Plus,
  Sparkles,
} from "lucide-react";
import { CatalogEvent, formatEventDate, formatEventTime } from "../../lib/events";
import { GateCheck, GateEvent } from "../../lib/gate";
import styles from "./RoleHome.module.css";

export type LoadState = "loading" | "ready" | "error";

export const integerFormatter = new Intl.NumberFormat("pt-BR");

export function EventCollection({
  description,
  events,
  eyebrow,
  title,
}: {
  description: string;
  events: CatalogEvent[];
  eyebrow: string;
  title: string;
}) {
  return (
    <section className={styles.collection}>
      <div className={styles.collectionHeading}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h3>{title}</h3>
          <span>{description}</span>
        </div>
        <Link aria-label="Ver todos os eventos" href="/eventos">
          <ArrowRight aria-hidden="true" size={19} />
        </Link>
      </div>
      {events.length ? (
        <div className={styles.eventTiles}>
          {events.map((event) => (
            <EventTile event={event} key={event.id} />
          ))}
        </div>
      ) : (
        <EmptyBlock
          href="/eventos"
          label="Ver catálogo"
          text="Novos eventos aparecerão aqui em breve."
        />
      )}
    </section>
  );
}

export function CompactEventList({
  emptyText,
  events,
  eyebrow,
  title,
}: {
  emptyText: string;
  events: CatalogEvent[];
  eyebrow: string;
  title: string;
}) {
  return (
    <aside className={styles.compactBlock}>
      <BlockHeading eyebrow={eyebrow} title={title} />
      {events.length ? (
        <div className={styles.compactList}>
          {events.map((event) => (
            <CompactEventRow event={event} key={event.id} />
          ))}
        </div>
      ) : (
        <EmptyBlock href="/eventos" label="Explorar eventos" text={emptyText} />
      )}
    </aside>
  );
}

function EventTile({ event }: { event: CatalogEvent }) {
  return (
    <article className={styles.eventTile}>
      <Link href={`/eventos/${event.slug}`}>
        <div className={styles.tileImage}>
          <Image
            alt={event.imageAlt}
            fill
            sizes="(max-width: 700px) 100vw, 240px"
            src={event.imageUrl}
          />
        </div>
        <p>
          {formatEventDate(event.date)} · {event.state}
        </p>
        <h4>{event.title}</h4>
      </Link>
    </article>
  );
}

export function CompactEventRow({ event }: { event: CatalogEvent }) {
  return (
    <Link className={styles.compactRow} href={`/eventos/${event.slug}`}>
      <div className={styles.compactImage}>
        <Image alt="" fill sizes="72px" src={event.imageUrl} />
      </div>
      <span>
        <strong>{event.title}</strong>
        <small>
          {formatEventDate(event.date)} · {event.city}, {event.state}
        </small>
      </span>
      <ArrowRight aria-hidden="true" size={17} />
    </Link>
  );
}

export function OrganizerEventRow({ event }: { event: CatalogEvent }) {
  const allocated = Math.max(0, event.capacity - event.availableQuantity);
  const percentage = event.capacity
    ? Math.round((allocated / event.capacity) * 100)
    : 0;

  return (
    <Link className={styles.operationRow} href={`/eventos/${event.slug}`}>
      <DateBadge date={event.date} />
      <span className={styles.operationInfo}>
        <strong>{event.title}</strong>
        <small>
          {event.venue} · {event.state}
        </small>
      </span>
      <Progress label={`${percentage}% alocado`} percentage={percentage} />
      <ArrowRight aria-hidden="true" size={18} />
    </Link>
  );
}

export function GateEventRow({ event }: { event: GateEvent }) {
  const occupancy = event.issuedTickets
    ? Math.round((event.checkedIn / event.issuedTickets) * 100)
    : 0;

  return (
    <Link className={styles.operationRow} href="/portaria">
      <DateBadge date={event.date} />
      <span className={styles.operationInfo}>
        <strong>{event.title}</strong>
        <small>
          {event.venue} · {formatEventTime(event.date)}
        </small>
      </span>
      <Progress
        label={`${event.checkedIn}/${event.issuedTickets} entradas`}
        percentage={occupancy}
      />
      <ArrowRight aria-hidden="true" size={18} />
    </Link>
  );
}

export function GateCheckRow({ check }: { check: GateCheck }) {
  const allowed = check.result === "ALLOWED";
  const labels = {
    ALLOWED: "Autorizada",
    DENIED: "Evento errado",
    DUPLICATE: "Já utilizado",
    INVALID: "Invalida",
  };

  return (
    <div className={styles.historyRow}>
      <span className={allowed ? styles.allowedIcon : styles.deniedIcon}>
        {allowed ? (
          <CheckCircle2 aria-hidden="true" size={18} />
        ) : (
          <CircleX aria-hidden="true" size={18} />
        )}
      </span>
      <span>
        <strong>{labels[check.result]}</strong>
        <small>
          {check.ticket?.owner.name ?? "Código não reconhecido"} ·{" "}
          {check.event.title}
        </small>
      </span>
      <time dateTime={check.createdAt}>
        {new Date(check.createdAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </time>
    </div>
  );
}

export function Metric({
  dark = false,
  icon: Icon,
  label,
  value,
}: {
  dark?: boolean;
  icon: typeof CalendarDays;
  label: string;
  value: number | string;
}) {
  return (
    <div className={`${styles.metric} ${dark ? styles.darkMetric : ""}`}>
      <Icon aria-hidden="true" size={20} />
      <strong>
        {typeof value === "number" ? integerFormatter.format(value) : value}
      </strong>
      <span>{label}</span>
    </div>
  );
}

export function BlockHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className={styles.blockHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h3>{title}</h3>
    </div>
  );
}

export function EmptyBlock({
  href,
  label,
  text,
}: {
  href?: string;
  label?: string;
  text: string;
}) {
  return (
    <div className={styles.emptyBlock}>
      <p>{text}</p>
      {href && label && (
        <Link href={href}>
          {label} <ArrowRight aria-hidden="true" size={16} />
        </Link>
      )}
    </div>
  );
}

export function RoleHomeStatus({
  error,
  eyebrow,
  title,
}: {
  error: boolean;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className={styles.section} id="painel">
      <div className={styles.statusPanel} role={error ? "alert" : "status"}>
        {error ? (
          <AlertTriangle aria-hidden="true" size={28} />
        ) : (
          <Sparkles aria-hidden="true" size={28} />
        )}
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{error ? "Não foi possível carregar esta área." : title}</h2>
        {error && (
          <p>As demais áreas continuam disponíveis pelo menu principal.</p>
        )}
      </div>
    </section>
  );
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function organizerAlerts(events: CatalogEvent[]) {
  if (!events.length) {
    return [
      {
        icon: Plus,
        title: "Catálogo vazio",
        detail: "Publique seu primeiro evento para iniciar a operação.",
      },
    ];
  }

  const alerts: Array<{
    icon: typeof AlertTriangle;
    title: string;
    detail: string;
  }> = [];
  const lowAvailability = events.find(
    (event) =>
      event.capacity > 0 && event.availableQuantity / event.capacity <= 0.2,
  );
  const nextEvent = events[0];

  if (lowAvailability) {
    alerts.push({
      icon: AlertTriangle,
      title: "Baixa disponibilidade",
      detail: `${lowAvailability.title} tem ${lowAvailability.availableQuantity} ingressos disponíveis.`,
    });
  }

  if (nextEvent) {
    alerts.push({
      icon: Clock3,
      title: "Próximo da agenda",
      detail: `${nextEvent.title} acontece em ${formatEventDate(nextEvent.date)}.`,
    });
  }

  alerts.push({
    icon: CheckCircle2,
    title: "Catálogo publicado",
    detail: `${events.length} ${events.length === 1 ? "evento está" : "eventos estão"} visíveis para os clientes.`,
  });

  return alerts;
}

function DateBadge({ date }: { date: string }) {
  const eventDate = new Date(date);

  return (
    <span className={styles.dateBadge}>
      <strong>{eventDate.getUTCDate().toString().padStart(2, "0")}</strong>
      {eventDate
        .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
        .replace(".", "")}
    </span>
  );
}

function Progress({ label, percentage }: { label: string; percentage: number }) {
  return (
    <span className={styles.progressInfo}>
      <small>{label}</small>
      <i>
        <b style={{ width: `${Math.min(100, percentage)}%` }} />
      </i>
    </span>
  );
}
