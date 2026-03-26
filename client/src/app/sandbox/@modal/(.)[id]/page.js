import ModalUI from "./ModalUI";
import { dummyEvents } from "../../page";
import styles from "../../sandbox.module.css";

// This runs on the server!
export default async function InterceptedEventPage({ params }) {
  const { id } = await params;
  const event = dummyEvents.find((e) => e.id === id);

  return (
    <ModalUI>
      <span className={styles.cardStatus}>{event?.status || "UNKNOWN"}</span>
      <h1 className={styles.header} style={{ border: "none", marginBottom: 0 }}>
        {event?.name || "Event Not Found"}
      </h1>
      <p style={{ color: "#888", marginTop: "20px" }}>
        [ INTERCEPTED MODAL VIEW ]<br />
        <br />
        This was loaded instantly over the feed without losing your scroll
        position.
      </p>
    </ModalUI>
  );
}
