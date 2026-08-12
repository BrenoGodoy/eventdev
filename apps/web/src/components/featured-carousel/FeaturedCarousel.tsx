"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { KeyboardEvent, PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import styles from "./FeaturedCarousel.module.css";

type FeaturedEvent = {
  id: string;
  category: string;
  title: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  price: string;
  image: string;
  imageAlt: string;
};

const featuredEvents: FeaturedEvent[] = [
  {
    id: "aurora-live",
    category: "Show",
    title: "Aurora Live Sessions",
    venue: "Arena Leste",
    city: "Rio de Janeiro, RJ",
    date: "Sabado, 22 de outubro",
    time: "20:30",
    price: "A partir de R$ 129",
    image: "/events/aurora-live.png",
    imageAlt:
      "Palco contemporaneo iluminado em violeta e verde durante um show ao vivo",
  },
  {
    id: "noite-sci-fi",
    category: "Cinema",
    title: "Noite Sci-Fi 2049",
    venue: "Cine Rooftop Central",
    city: "Sao Paulo, SP",
    date: "Quinta, 15 de outubro",
    time: "19:00",
    price: "A partir de R$ 89",
    image: "/events/noite-sci-fi.png",
    imageAlt:
      "Cinema ao ar livre em um terraco sob o ceu estrelado e luzes verdes",
  },
  {
    id: "horizonte-conference",
    category: "Conferencia",
    title: "Horizonte Conference 2026",
    venue: "Centro de Convencoes Aurora",
    city: "Curitiba, PR",
    date: "Sexta, 6 de novembro",
    time: "09:00",
    price: "A partir de R$ 210",
    image: "/events/horizonte-conference.png",
    imageAlt:
      "Auditorio moderno com palco geometrico branco, violeta e verde acido",
  },
  {
    id: "cena-aberta",
    category: "Teatro",
    title: "Cena Aberta",
    venue: "Teatro Estacao",
    city: "Belo Horizonte, MG",
    date: "Domingo, 8 de novembro",
    time: "18:00",
    price: "A partir de R$ 72",
    image: "/events/cena-aberta.png",
    imageAlt:
      "Dancarina em um palco escuro iluminado por um foco diante de cortinas vermelhas",
  },
  {
    id: "pulso-urbano",
    category: "Festival",
    title: "Pulso Urbano Festival",
    venue: "Parque das Artes",
    city: "Sao Paulo, SP",
    date: "Sabado, 14 de novembro",
    time: "16:00",
    price: "A partir de R$ 159",
    image: "/events/pulso-urbano.png",
    imageAlt:
      "Festival de musica ao ar livre com palco violeta e estruturas verde acido",
  },
];

const AUTOPLAY_INTERVAL = 5500;
const SWIPE_THRESHOLD = 42;

function getRelativeOffset(index: number, activeIndex: number) {
  const length = featuredEvents.length;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pointerStartX = useRef<number | null>(null);

  const showNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % featuredEvents.length);
  }, []);

  const showPrevious = useCallback(() => {
    setActiveIndex(
      (current) =>
        (current - 1 + featuredEvents.length) % featuredEvents.length,
    );
  }, []);

  useEffect(() => {
    if (
      isPaused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const autoplayId = window.setInterval(showNext, AUTOPLAY_INTERVAL);
    return () => window.clearInterval(autoplayId);
  }, [isPaused, showNext]);

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

  const activeEvent = featuredEvents[activeIndex];

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
          <p className={styles.eyebrow}>Selecao Elite</p>
          <h2 id="featured-title">Eventos em destaque</h2>
        </div>
        <p>{featuredEvents.length} experiencias escolhidas para voce</p>
      </div>

      <div
        className={styles.stage}
        onDragStart={(event) => event.preventDefault()}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          pointerStartX.current = null;
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
          const offset = getRelativeOffset(index, activeIndex);
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
              <div className={styles.imageFrame}>
                <Image
                  alt={event.imageAlt}
                  className={styles.image}
                  draggable={false}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 700px) 88vw, (max-width: 1200px) 74vw, 900px"
                  src={event.image}
                />
                <div className={styles.imageShade} />
                <div className={styles.ticketLabel}>
                  <span>{event.category}</span>
                  <strong>ED</strong>
                </div>
              </div>
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
          title="Proximo evento"
          type="button"
          aria-label="Mostrar proximo evento"
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
        <h3>{activeEvent.title}</h3>
        <div className={styles.metadata}>
          <span>
            <MapPin aria-hidden="true" size={18} />
            {activeEvent.venue} - {activeEvent.city}
          </span>
          <span>
            <CalendarDays aria-hidden="true" size={18} />
            {activeEvent.date} as {activeEvent.time}
          </span>
        </div>
        <strong>{activeEvent.price}</strong>
      </div>
    </section>
  );
}
