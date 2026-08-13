import { Suspense } from "react";
import { MyTickets } from "./MyTickets";
import styles from "./page.module.css";

export default function MyTicketsPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.loading}>Carregando ingressos...</div>
        </main>
      }
    >
      <MyTickets />
    </Suspense>
  );
}
