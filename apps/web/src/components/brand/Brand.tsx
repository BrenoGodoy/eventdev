import Link from "next/link";
import styles from "./Brand.module.css";

type BrandProps = {
  inverse?: boolean;
};

export function Brand({ inverse = false }: BrandProps) {
  return (
    <Link
      className={`${styles.brand} ${inverse ? styles.inverse : ""}`}
      href="/"
      aria-label="Elite Dev Tickets - pagina inicial"
    >
      <span className={styles.mark} aria-hidden="true">
        ED
      </span>
      <span className={styles.name}>Elite Dev Tickets</span>
    </Link>
  );
}
