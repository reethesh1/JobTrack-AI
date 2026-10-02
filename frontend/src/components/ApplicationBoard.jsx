import "./ApplicationBoard.css";

const applications = [
  {
    company: "Google",
    jobTitle: "AI Intern",
    date: "Oct 2, 2026",
    status: "Applied",
  },
  {
    company: "Microsoft",
    jobTitle: "Machine Learning Intern",
    date: "Oct 1, 2026",
    status: "In Progress",
  },
  {
    company: "Amazon",
    jobTitle: "Software Development Intern",
    date: "Sep 28, 2026",
    status: "Interview",
  },
  {
    company: "Meta",
    jobTitle: "AI Research Intern",
    date: "Sep 25, 2026",
    status: "Offer Received",
  },
  {
    company: "Example Company",
    jobTitle: "Data Science Intern",
    date: "Sep 20, 2026",
    status: "Rejected",
  },
];

const statuses = [
  "Applied",
  "In Progress",
  "Interview",
  "Offer Received",
  "Rejected",
];

function ApplicationBoard() {
  return (
    <section className="application-board">
      <div className="board-header">
        <div>
          <h2>Application Status</h2>
          <p>Track your internship applications.</p>
        </div>

        <button>+ Add Application</button>
      </div>

      <div className="board">
        {statuses.map((status) => (
          <div className="status-column" key={status}>
            <div className="status-title">
              <h3>{status}</h3>
            </div>

            <div className="application-list">
              {applications
                .filter((application) => application.status === status)
                .map((application) => (
                  <div className="application-card" key={application.company}>
                    <h4>{application.company}</h4>
                    <p>{application.jobTitle}</p>
                    <small>{application.date}</small>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ApplicationBoard;