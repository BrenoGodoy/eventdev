"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
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
  searchCatalogAttractions,
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

export function CreateEventFlow() {
  const router = useRouter();
  const { session, isReady, isOrganizer, logout } = useOrganizerSession();
  const [query, setQuery] = useState("");
  const [attractions, setAttractions] = useState<CatalogAttraction[]>([]);
  const [selected, setSelected] = useState<CatalogAttraction | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const activeStep = selected ? 2 : 1;
  const pageTitle = useMemo(
    () => (selected ? `Novo evento com ${selected.name}` : "Criar evento"),
    [selected],
  );

  if (!isReady || !isOrganizer || !session) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Preparando painel...</div>
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
          : "Nao foi possivel consultar o catalogo.",
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
      description: `## Sobre o evento\n\n${attraction.name} em uma experiencia produzida para o publico EventDev.\n\n**Categoria:** ${attraction.genre ?? attraction.category}${attraction.subGenre ? ` · ${attraction.subGenre}` : ""}`,
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
      await createOrganizerEvent(
        {
          externalId: selected.externalId,
          title: form.title,
          category: form.category,
          description: form.description,
          date: `${form.date}T${form.time}:00.000Z`,
          venue: form.venue,
          city: form.city,
          state: form.state,
          price: form.price,
          capacity: form.capacity,
          availableQuantity: form.availableQuantity,
        },
        session.token,
      );
      router.push("/organizador/eventos?created=1");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel publicar o evento.",
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

        <ol className={styles.steps} aria-label="Etapas da criacao">
          <li
            className={activeStep === 1 ? styles.activeStep : styles.doneStep}
          >
            <span>{activeStep === 1 ? "1" : <Check size={16} />}</span>
            Atracao
          </li>
          <li className={activeStep === 2 ? styles.activeStep : ""}>
            <span>2</span>
            Publicacao
          </li>
        </ol>

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
                aria-label="Buscar atracao na Ticketmaster"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busque por artista, espetaculo ou atracao"
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
                <strong>Encontre a atracao que inspira seu evento</strong>
                <p>Artistas, festivais, conferencias e espetaculos.</p>
              </div>
            ) : !isSearching && attractions.length === 0 ? (
              <div className={styles.emptyCatalog}>
                <Search aria-hidden="true" size={34} />
                <strong>Nenhuma atracao encontrada</strong>
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
                          Usar atracao <ArrowRight size={17} />
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
                <p>Ticketmaster · {selected.genre ?? selected.category}</p>
                <h2>{selected.name}</h2>
                {selected.sourceUrl && (
                  <a href={selected.sourceUrl} rel="noreferrer" target="_blank">
                    Ver fonte <ExternalLink size={15} />
                  </a>
                )}
                <button onClick={changeAttraction} type="button">
                  <ArrowLeft aria-hidden="true" size={16} />
                  Trocar atracao
                </button>
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
                  <span>Descricao em Markdown</span>
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
                  <span>Horario</span>
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
                      placeholder="Nome do espaco"
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
                  <span>Preco</span>
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
                  <span>Quantidade disponivel</span>
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
                  <strong>Publicacao imediata</strong>
                  <span>O evento entrara no catalogo publico.</span>
                </div>
                <button
                  className={`${actions.action} ${actions.primary}`}
                  disabled={isPublishing}
                  type="submit"
                >
                  {isPublishing ? "Publicando..." : "Publicar evento"}
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
