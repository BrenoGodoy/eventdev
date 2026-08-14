"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ExternalLink,
  MapPin,
  Search,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { SiteHeader } from "../../../../components/site-header/SiteHeader";
import actions from "../../../../components/ui/Action.module.css";
import { brazilianStates } from "../../../../lib/brazilian-states";
import {
  CatalogAttraction,
  createOrganizerEvent,
  fetchOrganizerEvent,
  searchCatalogAttractions,
  updateOrganizerEvent,
} from "../../../../lib/organizer-events";
import { useOrganizerSession } from "../../../../lib/use-organizer-session";
import styles from "./page.module.css";

type EventForm = {
  title: string;
  category: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  state: string;
  price: string;
  capacity: string;
  availableQuantity: string;
};

const emptyForm: EventForm = {
  title: "",
  category: "",
  description: "",
  date: "",
  time: "",
  venue: "",
  city: "",
  state: "",
  price: "",
  capacity: "",
  availableQuantity: "",
};

type CreateEventFlowProps = {
  eventId?: string;
};

const eventDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const eventTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Sao_Paulo",
});

function formatEventFormDate(value: string) {
  const parts = new Map(
    eventDateFormatter
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );

  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
}

export function CreateEventFlow({ eventId }: CreateEventFlowProps) {
  const router = useRouter();
  const { session, isReady, isOrganizer, logout } = useOrganizerSession();
  const isEditing = Boolean(eventId);
  const [query, setQuery] = useState("");
  const [attractions, setAttractions] = useState<CatalogAttraction[]>([]);
  const [selected, setSelected] = useState<CatalogAttraction | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(isEditing);

  const activeStep = selected ? 2 : 1;
  const pageTitle = useMemo(
    () =>
      isEditing
        ? `Editar ${selected?.name ?? "evento"}`
        : selected
          ? `Novo evento com ${selected.name}`
          : "Criar evento",
    [isEditing, selected],
  );

  useEffect(() => {
    if (!eventId || !session || !isOrganizer) {
      return;
    }

    const controller = new AbortController();

    fetchOrganizerEvent(eventId, session.token, controller.signal)
      .then(({ event }) => {
        if (event.status === "CANCELED" || event.status === "FINISHED") {
          throw new Error(
            "Eventos cancelados ou finalizados não podem ser editados.",
          );
        }

        setSelected({
          provider: "TICKETMASTER",
          externalId: event.catalogExternalId ?? event.id,
          name: event.title,
          imageUrl: event.imageUrl,
          imageAlt: event.imageAlt,
          category: event.category,
          genre: event.category,
          subGenre: null,
          sourceUrl: null,
          locale: null,
          upcomingEvents: null,
        });
        setForm({
          title: event.title,
          category: event.category,
          description: event.description,
          date: formatEventFormDate(event.date),
          time: eventTimeFormatter.format(new Date(event.date)),
          venue: event.venue,
          city: event.city,
          state: event.state,
          price: String(event.price),
          capacity: String(event.capacity),
          availableQuantity: String(event.availableQuantity),
        });
      })
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
            : "Não foi possível carregar o evento.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingEvent(false);
        }
      });

    return () => controller.abort();
  }, [eventId, isOrganizer, session]);

  if (!isReady || !isOrganizer || !session || isLoadingEvent) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          {isEditing ? "Carregando evento..." : "Preparando painel..."}
        </div>
      </main>
    );
  }

  if (isEditing && !selected) {
    return (
      <main className={styles.page}>
        <SiteHeader onLogout={logout} session={session} />
        <section className={styles.workspace}>
          <div className={styles.error} role="alert">
            {error || "Não foi possível carregar o evento."}
          </div>
          <Link
            className={`${actions.action} ${actions.secondary}`}
            href="/organizador/eventos"
          >
            Voltar para meus eventos
          </Link>
        </section>
      </main>
    );
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2 || !session) {
      setError("Digite pelo menos dois caracteres para buscar.");
      return;
    }

    setIsSearching(true);
    setError("");
    setNotice("");
    setHasSearched(true);

    try {
      const response = await searchCatalogAttractions(
        normalizedQuery,
        session.token,
      );
      setAttractions(response.attractions);
      setNotice(response.notice ?? "");
    } catch (requestError) {
      setAttractions([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível consultar o catálogo.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function selectAttraction(attraction: CatalogAttraction) {
    setSelected(attraction);
    setForm({
      ...emptyForm,
      title: attraction.name,
      category: attraction.genre ?? attraction.category,
      description: `## Sobre o evento\n\n${attraction.name} em uma experiência produzida para o público EventDev.\n\n**Categoria:** ${attraction.genre ?? attraction.category}${attraction.subGenre ? ` · ${attraction.subGenre}` : ""}`,
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeAttraction() {
    setSelected(null);
    setForm(emptyForm);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateField(field: keyof EventForm, value: string) {
    setForm((current) => {
      if (field === "capacity" && !current.availableQuantity) {
        return { ...current, capacity: value, availableQuantity: value };
      }

      return { ...current, [field]: value };
    });
  }

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected || !session) {
      return;
    }

    setIsPublishing(true);
    setError("");

    try {
      const input = {
        title: form.title,
        category: form.category,
        description: form.description,
        date: `${form.date}T${form.time}:00-03:00`,
        venue: form.venue,
        city: form.city,
        state: form.state,
        price: form.price,
        capacity: form.capacity,
        availableQuantity: form.availableQuantity,
      };

      if (eventId) {
        await updateOrganizerEvent(eventId, input, session.token);
        router.push("/organizador/eventos?updated=1");
      } else {
        await createOrganizerEvent(
          { ...input, externalId: selected.externalId },
          session.token,
        );
        router.push("/organizador/eventos?created=1");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : isEditing
            ? "Não foi possível salvar as alterações."
            : "Não foi possível publicar o evento.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <main className={styles.page}>
      <SiteHeader onLogout={logout} session={session} />

      <section
        className={styles.workspace}
        aria-labelledby="create-event-title"
      >
        <div className={styles.headingRow}>
          <div>
            <p className={styles.eyebrow}>Painel do organizador</p>
            <h1 id="create-event-title">{pageTitle}</h1>
          </div>
          <Link
            className={`${actions.action} ${actions.secondary}`}
            href="/organizador/eventos"
          >
            Meus eventos
          </Link>
        </div>

        {!isEditing && <ol className={styles.steps} aria-label="Etapas da criação">
          <li
            className={activeStep === 1 ? styles.activeStep : styles.doneStep}
          >
            <span>{activeStep === 1 ? "1" : <Check size={16} />}</span>
            Atração
          </li>
          <li className={activeStep === 2 ? styles.activeStep : ""}>
            <span>2</span>
            Publicação
          </li>
        </ol>}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {!selected ? (
          <div className={styles.catalogStep}>
            <form className={styles.catalogSearch} onSubmit={handleSearch}>
              <Search aria-hidden="true" size={22} />
              <input
                aria-label="Buscar atração na Ticketmaster"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busque por artista, espetáculo ou atração"
                type="search"
                value={query}
              />
              <button disabled={isSearching} type="submit">
                {isSearching ? "Buscando..." : "Buscar"}
              </button>
            </form>

            {notice && <p className={styles.notice}>{notice}</p>}

            {!hasSearched ? (
              <div className={styles.emptyCatalog}>
                <Sparkles aria-hidden="true" size={34} />
                <strong>Encontre a atração que inspira seu evento</strong>
                <p>Artistas, festivais, conferências e espetáculos.</p>
              </div>
            ) : !isSearching && attractions.length === 0 ? (
              <div className={styles.emptyCatalog}>
                <Search aria-hidden="true" size={34} />
                <strong>Nenhuma atração encontrada</strong>
                <p>Tente outro nome ou uma categoria mais ampla.</p>
              </div>
            ) : (
              <div className={styles.attractionGrid}>
                {attractions.map((attraction) => (
                  <article
                    className={styles.attraction}
                    key={attraction.externalId}
                  >
                    <button
                      aria-label={`Selecionar ${attraction.name}`}
                      onClick={() => selectAttraction(attraction)}
                      type="button"
                    >
                      <div className={styles.attractionImage}>
                        <Image
                          alt={attraction.imageAlt}
                          className={styles.coverImage}
                          fill
                          sizes="(max-width: 660px) 100vw, (max-width: 1100px) 50vw, 33vw"
                          src={attraction.imageUrl}
                        />
                        <span>Ticketmaster</span>
                      </div>
                      <div className={styles.attractionCopy}>
                        <p>{attraction.genre ?? attraction.category}</p>
                        <h2>{attraction.name}</h2>
                        <span className={styles.selectAction}>
                          Usar atração <ArrowRight size={17} />
                        </span>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form className={styles.eventForm} onSubmit={handlePublish}>
            <aside className={styles.sourcePanel}>
              <div className={styles.sourceImage}>
                <Image
                  alt={selected.imageAlt}
                  className={styles.coverImage}
                  fill
                  priority
                  sizes="(max-width: 820px) 100vw, 370px"
                  src={selected.imageUrl}
                />
              </div>
              <div className={styles.sourceMeta}>
                <p>
                  {isEditing ? "Referência editorial" : "Ticketmaster"} ·{" "}
                  {selected.genre ?? selected.category}
                </p>
                <h2>{selected.name}</h2>
                {selected.sourceUrl && (
                  <a href={selected.sourceUrl} rel="noreferrer" target="_blank">
                    Ver fonte <ExternalLink size={15} />
                  </a>
                )}
                {!isEditing && (
                  <button onClick={changeAttraction} type="button">
                    <ArrowLeft aria-hidden="true" size={16} />
                    Trocar atração
                  </button>
                )}
              </div>
            </aside>

            <div className={styles.fields}>
              <div className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <Sparkles aria-hidden="true" size={20} />
                  <h2>Identidade do evento</h2>
                </div>
                <label className={`${styles.field} ${styles.fullField}`}>
                  <span>Nome do evento</span>
                  <input
                    maxLength={140}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    required
                    value={form.title}
                  />
                </label>
                <label className={`${styles.field} ${styles.fullField}`}>
                  <span>Categoria</span>
                  <input
                    maxLength={80}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    required
                    value={form.category}
                  />
                </label>
                <label className={`${styles.field} ${styles.fullField}`}>
                  <span>Descrição em Markdown</span>
                  <textarea
                    maxLength={10000}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    required
                    rows={9}
                    value={form.description}
                  />
                </label>
              </div>

              <div className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <CalendarDays aria-hidden="true" size={20} />
                  <h2>Data e local</h2>
                </div>
                <label className={styles.field}>
                  <span>Data</span>
                  <input
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(event) =>
                      updateField("date", event.target.value)
                    }
                    required
                    type="date"
                    value={form.date}
                  />
                </label>
                <label className={styles.field}>
                  <span>Horário</span>
                  <input
                    onChange={(event) =>
                      updateField("time", event.target.value)
                    }
                    required
                    type="time"
                    value={form.time}
                  />
                </label>
                <label className={`${styles.field} ${styles.fullField}`}>
                  <span>Local</span>
                  <div className={styles.iconField}>
                    <MapPin aria-hidden="true" size={18} />
                    <input
                      maxLength={160}
                      onChange={(event) =>
                        updateField("venue", event.target.value)
                      }
                      placeholder="Nome do espaço"
                      required
                      value={form.venue}
                    />
                  </div>
                </label>
                <label className={styles.field}>
                  <span>Cidade</span>
                  <input
                    maxLength={100}
                    onChange={(event) =>
                      updateField("city", event.target.value)
                    }
                    required
                    value={form.city}
                  />
                </label>
                <label className={styles.field}>
                  <span>Estado</span>
                  <select
                    onChange={(event) =>
                      updateField("state", event.target.value)
                    }
                    required
                    value={form.state}
                  >
                    <option value="">Selecione</option>
                    {brazilianStates.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label} ({value})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <Ticket aria-hidden="true" size={20} />
                  <h2>Ingressos</h2>
                </div>
                <label className={styles.field}>
                  <span>Preço</span>
                  <div className={styles.priceField}>
                    <span>R$</span>
                    <input
                      min="0"
                      onChange={(event) =>
                        updateField("price", event.target.value)
                      }
                      required
                      step="0.01"
                      type="number"
                      value={form.price}
                    />
                  </div>
                </label>
                <label className={styles.field}>
                  <span>Capacidade</span>
                  <div className={styles.iconField}>
                    <Users aria-hidden="true" size={18} />
                    <input
                      min="2"
                      onChange={(event) =>
                        updateField("capacity", event.target.value)
                      }
                      required
                      step="1"
                      type="number"
                      value={form.capacity}
                    />
                  </div>
                </label>
                <label className={`${styles.field} ${styles.fullField}`}>
                  <span>Quantidade disponível</span>
                  <input
                    max={form.capacity || undefined}
                    min="0"
                    onChange={(event) =>
                      updateField("availableQuantity", event.target.value)
                    }
                    required
                    step="1"
                    type="number"
                    value={form.availableQuantity}
                  />
                </label>
              </div>

              <div className={styles.publishBar}>
                <div>
                  <strong>
                    {isEditing ? "Alterações do evento" : "Publicação imediata"}
                  </strong>
                  <span>
                    {isEditing
                      ? "Os dados atualizados serão exibidos no catálogo."
                      : "O evento entrará no catálogo público."}
                  </span>
                </div>
                <button
                  className={`${actions.action} ${actions.primary}`}
                  disabled={isPublishing}
                  type="submit"
                >
                  {isPublishing
                    ? isEditing
                      ? "Salvando..."
                      : "Publicando..."
                    : isEditing
                      ? "Salvar alterações"
                      : "Publicar evento"}
                  {!isPublishing && <ArrowRight aria-hidden="true" size={18} />}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
