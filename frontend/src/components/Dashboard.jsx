import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import "./Dashboard.css";

function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    this_month: 0,
    applied: 0,
    interviews: 0,
    offers: 0,
    rejected: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        setLoading(true);
        setError("");

        const data = await apiRequest("/jobs/stats");

        if (isMounted) {
          setStats((previous) => ({
            ...previous,
            ...data,
          }));
        }
      } catch (err) {
        console.error("Error fetching dashboard statistics:", err);

        if (isMounted) {
          setError(
            err.message || "Could not load dashboard statistics."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const statCards = [
    {
      title: "Total Applications",
      value: stats.total,
      description: "All your applications",
      icon: "📁",
      color: "purple",
    },
    {
      title: "This Month",
      value: stats.this_month,
      description: "Applications this month",
      icon: "📅",
      color: "blue",
    },
    {
      title: "Applied",
      value: stats.applied,
      description: "Applications submitted",
      icon: "📨",
      color: "cyan",
    },
    {
      title: "Interviews",
      value: stats.interviews,
      description: "Interview-stage applications",
      icon: "🎯",
      color: "orange",
    },
    {
      title: "Offers",
      value: stats.offers,
      description: "Offers received",
      icon: "🏆",
      color: "green",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      description: "Unsuccessful applications",
      icon: "📉",
      color: "red",
    },
  ];

  const overviewItems = [
    {
      label: "Applied",
      value: stats.applied,
      color: "blue",
    },
    {
      label: "Interviews",
      value: stats.interviews,
      color: "orange",
    },
    {
      label: "Offers",
      value: stats.offers,
      color: "green",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      color: "red",
    },
  ];

  const totalTracked = overviewItems.reduce(
    (total, item) => total + (Number(item.value) || 0),
    0
  );

  return (
    <section className="dashboard">
      {/* Dashboard heading */}
      <header className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">
            YOUR CAREER WORKSPACE
          </span>

          <h1>Dashboard</h1>

          <p>
            Track your job applications, monitor your progress, and
            stay ready for your next opportunity.
          </p>
        </div>

        <div className="dashboard-header-badge">
          <span className="status-dot" />
          Application Tracker
        </div>
      </header>

      {/* Loading state */}
      {loading && (
        <div className="dashboard-message" role="status">
          <span className="loading-spinner" />
          <span>Loading your dashboard...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="dashboard-error" role="alert">
          <div>
            <strong>Unable to load your statistics</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            className="dashboard-retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics */}
      {!loading && !error && (
        <>
          <div className="dashboard-section-heading">
            <div>
              <h2>Application Statistics</h2>
              <p>A quick look at your application activity.</p>
            </div>
          </div>

          <div className="stats-grid">
            {statCards.map((card) => (
              <article
                className={`stat-card stat-${card.color}`}
                key={card.title}
              >
                <div className="stat-card-top">
                  <span className="stat-title">{card.title}</span>

                  <span
                    className="stat-icon"
                    aria-hidden="true"
                  >
                    {card.icon}
                  </span>
                </div>

                <div className="stat-card-content">
                  <h3>{card.value ?? 0}</h3>
                  <p>{card.description}</p>
                </div>
              </article>
            ))}
          </div>

          {/* Application overview */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2>Application Overview</h2>
                <p>
                  Understand how your tracked applications are
                  distributed across different outcomes.
                </p>
              </div>

              <div className="overview-total">
                <span>Tracked statuses</span>
                <strong>{totalTracked}</strong>
              </div>
            </div>

            <div className="overview-card">
              {overviewItems.map((item) => {
                const count = Number(item.value) || 0;

                const percentage =
                  totalTracked > 0
                    ? Math.round((count / totalTracked) * 100)
                    : 0;

                return (
                  <div className="overview-row" key={item.label}>
                    <div className="overview-row-top">
                      <div className="overview-label">
                        <span
                          className={`overview-dot dot-${item.color}`}
                        />

                        <span>{item.label}</span>
                      </div>

                      <div className="overview-value">
                        <strong>{count}</strong>
                        <span>{percentage}%</span>
                      </div>
                    </div>

                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-label={`${item.label} applications`}
                      aria-valuenow={percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`progress-fill fill-${item.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {totalTracked === 0 && (
                <p className="overview-empty">
                  Your application overview will appear here as you
                  track your applications.
                </p>
              )}
            </div>
          </section>

          {/* Encouraging footer */}
          <div className="dashboard-footer">
            <span className="dashboard-footer-icon">💡</span>

            <p>
              <strong>Keep moving forward.</strong> Every application
              is another step toward your next opportunity.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

export default Dashboard;