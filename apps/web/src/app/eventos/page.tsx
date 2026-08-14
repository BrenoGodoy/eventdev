import { Suspense } from "react";
import { EventsCatalog } from "./EventsCatalog";
import styles from "./page.module.css";

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.pageLoading}>Carregando catálogo...</div>
        </main>
      }
    >
      <EventsCatalog />
    </Suspense>
  );
}
