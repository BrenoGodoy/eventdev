"use client";

import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  CircleX,
  Clock3,
  Keyboard,
  MapPin,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  TicketCheck,
  Users,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "../../components/site-header/SiteHeader";
import actions from "../../components/ui/Action.module.css";
import {
  fetchGateChecks,
  fetchGateEvents,
  GateCheck,
  GateEvent,
  GateValidation,
  GateValidationStatus,
  validateGateTicket,
} from "../../lib/gate";
import { formatEventDate, formatEventTime } from "../../lib/events";
import { useAuthSession } from "../../lib/use-auth-session";
import styles from "./page.module.css";

const validationPresentation: Record<
  GateValidationStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  VALID: {
    label: "Ingresso válido",
    icon: CheckCircle2,
    className: styles.valid,
  },
  INVALID: {
    label: "Ingresso inválido",
    icon: CircleX,
    className: styles.invalid,
  },
  ALREADY_USED: {
    label: "Já utilizado",
    icon: RefreshCw,
    className: styles.duplicate,
  },
  WRONG_EVENT: {
    label: "Evento errado",
    icon: AlertTriangle,
    className: styles.wrongEvent,
  },
};

const historyLabels = {
  ALLOWED: "Entrada autorizada",
  DENIED: "Evento errado",
  DUPLICATE: "Já utilizado",
  INVALID: "Inválido",
};

export function GateConsole() {
  const router = useRouter();
  const { session, isReady, logout } = useAuthSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const processingRef = useRef(false);
  const [events, setEvents] = useState<GateEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [checks, setChecks] = useState<GateCheck[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<GateValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const selectedEvent = events.find((event) => event.id === selectedEventId);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!session) {
      router.replace("/login?redirect=%2Fportaria");
      return;
    }

    if (session.user.role !== "GATE") {
      router.replace("/");
    }
  }, [isReady, router, session]);

  useEffect(() => {
    if (!session || session.user.role !== "GATE") {
      return;
    }

    const controller = new AbortController();
    fetchGateEvents(session.token, controller.signal)
      .then((response) => {
        setEvents(response.events);
        setSelectedEventId(
          (current) => current || response.events[0]?.id || "",
        );
      })
      .catch((requestError: unknown) => {
        if (!(
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Não foi possível carregar os eventos.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [session]);

  const loadChecks = useCallback(async () => {
    if (!session || !selectedEventId) {
      setChecks([]);
      return;
    }

    try {
      const response = await fetchGateChecks(session.token, selectedEventId);
      setChecks(response.checks);
    } catch {
      setChecks([]);
    }
  }, [selectedEventId, session]);

  useEffect(() => {
    if (!session || !selectedEventId) {
      return;
    }

    const controller = new AbortController();
    fetchGateChecks(session.token, selectedEventId, controller.signal)
      .then((response) => setChecks(response.checks))
      .catch((requestError: unknown) => {
        if (!(
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )) {
          setChecks([]);
        }
      });

    return () => controller.abort();
  }, [selectedEventId, session]);

  useEffect(() => stopScanner, [stopScanner]);

  const processValidation = useCallback(
    async (input: { qrPayload?: string; publicCode?: string }) => {
      if (!session || !selectedEventId || processingRef.current) {
        return;
      }

      processingRef.current = true;
      setIsValidating(true);
      setError("");

      try {
        const response = await validateGateTicket(session.token, {
          eventId: selectedEventId,
          ...input,
        });
        setResult(response);
        setManualCode("");
        stopScanner();
        void loadChecks();
        void fetchGateEvents(session.token)
          .then((eventsResponse) => setEvents(eventsResponse.events))
          .catch(() => undefined);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível validar o ingresso.",
        );
      } finally {
        processingRef.current = false;
        setIsValidating(false);
      }
    },
    [loadChecks, selectedEventId, session, stopScanner],
  );

  async function startScanner() {
    if (!selectedEventId) {
      setError("Selecione um evento antes de abrir a câmera.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setError(
        "A câmera não está disponível neste navegador. Use o código manual.",
      );
      return;
    }

    stopScanner();
    setResult(null);
    setError("");

    try {
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 180,
        delayBetweenScanSuccess: 900,
      });
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (scanResult, _scanError, controls) => {
          if (scanResult && !processingRef.current) {
            controls.stop();
            controlsRef.current = null;
            setIsScanning(false);
            void processValidation({ qrPayload: scanResult.getText() });
          }
        },
      );

      if (processingRef.current) {
        controls.stop();
        return;
      }

      controlsRef.current = controls;
      setIsScanning(true);
    } catch (cameraError) {
      setIsScanning(false);
      const permissionDenied =
        cameraError instanceof DOMException &&
        cameraError.name === "NotAllowedError";
      setError(
        permissionDenied
          ? "Permissão da câmera negada. Libere o acesso ou use o código manual."
          : "Não foi possível iniciar a câmera. Use o código manual.",
      );
    }
  }

  function handleManualValidation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = manualCode.trim();

    if (!code) {
      setError("Digite o código público do ingresso.");
      return;
    }

    setResult(null);
    void processValidation({ publicCode: code });
  }

  function handleEventChange(eventId: string) {
    stopScanner();
    setSelectedEventId(eventId);
    setResult(null);
    setError("");
  }

  if (!isReady || !session || session.user.role !== "GATE" || isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Preparando a portaria...</div>
      </main>
    );
  }

  const resultView = result ? validationPresentation[result.status] : null;
  const ResultIcon = resultView?.icon;
  const occupancy = selectedEvent?.issuedTickets
    ? Math.round((selectedEvent.checkedIn / selectedEvent.issuedTickets) * 100)
    : 0;

  return (
    <main className={styles.page}>
      <SiteHeader onLogout={logout} session={session} />

      <section className={styles.console} aria-labelledby="gate-title">
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Operação de entrada</p>
            <h1 id="gate-title">Portaria</h1>
            <p>Valide cada ingresso uma única vez, com retorno imediato.</p>
          </div>
          <label className={styles.eventSelector}>
            <span>Evento em operação</span>
            <select
              onChange={(event) => handleEventChange(event.target.value)}
              value={selectedEventId}
            >
              {events.length === 0 && (
                <option value="">Nenhum evento disponível</option>
              )}
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedEvent && (
          <div className={styles.eventContext}>
            <div>
              <TicketCheck aria-hidden="true" size={22} />
              <span>
                <strong>{selectedEvent.title}</strong>
                {formatEventDate(selectedEvent.date)} ·{" "}
                {formatEventTime(selectedEvent.date)}
              </span>
            </div>
            <div>
              <MapPin aria-hidden="true" size={20} />
              <span>
                <strong>{selectedEvent.venue}</strong>
                {selectedEvent.city}, {selectedEvent.state}
              </span>
            </div>
            <div>
              <Users aria-hidden="true" size={20} />
              <span>
                <strong>{selectedEvent.checkedIn} entradas</strong>
                {occupancy}% dos ingressos emitidos
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.error} role="alert">
            <AlertTriangle aria-hidden="true" size={20} />
            {error}
          </div>
        )}

        <div className={styles.operationGrid}>
          <section
            className={styles.scannerPanel}
            aria-labelledby="scanner-title"
          >
            <div className={styles.sectionHeading}>
              <ScanLine aria-hidden="true" size={22} />
              <div>
                <p className={styles.eyebrow}>Leitura principal</p>
                <h2 id="scanner-title">Scanner de QR</h2>
              </div>
              <span
                className={isScanning ? styles.liveStatus : styles.offStatus}
              >
                {isScanning ? "Câmera ativa" : "Câmera desligada"}
              </span>
            </div>

            <div className={styles.cameraViewport}>
              <video muted playsInline ref={videoRef} />
              {!isScanning && (
                <div className={styles.cameraPlaceholder}>
                  <Camera aria-hidden="true" size={38} />
                  <strong>Aponte a câmera para o QR</strong>
                  <p>A leitura é enviada com segurança para a API.</p>
                </div>
              )}
              <div className={styles.scanFrame} aria-hidden="true" />
            </div>

            <button
              className={`${actions.action} ${isScanning ? actions.secondary : actions.primary} ${styles.cameraButton}`}
              disabled={!selectedEventId || isValidating}
              onClick={isScanning ? stopScanner : startScanner}
              type="button"
            >
              {isScanning ? <CameraOff size={19} /> : <Camera size={19} />}
              {isScanning ? "Desligar câmera" : "Iniciar leitura"}
            </button>

            <div className={styles.manualDivider}>
              <span>ou use o código impresso</span>
            </div>

            <form
              className={styles.manualForm}
              onSubmit={handleManualValidation}
            >
              <label>
                <span>Código do ingresso</span>
                <div>
                  <Keyboard aria-hidden="true" size={19} />
                  <input
                    autoCapitalize="characters"
                    autoComplete="off"
                    onChange={(event) =>
                      setManualCode(event.target.value.toUpperCase())
                    }
                    placeholder="ED-XXXXXXXXXXXX"
                    spellCheck={false}
                    value={manualCode}
                  />
                </div>
              </label>
              <button
                className={`${actions.action} ${actions.secondary}`}
                disabled={isValidating || !selectedEventId}
                type="submit"
              >
                {isValidating ? "Validando..." : "Validar código"}
              </button>
            </form>
          </section>

          <aside className={styles.resultColumn} aria-live="assertive">
            {result && resultView && ResultIcon ? (
              <section
                className={`${styles.resultPanel} ${resultView.className}`}
              >
                <div className={styles.resultIcon}>
                  <ResultIcon aria-hidden="true" size={46} />
                </div>
                <p className={styles.resultLabel}>Resultado da leitura</p>
                <h2>{resultView.label}</h2>
                <p className={styles.resultMessage}>{result.message}</p>
                {result.ticket && (
                  <dl className={styles.ticketData}>
                    <div>
                      <dt>Participante</dt>
                      <dd>{result.ticket.holderName}</dd>
                    </div>
                    <div>
                      <dt>Setor</dt>
                      <dd>{result.ticket.tierName}</dd>
                    </div>
                    <div>
                      <dt>Código</dt>
                      <dd>{result.ticket.publicCode}</dd>
                    </div>
                  </dl>
                )}
                <button
                  className={styles.nextButton}
                  onClick={() => setResult(null)}
                  type="button"
                >
                  <Check aria-hidden="true" size={19} />
                  Próxima leitura
                </button>
              </section>
            ) : (
              <section className={styles.waitingPanel}>
                <ShieldCheck aria-hidden="true" size={40} />
                <p className={styles.eyebrow}>Aguardando ingresso</p>
                <h2>Resultado claro e imediato</h2>
                <ul>
                  <li>
                    <span className={styles.validDot} /> Válido
                  </li>
                  <li>
                    <span className={styles.invalidDot} /> Inválido
                  </li>
                  <li>
                    <span className={styles.duplicateDot} /> Já utilizado
                  </li>
                  <li>
                    <span className={styles.wrongDot} /> Evento errado
                  </li>
                </ul>
              </section>
            )}

            <section className={styles.history} aria-labelledby="history-title">
              <div className={styles.historyHeading}>
                <div>
                  <p className={styles.eyebrow}>Auditoria local</p>
                  <h2 id="history-title">Últimas leituras</h2>
                </div>
                <Clock3 aria-hidden="true" size={20} />
              </div>
              {checks.length === 0 ? (
                <p className={styles.emptyHistory}>
                  Nenhuma leitura neste evento.
                </p>
              ) : (
                <ol>
                  {checks.slice(0, 6).map((check) => (
                    <li key={check.id}>
                      <span className={styles[`history${check.result}`]} />
                      <div>
                        <strong>{historyLabels[check.result]}</strong>
                        <small>
                          {check.ticket?.publicCode ?? "Código não reconhecido"}
                        </small>
                      </div>
                      <time dateTime={check.createdAt}>
                        {new Intl.DateTimeFormat("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        }).format(new Date(check.createdAt))}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
