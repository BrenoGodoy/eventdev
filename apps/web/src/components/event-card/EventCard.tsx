import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import {
  CatalogEvent,
  formatEventDate,
  formatEventPrice,
  formatEventTime,
} from "../../lib/events";
import styles from "./EventCard.module.css";

type EventCardProps = {
  event: CatalogEvent;
  showInventory?: boolean;
  href?: string | null;
  actions?: ReactNode;
};

const statusLabels = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  CANCELED: "Cancelado",
  FINISHED: "Finalizado",
};

export function EventCard({
  event,
  showInventory = false,
  href,
  actions,
}: EventCardProps) {
  const resolvedHref =
    href === undefined ? `/eventos/${event.slug}` : href;
  const content = (
    <>
      <div className={styles.imageFrame}>
        <Image
          alt={event.imageAlt}
          className={styles.image}
          fill
          sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, (max-width: 1320px) 33vw, 260px"
          src={event.imageUrl}
        />
        <span className={styles.category}>{event.category}</span>
        {showInventory && (
          <span className={styles.status}>{statusLabels[event.status]}</span>
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h2>{event.title}</h2>
          <strong>{formatEventPrice(event.price)}</strong>
        </div>
        <p className={styles.meta}>
          <MapPin aria-hidden="true" size={17} />
          <span>
            {event.venue} · {event.city}, {event.state}
          </span>
        </p>
        <p className={styles.meta}>
          <CalendarDays aria-hidden="true" size={17} />
          <span>
            {formatEventDate(event.date)} · {formatEventTime(event.date)}
          </span>
        </p>
        {showInventory && (
          <p className={`${styles.meta} ${styles.inventory}`}>
            <Ticket aria-hidden="true" size={17} />
            <span>
              {event.availableQuantity} de {event.capacity} disponíveis
            </span>
          </p>
        )}
      </div>
    </>
  );

  return (
    <article className={styles.card}>
      {resolvedHref ? (
        <Link
          aria-label={`Ver detalhes de ${event.title}`}
          className={styles.link}
          href={resolvedHref}
        >
          {content}
        </Link>
      ) : (
        <div className={styles.staticContent}>{content}</div>
      )}
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  );
}
