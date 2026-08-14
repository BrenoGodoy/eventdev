"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import {
  KeyboardEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CatalogEvent,
  fetchFeaturedEvents,
  formatEventDate,
  formatEventPrice,
  formatEventTime,
} from "../../lib/events";
import styles from "./FeaturedCarousel.module.css";

const AUTOPLAY_INTERVAL = 5500;
const SWIPE_THRESHOLD = 42;

function getRelativeOffset(index: number, activeIndex: number, length: number) {
  let offset = index - activeIndex;

  if (offset > Math.floor(length / 2)) {
    offset -= length;
  }

  if (offset < -Math.floor(length / 2)) {
    offset += length;
  }

  return offset;
}

function getPositionClass(offset: number) {
  if (offset === -2) return styles.farLeft;
  if (offset === -1) return styles.left;
  if (offset === 0) return styles.active;
  if (offset === 1) return styles.right;
  return styles.farRight;
}

export function FeaturedCarousel() {
  const [featuredEvents, setFeaturedEvents] = useState<CatalogEvent[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const pointerStartX = useRef<number | null>(null);
  const wasDragged = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchFeaturedEvents(controller.signal)
      .then((response) => setFeaturedEvents(response.events))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        setError("Os eventos em destaque estão temporariamente indisponíveis.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const showNext = useCallback(() => {
    setActiveIndex((current) =>
      featuredEvents.length ? (current + 1) % featuredEvents.length : 0,
    );
  }, [featuredEvents.length]);

  const showPrevious = useCallback(() => {
    setActiveIndex((current) =>
      featuredEvents.length
        ? (current - 1 + featuredEvents.length) % featuredEvents.length
        : 0,
    );
  }, [featuredEvents.length]);

  useEffect(() => {
    if (
      isPaused ||
      featuredEvents.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const autoplayId = window.setInterval(showNext, AUTOPLAY_INTERVAL);
    return () => window.clearInterval(autoplayId);
  }, [featuredEvents.length, isPaused, showNext]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (event.target instanceof Element && event.target.closest("button")) {
      return;
    }

    pointerStartX.current = event.clientX;
    wasDragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPaused(true);
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    if (event.target instanceof Element && event.target.closest("button")) {
      return;
    }

    if (pointerStartX.current === null) return;

    const distance = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    wasDragged.current = Math.abs(distance) >= SWIPE_THRESHOLD;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPaused(
      Boolean(event.currentTarget.parentElement?.contains(document.activeElement)),
    );

    if (Math.abs(distance) < SWIPE_THRESHOLD) return;
    if (distance > 0) showPrevious();
    if (distance < 0) showNext();
  }

  if (isLoading || error || featuredEvents.length === 0) {
    return (
      <section
        className={styles.section}
        id="eventos"
        aria-labelledby="featured-title"
      >
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Seleção Elite</p>
            <h2 id="featured-title">Eventos em destaque</h2>
          </div>
        </div>
        <div className={styles.status} role={error ? "alert" : "status"}>
          {error ||
            (isLoading
              ? "Carregando eventos em destaque..."
              : "Nenhum evento em destaque publicado.")}
        </div>
      </section>
    );
  }

  const activeEvent = featuredEvents[activeIndex] ?? featuredEvents[0];

  return (
    <section
      className={styles.section}
      id="eventos"
      aria-labelledby="featured-title"
      aria-roledescription="carrossel"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
      onFocus={() => setIsPaused(true)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={(event) =>
        setIsPaused(event.currentTarget.contains(document.activeElement))
      }
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Seleção Elite</p>
          <h2 id="featured-title">Eventos em destaque</h2>
        </div>
        <p>{featuredEvents.length} experiências escolhidas para você</p>
      </div>

      <div
        className={styles.stage}
        onDragStart={(event) => event.preventDefault()}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          pointerStartX.current = null;
          wasDragged.current = false;
          setIsPaused(
            Boolean(
              event.currentTarget.parentElement?.contains(
                document.activeElement,
              ),
            ),
          );
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {featuredEvents.map((event, index) => {
          const offset = getRelativeOffset(
            index,
            activeIndex,
            featuredEvents.length,
          );
          const isActive = offset === 0;

          return (
            <article
              aria-hidden={!isActive}
              aria-label={`${index + 1} de ${featuredEvents.length}: ${event.title}`}
              aria-roledescription="slide"
              className={`${styles.slide} ${getPositionClass(offset)}`}
              inert={!isActive}
              key={event.id}
            >
              <Link
                aria-label={`Ver detalhes de ${event.title}`}
                className={styles.eventLink}
                href={`/eventos/${event.slug}`}
                onClick={(clickEvent) => {
                  if (wasDragged.current) {
                    clickEvent.preventDefault();
                    wasDragged.current = false;
                  }
                }}
              >
                <div className={styles.imageFrame}>
                  <Image
                    alt={event.imageAlt}
                    className={styles.image}
                    draggable={false}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 700px) 88vw, (max-width: 1200px) 74vw, 900px"
                    src={event.imageUrl}
                  />
                  <div className={styles.imageShade} />
                  <div className={styles.ticketLabel}>
                    <span>{event.category}</span>
                    <strong>ED</strong>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}

        <button
          className={`${styles.arrow} ${styles.previous}`}
          onClick={() => {
            setIsPaused(true);
            showPrevious();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          title="Evento anterior"
          type="button"
          aria-label="Mostrar evento anterior"
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={2.5} />
        </button>
        <button
          className={`${styles.arrow} ${styles.next}`}
          onClick={() => {
            setIsPaused(true);
            showNext();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          title="Próximo evento"
          type="button"
          aria-label="Mostrar próximo evento"
        >
          <ArrowRight aria-hidden="true" size={21} strokeWidth={2.5} />
        </button>
      </div>

      <div className={styles.dots} aria-label="Escolher evento em destaque">
        {featuredEvents.map((event, index) => (
          <button
            aria-label={`Mostrar ${event.title}`}
            aria-pressed={index === activeIndex}
            className={index === activeIndex ? styles.dotActive : styles.dot}
            key={event.id}
            onClick={() => setActiveIndex(index)}
            title={event.title}
            type="button"
          />
        ))}
      </div>

      <div
        className={styles.details}
        aria-atomic="true"
        aria-live={isPaused ? "polite" : "off"}
        key={activeEvent.id}
      >
        <p>{activeEvent.category}</p>
        <h3>
          <Link href={`/eventos/${activeEvent.slug}`}>
            {activeEvent.title}
          </Link>
        </h3>
        <div className={styles.metadata}>
          <span>
            <MapPin aria-hidden="true" size={18} />
            {activeEvent.venue} - {activeEvent.city}, {activeEvent.state}
          </span>
          <span>
            <CalendarDays aria-hidden="true" size={18} />
            {formatEventDate(activeEvent.date)} as {formatEventTime(activeEvent.date)}
          </span>
        </div>
        <strong>A partir de {formatEventPrice(activeEvent.price)}</strong>
      </div>
    </section>
  );
}
