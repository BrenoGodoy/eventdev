"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Ticket as TicketIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { SiteHeader } from "../../components/site-header/SiteHeader";
import actions from "../../components/ui/Action.module.css";
import { EventTicket, fetchMyTickets } from "../../lib/checkout";
import { formatEventDate, formatEventTime } from "../../lib/events";
import { useAuthSession } from "../../lib/use-auth-session";
import styles from "./page.module.css";

export function MyTickets() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isReady, logout } = useAuthSession();
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const purchaseCompleted = searchParams.get("compra") === "1";

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!session) {
      router.replace("/login?redirect=%2Fmeus-ingressos");
      return;
    }

    if (session.user.role !== "CUSTOMER") {
      router.replace("/");
    }
  }, [isReady, router, session]);

  useEffect(() => {
    if (!session || session.user.role !== "CUSTOMER") {
      return;
    }

    const controller = new AbortController();
    fetchMyTickets(session.token, controller.signal)
      .then((response) => setTickets(response.tickets))
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Nao foi possivel carregar seus ingressos.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [session]);

  if (!isReady || !session || session.user.role !== "CUSTOMER") {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Preparando seus ingressos...</div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <SiteHeader onLogout={logout} session={session} />

      <section className={styles.content} aria-labelledby="tickets-title">
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Carteira EventDev</p>
            <h1 id="tickets-title">Meus ingressos</h1>
            <p>Ingressos ativos de {session.user.name}.</p>
          </div>
          <Link
            className={`${actions.action} ${actions.secondary}`}
            href="/eventos"
          >
            Explorar eventos
          </Link>
        </div>

        {purchaseCompleted && (
          <div className={styles.success} role="status">
            <CheckCircle2 aria-hidden="true" size={21} />
            Pagamento aprovado. Seus ingressos foram emitidos.
          </div>
        )}

        {isLoading ? (
          <div className={styles.loading}>Carregando ingressos...</div>
        ) : error ? (
          <div className={styles.loading} role="alert">
            <strong>Carteira indisponivel</strong>
            <p>{error}</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className={styles.empty}>
            <TicketIcon aria-hidden="true" size={36} />
            <strong>Sua carteira esta vazia</strong>
            <p>Quando uma compra for aprovada, os ingressos aparecerao aqui.</p>
            <Link
              className={`${actions.action} ${actions.primary}`}
              href="/eventos"
            >
              Encontrar eventos
            </Link>
          </div>
        ) : (
          <div className={styles.ticketGrid}>
            {tickets.map((ticket) => (
              <article className={styles.ticket} key={ticket.id}>
                <div className={styles.ticketVisual}>
                  <Image
                    alt={ticket.event.imageAlt}
                    className={styles.eventImage}
                    fill
                    sizes="(max-width: 680px) 100vw, 360px"
                    src={ticket.event.imageUrl}
                  />
                  <span className={styles.activeBadge}>Ativo</span>
                </div>
                <div className={styles.ticketDetails}>
                  <p className={styles.eyebrow}>
                    {ticket.tier?.name ?? "Ingresso"}
                  </p>
                  <h2>{ticket.event.title}</h2>
                  <p className={styles.meta}>
                    <CalendarDays aria-hidden="true" size={17} />
                    {formatEventDate(ticket.event.date)} · {formatEventTime(ticket.event.date)}
                  </p>
                  <p className={styles.meta}>
                    <MapPin aria-hidden="true" size={17} />
                    {ticket.event.venue} · {ticket.event.city}, {ticket.event.state}
                  </p>
                  <div className={styles.publicCode}>
                    <span>Codigo do ingresso</span>
                    <strong>{ticket.publicCode}</strong>
                  </div>
                </div>
                <div className={styles.qrArea}>
                  <QRCodeSVG
                    bgColor="#ffffff"
                    fgColor="#0b1020"
                    level="M"
                    marginSize={1}
                    size={154}
                    title={`QR do ingresso ${ticket.publicCode}`}
                    value={ticket.qrPayload}
                  />
                  <p>
                    <ShieldCheck aria-hidden="true" size={16} />
                    QR assinado
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
