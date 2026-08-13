import { Suspense } from "react";
import { OrganizerEvents } from "./OrganizerEvents";
import styles from "./page.module.css";

export default function OrganizerEventsPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.loading}>Carregando seus eventos...</div>
        </main>
      }
    >
      <OrganizerEvents />
    </Suspense>
  );
}
