"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { CatalogEvent, fetchEvents } from "../../lib/events";
import styles from "./RoleHome.module.css";
import { CompactEventRow } from "./RoleHomeShared";

export function PublicHome() {
  const [events, setEvents] = useState<CatalogEvent[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchEvents({}, controller.signal)
      .then((response) => setEvents(response.events.slice(0, 3)))
      .catch(() => setEvents([]));
    return () => controller.abort();
  }, []);

  return (
    <section
      className={styles.section}
      id="painel"
      aria-labelledby="public-home-title"
    >
      <div className={styles.inner}>
        <div className={styles.publicOverview}>
          <div className={styles.overviewCopy}>
            <p className={styles.darkEyebrow}>Continue explorando</p>
            <h2 id="public-home-title">Encontre um evento com a sua energia.</h2>
            <p>Veja as próximas datas ou entre para acessar sua área EventDev.</p>
            <div className={styles.leadActions}>
              <Link className={styles.acidAction} href="/eventos">
                Ver catálogo <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link className={styles.darkSecondaryAction} href="/login">
                Entrar
              </Link>
            </div>
          </div>
          <div className={styles.publicEvents}>
            {events.map((event) => (
              <CompactEventRow event={event} key={event.id} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
