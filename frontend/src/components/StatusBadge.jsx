export default function StatusBadge({ risk }) {
  const normalized =
    String(risk || "LOW").toUpperCase();

  let cls = "low";

  if (normalized === "HIGH") {
    cls = "high";
  } else if (normalized === "MEDIUM") {
    cls = "medium";
  }

  return (
    <span
      className={`status-badge ${cls}`}
    >
      {normalized}
    </span>
  );
}