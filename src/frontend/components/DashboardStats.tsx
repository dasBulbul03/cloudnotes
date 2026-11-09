

interface DashboardStatsProps {
  total: number;
  isLoading: boolean;
}

export function DashboardStats({ total, isLoading }: DashboardStatsProps) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">📋</div>
        <div className="stat-info">
          <span className="stat-value">
            {isLoading ? <span className="skeleton skeleton-sm" aria-label="Loading" /> : total}
          </span>
          <span className="stat-label">Total Notes</span>
        </div>
      </div>

      <div className="stat-card stat-card-accent">
        <div className="stat-icon">🌐</div>
        <div className="stat-info">
          <span className="stat-value">∞</span>
          <span className="stat-label">Cloudflare Edge</span>
        </div>
      </div>

      <div className="stat-card stat-card-green">
        <div className="stat-icon">⚡</div>
        <div className="stat-info">
          <span className="stat-value">D1</span>
          <span className="stat-label">SQLite Database</span>
        </div>
      </div>
    </div>
  );
}
