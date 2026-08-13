"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleX,
  MapPin,
  ScanLine,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AuthSession } from "../../lib/auth";
import { formatEventDate, formatEventTime } from "../../lib/events";
import {
  fetchGateChecks,
  fetchGateEvents,
  GateCheck,
  GateEvent,
} from "../../lib/gate";
import styles from "./RoleHome.module.css";
import {
  BlockHeading,
  EmptyBlock,
  GateCheckRow,
  GateEventRow,
  LoadState,
  Metric,
  RoleHomeStatus,
} from "./RoleHomeShared";

export function GateHome({ session }: { session: AuthSession }) {
  const [events, setEvents] = useState<GateEvent[]>([]);
  const [checks, setChecks] = useState<GateCheck[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const [referenceTime] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchGateEvents(session.token, controller.signal),
      fetchGateChecks(session.token, undefined, controller.signal),
    ])
      .then(([eventResponse, checkResponse]) => {
        setEvents(eventResponse.events);
        setChecks(checkResponse.checks);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [session.token]);

  if (status !== "ready") {
    return (
      <RoleHomeStatus
        error={status === "error"}
        eyebrow="Central da portaria"
        title="Preparando a operacao"
      />
    );
  }

  const upcomingEvents = events
    .filter((event) => new Date(event.date).getTime() >= referenceTime)
    .sort(
      (left, right) =>
        new Date(left.date).getTime() - new Date(right.date).getTime(),
    );
  const nextEvent = upcomingEvents[0] ?? events[0];
  const allowed = checks.filter((check) => check.result === "ALLOWED").length;
  const denied = checks.length - allowed;
  const duplicate = checks.filter(
    (check) => check.result === "DUPLICATE",
  ).length;

  return (
    <section
      className={styles.section}
      id="painel"
      aria-labelledby="gate-home-title"
    >
      <div className={styles.inner}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Central da portaria</p>
            <h2 id="gate-home-title">Entrada rapida. Retorno claro.</h2>
          </div>
          <Link className={styles.textLink} href="/portaria">
            Abrir portaria <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>

        <div className={styles.gateOverview}>
          <div className={styles.overviewCopy}>
            <p className={styles.darkEyebrow}>Proxima operacao</p>
            {nextEvent ? (
              <>
                <h3>{nextEvent.title}</h3>
                <div className={styles.gateMeta}>
                  <span>
                    <CalendarDays aria-hidden="true" size={17} />
                    {formatEventDate(nextEvent.date)} ·{" "}
                    {formatEventTime(nextEvent.date)}
                  </span>
                  <span>
                    <MapPin aria-hidden="true" size={17} />
                    {nextEvent.venue} · {nextEvent.state}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h3>Nenhum evento em operacao.</h3>
                <p>Os eventos publicados aparecerao aqui.</p>
              </>
            )}
            <Link className={styles.acidAction} href="/portaria">
              <ScanLine aria-hidden="true" size={19} /> Iniciar validacao
            </Link>
          </div>
          <div className={styles.overviewMetrics}>
            <Metric
              dark
              icon={CheckCircle2}
              label="Autorizadas"
              value={allowed}
            />
            <Metric dark icon={CircleX} label="Recusadas" value={denied} />
            <Metric
              dark
              icon={AlertTriangle}
              label="Ja utilizados"
              value={duplicate}
            />
          </div>
          <p className={styles.metricCaption}>
            Resumo das {checks.length} leituras mais recentes
          </p>
        </div>

        <div className={styles.operationsGrid}>
          <section className={styles.listBlock}>
            <BlockHeading eyebrow="Operacao" title="Proximos acessos" />
            {upcomingEvents.length ? (
              <div className={styles.operationList}>
                {upcomingEvents.slice(0, 4).map((event) => (
                  <GateEventRow event={event} key={event.id} />
                ))}
              </div>
            ) : (
              <EmptyBlock text="Nenhum evento futuro disponivel para validacao." />
            )}
          </section>

          <aside className={styles.historyBlock}>
            <BlockHeading eyebrow="Auditoria" title="Ultimas leituras" />
            {checks.length ? (
              <div className={styles.historyList}>
                {checks.slice(0, 5).map((check) => (
                  <GateCheckRow check={check} key={check.id} />
                ))}
              </div>
            ) : (
              <EmptyBlock text="As validacoes feitas por esta conta aparecerao aqui." />
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
