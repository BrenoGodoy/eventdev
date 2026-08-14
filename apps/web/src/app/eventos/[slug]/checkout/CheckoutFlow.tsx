"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  LockKeyhole,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { SiteHeader } from "../../../../components/site-header/SiteHeader";
import actions from "../../../../components/ui/Action.module.css";
import {
  CheckoutReservation,
  createReservation,
  fetchReservation,
  simulatePayment,
} from "../../../../lib/checkout";
import {
  CatalogEvent,
  EventNotFoundError,
  fetchEventBySlug,
  formatEventDate,
  formatEventPrice,
  formatEventTime,
} from "../../../../lib/events";
import { useAuthSession } from "../../../../lib/use-auth-session";
import styles from "./page.module.css";

const MAX_TICKETS = 6;

type CheckoutFlowProps = {
  slug: string;
};

export function CheckoutFlow({ slug }: CheckoutFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reserva");
  const { session, isReady, logout } = useAuthSession();
  const [event, setEvent] = useState<CatalogEvent | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reservation, setReservation] = useState<CheckoutReservation | null>(
    null,
  );
  const [paymentScenario, setPaymentScenario] = useState<
    "APPROVED" | "DECLINED"
  >("APPROVED");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const expirationSyncAttemptedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!session) {
      router.replace(
        `/login?redirect=${encodeURIComponent(`/eventos/${slug}/checkout${reservationId ? `?reserva=${reservationId}` : ""}`)}`,
      );
      return;
    }

    if (session.user.role !== "CUSTOMER") {
      router.replace(`/eventos/${slug}`);
    }
  }, [isReady, reservationId, router, session, slug]);

  useEffect(() => {
    if (!session || session.user.role !== "CUSTOMER") {
      return;
    }

    const controller = new AbortController();
    const request = reservationId
      ? fetchReservation(reservationId, session.token, controller.signal).then(
          (response) => {
            setReservation(response.reservation);
            return fetchEventBySlug(slug, controller.signal);
          },
        )
      : fetchEventBySlug(slug, controller.signal);

    request
      .then((response) => setEvent(response.event))
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof EventNotFoundError
            ? "Evento não encontrado."
            : requestError instanceof Error
              ? requestError.message
              : "Não foi possível preparar a reserva.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [reservationId, session, slug]);

  useEffect(() => {
    if (!reservation?.expiresAt || reservation.status !== "PENDING") {
      return;
    }

    const updateRemaining = () => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (new Date(reservation.expiresAt as string).getTime() - Date.now()) /
            1000,
        ),
      );
      setRemainingSeconds(seconds);
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [reservation?.expiresAt, reservation?.status]);

  useEffect(() => {
    if (
      remainingSeconds !== 0 ||
      !reservation ||
      reservation.status !== "PENDING" ||
      !session ||
      expirationSyncAttemptedFor.current === reservation.id
    ) {
      return;
    }

    expirationSyncAttemptedFor.current = reservation.id;
    fetchReservation(reservation.id, session.token)
      .then((response) => setReservation(response.reservation))
      .catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível atualizar a reserva expirada.",
        );
      });
  }, [remainingSeconds, reservation, session]);

  const selectedQuantity = useMemo(
    () =>
      Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0),
    [quantities],
  );
  const selectedTotal = useMemo(
    () =>
      event?.ticketTiers.reduce(
        (sum, tier) => sum + (quantities[tier.id] ?? 0) * tier.price,
        0,
      ) ?? 0,
    [event, quantities],
  );
  const summaryItems = useMemo(
    () =>
      reservation
        ? reservation.items.map((item) => ({
            key: item.id ?? item.tier.id,
            name: item.tier.name,
            quantity: item.quantity,
            subtotal: item.subtotal,
          }))
        : (event?.ticketTiers ?? [])
            .filter((tier) => (quantities[tier.id] ?? 0) > 0)
            .map((tier) => ({
              key: tier.id,
              name: tier.name,
              quantity: quantities[tier.id] ?? 0,
              subtotal: (quantities[tier.id] ?? 0) * tier.price,
            })),
    [event, quantities, reservation],
  );

  function changeQuantity(tierId: string, delta: number, available: number) {
    setQuantities((current) => {
      const currentQuantity = current[tierId] ?? 0;
      const total = Object.values(current).reduce(
        (sum, quantity) => sum + quantity,
        0,
      );

      if (delta > 0 && total >= MAX_TICKETS) {
        return current;
      }

      const next = Math.max(0, Math.min(currentQuantity + delta, available));
      return { ...current, [tierId]: next };
    });
    setError("");
  }

  async function handleReserve() {
    if (!session || !event || selectedQuantity === 0) {
      setError("Selecione pelo menos um ingresso.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await createReservation(
        event.id,
        event.ticketTiers
          .map((tier) => ({
            tierId: tier.id,
            quantity: quantities[tier.id] ?? 0,
          }))
          .filter((item) => item.quantity > 0),
        session.token,
      );
      setReservation(response.reservation);
      router.replace(
        `/eventos/${slug}/checkout?reserva=${encodeURIComponent(response.reservation.id)}`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível reservar os ingressos.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePayment(paymentEvent: FormEvent<HTMLFormElement>) {
    paymentEvent.preventDefault();

    if (!session || !reservation) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    setPaymentMessage("");

    try {
      const response = await simulatePayment(
        reservation.id,
        paymentScenario,
        session.token,
      );
      setReservation(response.reservation);

      if (response.outcome === "APPROVED") {
        router.push(
          `/meus-ingressos?compra=1&reserva=${encodeURIComponent(reservation.id)}`,
        );
        return;
      }

      setPaymentMessage(
        "Pagamento recusado. Nenhuma cobrança foi feita e sua reserva continua ativa.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível processar o pagamento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady || !session || session.user.role !== "CUSTOMER" || isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Preparando reserva...</div>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className={styles.page}>
        <SiteHeader onLogout={logout} session={session} />
        <div className={styles.loading} role="alert">
          <strong>{error}</strong>
          <Link href="/eventos">Voltar aos eventos</Link>
        </div>
      </main>
    );
  }

  if (!event) {
    return null;
  }

  const isConfirmed =
    reservation?.status === "CONFIRMED" ||
    reservation?.paymentStatus === "PAID";
  const isCanceled = reservation?.status === "CANCELED";
  const isExpired = reservation?.status === "EXPIRED" || remainingSeconds === 0;
  const minutes = Math.floor((remainingSeconds ?? 0) / 60);
  const seconds = (remainingSeconds ?? 0) % 60;

  return (
    <main className={styles.page}>
      <SiteHeader onLogout={logout} session={session} />

      <section className={styles.checkout} aria-labelledby="checkout-title">
        <div className={styles.heading}>
          <div>
            <Link className={styles.backLink} href={`/eventos/${slug}`}>
              <ArrowLeft aria-hidden="true" size={17} />
              Voltar ao evento
            </Link>
            <p className={styles.eyebrow}>Compra segura EventDev</p>
            <h1 id="checkout-title">
              {reservation ? "Finalize sua reserva" : "Escolha seus ingressos"}
            </h1>
          </div>
          <ol className={styles.steps} aria-label="Etapas da compra">
            <li className={!reservation ? styles.activeStep : styles.doneStep}>
              <span>{reservation ? <CheckCircle2 size={16} /> : "1"}</span>
              Ingressos
            </li>
            <li className={reservation ? styles.activeStep : ""}>
              <span>2</span>
              Pagamento
            </li>
          </ol>
        </div>

        {error && event && (
          <div className={styles.error} role="alert">
            <AlertCircle aria-hidden="true" size={20} />
            {error}
          </div>
        )}

        <div className={styles.checkoutGrid}>
          <div className={styles.mainColumn}>
            {!reservation ? (
              <section
                className={styles.ticketSelection}
                aria-labelledby="tiers-title"
              >
                <div className={styles.sectionTitle}>
                  <Ticket aria-hidden="true" size={21} />
                  <div>
                    <p className={styles.eyebrow}>Entrada por quantidade</p>
                    <h2 id="tiers-title">Setores disponíveis</h2>
                  </div>
                </div>

                <div className={styles.tierList}>
                  {event.ticketTiers.map((tier) => {
                    const quantity = quantities[tier.id] ?? 0;
                    const soldOut = tier.availableQuantity === 0;

                    return (
                      <article className={styles.tier} key={tier.id}>
                        <div className={styles.tierAccent} aria-hidden="true" />
                        <div className={styles.tierInfo}>
                          <div className={styles.tierHeading}>
                            <div>
                              <span>
                                {tier.type === "PREMIUM"
                                  ? "Experiência premium"
                                  : "Entrada geral"}
                              </span>
                              <h3>{tier.name}</h3>
                            </div>
                            <strong>{formatEventPrice(tier.price)}</strong>
                          </div>
                          <p>{tier.description}</p>
                          <small>
                            {soldOut
                              ? "Esgotado"
                              : `${tier.availableQuantity} disponíveis`}
                          </small>
                        </div>
                        <div
                          className={styles.stepper}
                          aria-label={`Quantidade de ${tier.name}`}
                        >
                          <button
                            aria-label={`Remover ${tier.name}`}
                            disabled={quantity === 0}
                            onClick={() =>
                              changeQuantity(
                                tier.id,
                                -1,
                                tier.availableQuantity,
                              )
                            }
                            type="button"
                          >
                            <Minus aria-hidden="true" size={18} />
                          </button>
                          <output aria-live="polite">{quantity}</output>
                          <button
                            aria-label={`Adicionar ${tier.name}`}
                            disabled={
                              soldOut ||
                              selectedQuantity >= MAX_TICKETS ||
                              quantity >= tier.availableQuantity
                            }
                            onClick={() =>
                              changeQuantity(tier.id, 1, tier.availableQuantity)
                            }
                            type="button"
                          >
                            <Plus aria-hidden="true" size={18} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className={styles.selectionFooter}>
                  <span>Limite de {MAX_TICKETS} ingressos por reserva</span>
                  <button
                    className={`${actions.action} ${actions.primary}`}
                    disabled={isSubmitting || selectedQuantity === 0}
                    onClick={handleReserve}
                    type="button"
                  >
                    {isSubmitting ? "Reservando..." : "Reservar ingressos"}
                    {!isSubmitting && (
                      <ArrowRight aria-hidden="true" size={18} />
                    )}
                  </button>
                </div>
              </section>
            ) : isConfirmed ? (
              <section className={styles.expired}>
                <CheckCircle2 aria-hidden="true" size={34} />
                <h2>Compra já confirmada</h2>
                <p>
                  O pagamento desta reserva foi aprovado e os ingressos já
                  estão disponíveis na sua conta.
                </p>
                <Link
                  className={`${actions.action} ${actions.primary}`}
                  href="/meus-ingressos"
                >
                  Ver meus ingressos
                </Link>
              </section>
            ) : isCanceled ? (
              <section className={styles.expired}>
                <AlertCircle aria-hidden="true" size={34} />
                <h2>Reserva cancelada</h2>
                <p>
                  Esta reserva não aceita novas tentativas de pagamento. Você
                  pode voltar ao catálogo para escolher outro evento.
                </p>
                <Link
                  className={`${actions.action} ${actions.primary}`}
                  href="/eventos"
                >
                  Explorar eventos
                </Link>
              </section>
            ) : isExpired ? (
              <section className={styles.expired}>
                <Clock3 aria-hidden="true" size={34} />
                <h2>Reserva expirada</h2>
                <p>
                  {reservation.status === "EXPIRED"
                    ? "Os ingressos voltaram ao estoque para evitar bloqueios indevidos."
                    : "O prazo terminou. Estamos liberando os ingressos para o estoque."}
                </p>
                <Link
                  className={`${actions.action} ${actions.primary}`}
                  href={`/eventos/${slug}/checkout`}
                >
                  Escolher novamente
                </Link>
              </section>
            ) : (
              <form className={styles.payment} onSubmit={handlePayment}>
                <div className={styles.paymentHeader}>
                  <div className={styles.sectionTitle}>
                    <CreditCard aria-hidden="true" size={21} />
                    <div>
                      <p className={styles.eyebrow}>Pagamento simulado</p>
                      <h2>Dados do cartão</h2>
                    </div>
                  </div>
                  <div className={styles.timer} role="timer">
                    <Clock3 aria-hidden="true" size={18} />
                    <span>Reserva por</span>
                    <strong>
                      {String(minutes).padStart(2, "0")}:
                      {String(seconds).padStart(2, "0")}
                    </strong>
                  </div>
                </div>

                {paymentMessage && (
                  <div className={styles.declined} role="alert">
                    <AlertCircle aria-hidden="true" size={20} />
                    {paymentMessage}
                  </div>
                )}

                <div className={styles.paymentFields}>
                  <label className={`${styles.field} ${styles.fullField}`}>
                    <span>Nome no cartão</span>
                    <input
                      autoComplete="cc-name"
                      defaultValue={session.user.name}
                      required
                    />
                  </label>
                  <label className={`${styles.field} ${styles.fullField}`}>
                    <span>Número do cartão</span>
                    <div className={styles.iconInput}>
                      <CreditCard aria-hidden="true" size={18} />
                      <input
                        autoComplete="cc-number"
                        defaultValue="4242 4242 4242 4242"
                        inputMode="numeric"
                        required
                      />
                    </div>
                  </label>
                  <label className={styles.field}>
                    <span>Validade</span>
                    <input
                      autoComplete="cc-exp"
                      defaultValue="12/30"
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    <span>CVV</span>
                    <input
                      autoComplete="cc-csc"
                      defaultValue="123"
                      inputMode="numeric"
                      required
                    />
                  </label>
                </div>

                <fieldset className={styles.scenarios}>
                  <legend>Resultado da simulação</legend>
                  <label
                    className={
                      paymentScenario === "APPROVED"
                        ? styles.selectedScenario
                        : ""
                    }
                  >
                    <input
                      checked={paymentScenario === "APPROVED"}
                      name="scenario"
                      onChange={() => setPaymentScenario("APPROVED")}
                      type="radio"
                    />
                    <CheckCircle2 aria-hidden="true" size={20} />
                    <span>
                      <strong>Aprovado</strong>
                      Emite os ingressos
                    </span>
                  </label>
                  <label
                    className={
                      paymentScenario === "DECLINED"
                        ? styles.selectedScenario
                        : ""
                    }
                  >
                    <input
                      checked={paymentScenario === "DECLINED"}
                      name="scenario"
                      onChange={() => setPaymentScenario("DECLINED")}
                      type="radio"
                    />
                    <AlertCircle aria-hidden="true" size={20} />
                    <span>
                      <strong>Recusado</strong>
                      Permite nova tentativa
                    </span>
                  </label>
                </fieldset>

                <button
                  className={`${actions.action} ${actions.primary} ${styles.payButton}`}
                  disabled={isSubmitting}
                  type="submit"
                >
                  <LockKeyhole aria-hidden="true" size={18} />
                  {isSubmitting
                    ? "Processando..."
                    : `Pagar ${formatEventPrice(reservation.total)}`}
                </button>
              </form>
            )}
          </div>

          <aside className={styles.summary} aria-label="Resumo da compra">
            <div className={styles.eventPreview}>
              <div className={styles.eventImage}>
                <Image
                  alt={event.imageAlt}
                  className={styles.coverImage}
                  fill
                  sizes="(max-width: 860px) 100vw, 360px"
                  src={event.imageUrl}
                />
              </div>
              <div>
                <p className={styles.eyebrow}>{event.category}</p>
                <h2>{event.title}</h2>
                <p>
                  <CalendarDays aria-hidden="true" size={17} />
                  {formatEventDate(event.date)} · {formatEventTime(event.date)}
                </p>
                <p>
                  <MapPin aria-hidden="true" size={17} />
                  {event.venue} · {event.city}, {event.state}
                </p>
              </div>
            </div>

            <div className={styles.orderSummary}>
              <h3>Resumo</h3>
              {summaryItems.map((item) => (
                <p key={item.key}>
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <strong>{formatEventPrice(item.subtotal)}</strong>
                </p>
              ))}
              <div className={styles.totalRow}>
                <span>Total</span>
                <strong>
                  {formatEventPrice(reservation?.total ?? selectedTotal)}
                </strong>
              </div>
            </div>

            <div className={styles.securityNote}>
              <ShieldCheck aria-hidden="true" size={21} />
              <span>
                <strong>Estoque protegido</strong>
                Sua quantidade fica bloqueada apenas durante o prazo da reserva.
              </span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
