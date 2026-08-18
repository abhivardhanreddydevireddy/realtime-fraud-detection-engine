export default function MetricCard({
  label,
  value,
  helper,
  tone = "blue",
  icon,
}) {
  return (
    <article
      className={`metric-card metric-${tone}`}
    >
      <div className="metric-card-top">

        <span>{label}</span>

        <div className="metric-icon">
          {icon}
        </div>

      </div>

      <strong>
        {value}
      </strong>

      <small>
        {helper}
      </small>
    </article>
  );
}