import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import {
  CatalogEvent,
  formatEventDate,
  formatEventPrice,
  formatEventTime,
} from "../../lib/events";
import styles from "./EventCard.module.css";

type EventCardProps = {
  event: CatalogEvent;
};

export function EventCard({ event }: EventCardProps) {
  return (
    <article className={styles.card}>
      <Link
        aria-label={`Ver detalhes de ${event.title}`}
        className={styles.link}
        href={`/eventos/${event.slug}`}
      >
        <div className={styles.imageFrame}>
          <Image
            alt={event.imageAlt}
            className={styles.image}
            fill
            sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, (max-width: 1320px) 33vw, 260px"
            src={event.imageUrl}
          />
          <span className={styles.category}>{event.category}</span>
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
        </div>
      </Link>
    </article>
  );
}
