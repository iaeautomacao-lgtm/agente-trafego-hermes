import './SensorCard.css';

function SensorCard({ icon, label, value, sub, color }) {
  return (
    <div className="sensor-card" style={{ '--accent': color }}>
      <div className="sensor-header">
        <span className="sensor-icon">{icon}</span>
        <span className="sensor-label">{label}</span>
      </div>
      <div className="sensor-value">{value}</div>
      {sub && <div className="sensor-sub">{sub}</div>}
    </div>
  );
}

export default SensorCard;
