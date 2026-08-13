"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { EventCard } from "../../components/event-card/EventCard";
import { SiteHeader } from "../../components/site-header/SiteHeader";
import { brazilianStates } from "../../lib/brazilian-states";
import { CatalogEvent, fetchEvents } from "../../lib/events";
import { useAuthSession } from "../../lib/use-auth-session";
import styles from "./page.module.css";

type FilterForm = {
  query: string;
  state: string;
  date: string;
  maxPrice: string;
};

export function EventsCatalog() {
  const searchParams = useSearchParams();
  const { session, logout } = useAuthSession();
  const activeFilters = useMemo<FilterForm>(
    () => ({
      query: searchParams.get("query") ?? "",
      state: searchParams.get("state") ?? "",
      date: searchParams.get("date") ?? "",
      maxPrice: searchParams.get("maxPrice") ?? "",
    }),
    [searchParams],
  );

  return (
    <EventsCatalogContent
      activeFilters={activeFilters}
      key={searchParams.toString()}
      logout={logout}
      session={session}
    />
  );
}

type EventsCatalogContentProps = {
  activeFilters: FilterForm;
  logout: () => void;
  session: ReturnType<typeof useAuthSession>["session"];
};

function EventsCatalogContent({
  activeFilters,
  logout,
  session,
}: EventsCatalogContentProps) {
  const router = useRouter();
  const [form, setForm] = useState(activeFilters);
  const [events, setEvents] = useState<CatalogEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetchEvents(activeFilters, controller.signal)
      .then((response) => setEvents(response.events))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        setError("Nao foi possivel carregar o catalogo agora.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [activeFilters]);

  function updateField(field: keyof FilterForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();

    Object.entries(form).forEach(([key, value]) => {
      if (value.trim()) {
        params.set(key, value.trim());
      }
    });

    const query = params.toString();
    router.push(query ? `/eventos?${query}` : "/eventos");
  }

  function clearFilters() {
    router.push("/eventos");
  }

  const hasFilters = Object.values(activeFilters).some(Boolean);

  return (
    <main className={styles.page}>
      <SiteHeader
        initialQuery={activeFilters.query}
        onLogout={logout}
        session={session}
      />

      <section className={styles.catalog} aria-labelledby="events-title">
        <form className={styles.filters} onSubmit={applyFilters}>
          <div className={styles.filterHeading}>
            <SlidersHorizontal aria-hidden="true" size={20} />
            <span>Filtros</span>
          </div>
          <label className={styles.field}>
            <span>Buscar</span>
            <input
              onChange={(event) => updateField("query", event.target.value)}
              placeholder="Nome, categoria ou cidade"
              type="search"
              value={form.query}
            />
          </label>
          <label className={styles.field}>
            <span>Local</span>
            <select
              onChange={(event) => updateField("state", event.target.value)}
              value={form.state}
            >
              <option value="">Todos os estados</option>
              {brazilianStates.map(([value, label]) => (
                <option key={value} value={value}>
                  {label} ({value})
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Data</span>
            <input
              onChange={(event) => updateField("date", event.target.value)}
              type="date"
              value={form.date}
            />
          </label>
          <label className={styles.field}>
            <span>Preco maximo</span>
            <div className={styles.priceInput}>
              <span>R$</span>
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) => updateField("maxPrice", event.target.value)}
                placeholder="Sem limite"
                step="1"
                type="number"
                value={form.maxPrice}
              />
            </div>
          </label>
          <button className={styles.searchButton} type="submit">
            <Search aria-hidden="true" size={20} />
            Buscar
          </button>
        </form>

        <div className={styles.resultsHeading}>
          <div>
            <p className={styles.eyebrow}>Catalogo EventDev</p>
            <h1 id="events-title">
              {hasFilters ? "Eventos encontrados" : "Todos os eventos"}
            </h1>
          </div>
          <div className={styles.resultsActions}>
            {!isLoading && !error && (
              <span>
                {events.length} {events.length === 1 ? "evento" : "eventos"}
              </span>
            )}
            {hasFilters && (
              <button onClick={clearFilters} type="button">
                <X aria-hidden="true" size={17} />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className={styles.status} role="status">
            Carregando eventos...
          </div>
        ) : error ? (
          <div className={styles.status} role="alert">
            <strong>Catalogo indisponivel</strong>
            <p>{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className={styles.status}>
            <strong>Nenhum evento encontrado</strong>
            <p>Tente ampliar o local, a data ou o limite de preco.</p>
            <button onClick={clearFilters} type="button">
              Ver todos os eventos
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {events.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
