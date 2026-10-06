import { useEffect, useState } from "react";
import "./Dashboard.css";

const API_URL = "https://jobtrack-ai-1-a4ie.onrender.com";

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
    fetch(`${API_URL}/jobs/stats`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }

        return response.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching statistics:", error);
        setError("Could not load dashboard statistics.");
        setLoading(false);
      });
  }, []);

  const statCards = [
    {
      title: "Total Applications",
      value: stats.total,
      description: "All applications",
    },
    {
      title: "This Month",
      value: stats.this_month,
      description: "Applications this month",
    },
    {
      title: "Applied",
      value: stats.applied,
      description: "Currently applied",
    },
    {
      title: "Interviews",
      value: stats.interviews,
      description: "Interview stage",
    },
    {
      title: "Offers",
      value: stats.offers,
      description: "Offers received",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      description: "Applications rejected",
    },
  ];

  return (
    <section className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>JobTrack AI</h1>
          <p>
            Track your internship applications and stay organized.
          </p>
        </div>
      </div>

      {loading && (
        <div className="dashboard-message">
          Loading dashboard...
        </div>
      )}

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="stats-grid">
          {statCards.map((card) => (
            <div className="stat-card" key={card.title}>
              <div className="stat-card-content">
                <p className="stat-title">{card.title}</p>

                <h2>{card.value}</h2>

                <span>{card.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="dashboard-section">
        <div className="section-header">
          <div>
            <h2>Application Overview</h2>
            <p>
              Keep track of where your applications currently stand.
            </p>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-row">
            <span>Applied</span>
            <strong>{stats.applied}</strong>
          </div>

          <div className="overview-row">
            <span>Interviews</span>
            <strong>{stats.interviews}</strong>
          </div>

          <div className="overview-row">
            <span>Offers</span>
            <strong>{stats.offers}</strong>
          </div>

          <div className="overview-row">
            <span>Rejected</span>
            <strong>{stats.rejected}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;