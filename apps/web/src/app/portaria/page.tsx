import { Suspense } from "react";
import { GateConsole } from "./GateConsole";
import styles from "./page.module.css";

export default function GatePage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.loading}>Preparando a portaria...</div>
        </main>
      }
    >
      <GateConsole />
    </Suspense>
  );
}
