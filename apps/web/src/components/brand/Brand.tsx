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
      aria-label="EventDev Tickets - pagina inicial"
    >
      <span className={styles.symbol} aria-hidden="true">
        <svg viewBox="0 0 104 72" role="presentation">
          <path
            className={styles.symbolBase}
            d="M10 2h84c5.5 0 8 2.5 8 8v44l-16 16H10c-5.5 0-8-2.5-8-8V10c0-5.5 2.5-8 8-8Z"
          />
          <path
            className={styles.symbolAccent}
            d="M86 54h16L86 70V54Z"
          />
          <path
            className={styles.letterE}
            d="M16 15h39v10H29v7h22v9H29v7h26v10H16V15Z"
          />
          <path
            className={styles.letterD}
            d="M48 15h20.5C83.8 15 94 23.5 94 36.5S83.8 58 68.5 58H48V48h19.5c8.5 0 13.5-4.1 13.5-11.5S76 25 67.5 25H61v19H48V15Z"
          />
          <path className={styles.symbolDash} d="M16 63h42v4H16z" />
        </svg>
      </span>
      <span className={styles.name}>
        <span>Event</span>
        <strong>Dev</strong>
        <span className={styles.descriptor}>Tickets</span>
      </span>
    </Link>
  );
}
