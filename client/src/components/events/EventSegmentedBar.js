import styles from "./EventSegmentedBar.module.css";

export default function EventSegmentedBar({ status, selected, onSelect }) {
  const navItems = Array.isArray(status) ? status : Object.values(status);

  return (
    <div className={styles.container}>
      {navItems.map((item) => {
        const isAll = item === "All";
        const isSelected = selected === item;
        if (isAll) {
          return (
            <div
              key={item}
              className={`${styles["first-wrapper"]}${isSelected ? ` ${styles["selected-wrapper"]}` : ""}`}
            >
              <button
                onClick={() => onSelect(item)}
                className={`${styles.cta} ${styles.first}${isSelected ? ` ${styles.selected}` : ""}`}
              >
                <span className={styles["button-text"]}>{item}</span>
              </button>
            </div>
          );
        }
        return (
          <button
            key={item}
            onClick={() => onSelect(item)}
            className={`${styles.cta}${isSelected ? ` ${styles.selected}` : ""}`}
          >
            <span className={styles["button-text"]}>{item}</span>
          </button>
        );
      })}
    </div>
  );
}
