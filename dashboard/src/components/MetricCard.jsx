import React from 'react';
import './Dashboard.css';

const MetricCard = ({ title, value, subtitle, subValues, icon, extraClass = "" }) => {
  return (
    <div className={`metric-card glass-panel ${extraClass}`}>
      <div className="metric-header">
        <h3 className="metric-title">{title}</h3>
        {icon && <div className="metric-icon">{icon}</div>}
      </div>
      <div className="metric-value">{value}</div>
      {(subtitle || subValues) && (
        <div className="metric-footer">
          {subtitle && <div>{subtitle}</div>}
          {subValues && <div>{subValues}</div>}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
