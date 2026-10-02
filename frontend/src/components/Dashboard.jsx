
import { useEffect, useState } from "react";
import "./Dashboard.css";

function Dashboard() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/jobs")
      .then((response) => response.json())
      .then((data) => {
        setJobs(data);
      })
      .catch((error) => {
        console.error("Error fetching jobs:", error);
      });
  }, []);

  const totalApplications = jobs.length;

  const appliedCount = jobs.filter(
    (job) => job.status.toLowerCase() === "applied"
  ).length;

  const interviewCount = jobs.filter(
    (job) => job.status.toLowerCase() === "interview"
  ).length;

  const offerCount = jobs.filter(
    (job) => job.status.toLowerCase() === "offer"
  ).length;

  return (
    <div className="dashboard">

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Good morning 👋</h1>
          <p>
            Track your internship applications and stay organised.
          </p>
        </div>

        <button className="add-job-button">
          + Add Application
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div>
            <p>Total Applications</p>
            <h2>{totalApplications}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📨</div>
          <div>
            <p>Applied</p>
            <h2>{appliedCount}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div>
            <p>Interviews</p>
            <h2>{interviewCount}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎉</div>
          <div>
            <p>Offers</p>
            <h2>{offerCount}</h2>
          </div>
        </div>

      </div>

      {/* Recent Applications */}
      <div className="dashboard-section">

        <div className="section-header">
          <div>
            <h2>Recent Applications</h2>
            <p>Your latest job applications</p>
          </div>

          <button className="view-all-button">
            View All
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>

            <h3>No applications yet</h3>

            <p>
              Start tracking your internship applications by
              adding your first application.
            </p>

            <button className="add-first-button">
              + Add Your First Application
            </button>
          </div>
        ) : (
          <div className="applications-list">
            {jobs.slice(-5).reverse().map((job) => (
              <div className="application-row" key={job.id}>

                <div>
                  <h3>{job.company}</h3>
                  <p>{job.job_title}</p>
                </div>

                <span className="status-badge">
                  {job.status}
                </span>

              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}

export default Dashboard;
