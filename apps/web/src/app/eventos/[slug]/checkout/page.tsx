import { Suspense } from "react";
import { CheckoutFlow } from "./CheckoutFlow";
import styles from "./page.module.css";

type CheckoutPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.loading}>Preparando reserva...</div>
        </main>
      }
    >
      <CheckoutFlow slug={slug} />
    </Suspense>
  );
}
