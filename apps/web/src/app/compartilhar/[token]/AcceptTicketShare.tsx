"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  ShieldCheck,
  TicketCheck,
  TriangleAlert,
} from "lucide-react";
import { SiteHeader } from "../../../components/site-header/SiteHeader";
import actions from "../../../components/ui/Action.module.css";
import {
  acceptTicketShare,
  AcceptedTicketShare,
} from "../../../lib/checkout";
import { useAuthSession } from "../../../lib/use-auth-session";
import styles from "./page.module.css";

type TransferState =
  | { status: "processing" }
  | { status: "success"; result: AcceptedTicketShare }
  | { status: "error"; message: string };

export function AcceptTicketShare() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { session, isReady, logout } = useAuthSession();
  const attemptedToken = useRef<string | null>(null);
  const [transfer, setTransfer] = useState<TransferState>({
    status: "processing",
  });
  const token = typeof params.token === "string" ? params.token : "";

  useEffect(() => {
    if (!isReady || !token) {
      return;
    }

    if (!session) {
      const redirect = `/compartilhar/${encodeURIComponent(token)}`;
      router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    if (session.user.role !== "CUSTOMER") {
      return;
    }

    if (attemptedToken.current === token) {
      return;
    }

    attemptedToken.current = token;

    acceptTicketShare(token, session.token)
      .then((result) => setTransfer({ status: "success", result }))
      .catch((requestError: unknown) => {
        setTransfer({
          status: "error",
          message:
            requestError instanceof Error
              ? requestError.message
              : "Não foi possível receber este ingresso.",
        });
      });
  }, [isReady, router, session, token]);

  if (!isReady || !session) {
    return (
      <main className={styles.loadingPage}>
        <TicketCheck aria-hidden="true" size={34} />
        <strong>Preparando a transferência...</strong>
        <p>Você será direcionado para entrar na sua conta.</p>
      </main>
    );
  }

  const displayedTransfer: TransferState =
    session.user.role === "CUSTOMER"
      ? transfer
      : {
          status: "error",
          message: "Entre com uma conta de cliente para receber o ingresso.",
        };

  return (
    <main className={styles.page}>
      <SiteHeader onLogout={logout} session={session} />

      <section className={styles.content} aria-labelledby="transfer-title">
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Transferência de ingresso</p>
          <h1 id="transfer-title">
            {displayedTransfer.status === "processing"
              ? "Recebendo seu ingresso"
              : displayedTransfer.status === "success"
                ? "Ingresso recebido"
                : "Não foi possível transferir"}
          </h1>
        </div>

        <div className={styles.status}>
          <div
            className={`${styles.statusIcon} ${
              displayedTransfer.status === "success"
                ? styles.successIcon
                : displayedTransfer.status === "error"
                  ? styles.errorIcon
                  : ""
            }`}
          >
            {displayedTransfer.status === "processing" ? (
              <Clock3 aria-hidden="true" size={28} />
            ) : displayedTransfer.status === "success" ? (
              <CheckCircle2 aria-hidden="true" size={30} />
            ) : (
              <TriangleAlert aria-hidden="true" size={30} />
            )}
          </div>

          {displayedTransfer.status === "processing" ? (
            <div>
              <strong>Validando o link e a titularidade</strong>
              <p>A transferência será concluída em alguns instantes.</p>
            </div>
          ) : displayedTransfer.status === "success" ? (
            <div>
              <strong>{displayedTransfer.result.ticket.eventTitle}</strong>
              <p>
                O ingresso agora pertence a {session.user.name}. Um novo QR e
                código de acesso foram emitidos para sua conta.
              </p>
              <p className={styles.securityNote}>
                <ShieldCheck aria-hidden="true" size={17} />
                As credenciais anteriores foram invalidadas.
              </p>
              <Link
                className={`${actions.action} ${actions.primary}`}
                href="/meus-ingressos?transferencia=1"
              >
                Ver meu ingresso
              </Link>
            </div>
          ) : (
            <div>
              <strong>Transferência indisponível</strong>
              <p>{displayedTransfer.message}</p>
              <Link
                className={`${actions.action} ${actions.secondary}`}
                href="/eventos"
              >
                Explorar eventos
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
