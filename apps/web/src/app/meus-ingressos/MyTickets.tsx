"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Check,
  Clock3,
  Copy,
  MapPin,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Ticket as TicketIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { SiteHeader } from "../../components/site-header/SiteHeader";
import actions from "../../components/ui/Action.module.css";
import {
  createTicketShare,
  EventTicket,
  fetchMyTickets,
} from "../../lib/checkout";
import { formatEventDate, formatEventTime } from "../../lib/events";
import { useAuthSession } from "../../lib/use-auth-session";
import styles from "./page.module.css";

const ticketStatusLabels: Record<EventTicket["status"], string> = {
  ACTIVE: "Ativo",
  USED: "Já utilizado",
  CANCELED: "Cancelado",
  TRANSFERRED: "Transferido",
};

const ticketStatusStyles: Record<EventTicket["status"], string> = {
  ACTIVE: styles.statusActive,
  USED: styles.statusUsed,
  CANCELED: styles.statusCanceled,
  TRANSFERRED: styles.statusTransferred,
};

const usedAtFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function MyTickets() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isReady, logout } = useAuthSession();
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sharingTicketId, setSharingTicketId] = useState<string | null>(null);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<{
    ticketId: string;
    message: string;
  } | null>(null);
  const [shareLink, setShareLink] = useState<{
    ticketId: string;
    url: string;
    expiresAt: string;
  } | null>(null);
  const purchaseCompleted = searchParams.get("compra") === "1";
  const transferCompleted = searchParams.get("transferencia") === "1";

  async function handleCreateShare(ticket: EventTicket) {
    if (!session) {
      return;
    }

    setSharingTicketId(ticket.id);
    setCopiedTicketId(null);
    setShareError(null);

    try {
      const response = await createTicketShare(ticket.id, session.token);
      setShareLink({
        ticketId: ticket.id,
        url: new URL(
          `/compartilhar/${response.token}`,
          window.location.origin,
        ).toString(),
        expiresAt: response.expiresAt,
      });
    } catch (requestError) {
      setShareError({
        ticketId: ticket.id,
        message:
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível gerar o link.",
      });
    } finally {
      setSharingTicketId(null);
    }
  }

  async function handleCopyShare(ticketId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTicketId(ticketId);
    } catch {
      setShareError({
        ticketId,
        message: "Não foi possível copiar. Selecione o link manualmente.",
      });
    }
  }

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
            <p>Ingressos de {session.user.name}.</p>
          </div>
          <Link
            className={`${actions.action} ${actions.secondary}`}
            href="/eventos"
          >
            Explorar eventos
          </Link>
        </div>

        {(purchaseCompleted || transferCompleted) && (
          <div className={styles.success} role="status">
            <CheckCircle2 aria-hidden="true" size={21} />
            {transferCompleted
              ? "Transferência concluída. O ingresso já está na sua carteira."
              : "Pagamento aprovado. Seus ingressos foram emitidos."}
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
                  <span
                    className={`${styles.statusBadge} ${ticketStatusStyles[ticket.status]}`}
                  >
                    {ticketStatusLabels[ticket.status]}
                  </span>
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

                  {ticket.status === "USED" ? (
                    <div className={styles.usedNotice} role="status">
                      <CheckCircle2 aria-hidden="true" size={18} />
                      <span>
                        <strong>Ingresso já utilizado</strong>
                        {ticket.usedAt
                          ? `Entrada registrada em ${usedAtFormatter.format(new Date(ticket.usedAt))}.`
                          : "A entrada deste ingresso já foi registrada."}
                      </span>
                    </div>
                  ) : null}

                  {ticket.status === "ACTIVE" && !ticket.usedAt ? (
                    <div className={styles.shareArea}>
                      <button
                        className={styles.shareButton}
                        disabled={sharingTicketId === ticket.id}
                        onClick={() => handleCreateShare(ticket)}
                        type="button"
                      >
                        <Share2 aria-hidden="true" size={17} />
                        {sharingTicketId === ticket.id
                          ? "Gerando link..."
                          : "Compartilhar ingresso"}
                      </button>

                      {shareError?.ticketId === ticket.id ? (
                        <p className={styles.shareError} role="alert">
                          {shareError.message}
                        </p>
                      ) : null}

                      {shareLink?.ticketId === ticket.id ? (
                        <div className={styles.sharePanel} role="status">
                          <div className={styles.shareHeading}>
                            <Clock3 aria-hidden="true" size={17} />
                            <span>
                              <strong>Link válido por 30 minutos</strong>
                              Expira às{" "}
                              {new Intl.DateTimeFormat("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(shareLink.expiresAt))}
                            </span>
                          </div>
                          <div className={styles.shareLinkRow}>
                            <input
                              aria-label="Link de compartilhamento"
                              onFocus={(event) => event.currentTarget.select()}
                              readOnly
                              value={shareLink.url}
                            />
                            <button
                              aria-label="Copiar link"
                              onClick={() =>
                                handleCopyShare(ticket.id, shareLink.url)
                              }
                              title="Copiar link"
                              type="button"
                            >
                              {copiedTicketId === ticket.id ? (
                                <Check aria-hidden="true" size={18} />
                              ) : (
                                <Copy aria-hidden="true" size={18} />
                              )}
                            </button>
                          </div>
                          <p className={styles.transferWarning}>
                            <ShieldAlert aria-hidden="true" size={16} />
                            Quando a outra pessoa aceitar, este ingresso sairá
                            da sua carteira e o QR atual será invalidado.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div
                  className={`${styles.qrArea} ${
                    ticket.status === "USED" ? styles.usedQrArea : ""
                  }`}
                >
                  <QRCodeSVG
                    bgColor="#ffffff"
                    fgColor="#0b1020"
                    level="M"
                    marginSize={1}
                    size={154}
                    title={`QR do ingresso ${ticket.publicCode}`}
                    value={ticket.qrPayload}
                  />
                  <p className={ticket.status === "USED" ? styles.usedQrLabel : ""}>
                    {ticket.status === "USED" ? (
                      <CheckCircle2 aria-hidden="true" size={16} />
                    ) : (
                      <ShieldCheck aria-hidden="true" size={16} />
                    )}
                    {ticket.status === "USED" ? "Já utilizado" : "QR assinado"}
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
