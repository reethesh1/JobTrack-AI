import { useEffect, useState } from "react";
import "./ApplicationBoard.css";

const API_URL = "https://jobtrack-ai-1-a4ie.onrender.com";

const statuses = [
  "Applied",
  "In Progress",
  "Interview",
  "Offer Received",
  "Rejected",
];

const emptyForm = {
  company: "",
  job_title: "",
  job_url: "",
  status: "Applied",
  notes: "",
  interview_date: "",
};

function ApplicationBoard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(emptyForm);

  const fetchApplications = () => {
    setLoading(true);
    setError("");

    fetch(`${API_URL}/jobs`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch applications");
        }

        return response.json();
      })
      .then((data) => {
        setApplications(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading applications:", error);
        setError("Could not load applications.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setError("");

    if (!formData.company.trim() || !formData.job_title.trim()) {
      setError("Company and job title are required.");
      return;
    }

    const url = editingId
      ? `${API_URL}/jobs/${editingId}`
      : `${API_URL}/jobs`;

    const method = editingId ? "PUT" : "POST";

    const payload = {
      ...formData,
      interview_date: formData.interview_date
        ? new Date(formData.interview_date).toISOString()
        : null,
    };

    fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to save application");
        }

        return response.json();
      })
      .then((savedApplication) => {
        if (editingId) {
          setApplications((previousApplications) =>
            previousApplications.map((application) =>
              application.id === editingId
                ? savedApplication
                : application
            )
          );
        } else {
          setApplications((previousApplications) => [
            ...previousApplications,
            savedApplication,
          ]);
        }

        setFormData(emptyForm);
        setEditingId(null);
        setShowForm(false);
      })
      .catch((error) => {
        console.error("Error saving application:", error);
        setError("Could not save application.");
      });
  };

  const handleEdit = (application) => {
    let formattedDate = "";

    if (application.interview_date) {
      const date = new Date(application.interview_date);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    setFormData({
      company: application.company || "",
      job_title: application.job_title || "",
      job_url: application.job_url || "",
      status: application.status || "Applied",
      notes: application.notes || "",
      interview_date: formattedDate,
    });

    setEditingId(application.id);
    setShowForm(true);
    setError("");
  };

  const handleDelete = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application?"
    );

    if (!confirmed) {
      return;
    }

    fetch(`${API_URL}/jobs/${id}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to delete application");
        }

        setApplications((previousApplications) =>
          previousApplications.filter(
            (application) => application.id !== id
          )
        );
      })
      .catch((error) => {
        console.error("Error deleting application:", error);
        setError("Could not delete application.");
      });
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const formatInterviewDate = (dateString) => {
    if (!dateString) {
      return "";
    }

    return new Date(dateString).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <section className="application-board">
      <div className="board-header">
        <div>
          <h2>Application Status</h2>
          <p>Track your internship applications.</p>
        </div>

        <button
          onClick={() => {
            if (showForm) {
              handleCancel();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? "Cancel" : "+ Add Application"}
        </button>
      </div>

      {showForm && (
        <form className="application-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Company *</label>

              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="e.g. Google"
              />
            </div>

            <div className="form-group">
              <label>Job Title *</label>

              <input
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                placeholder="e.g. AI Intern"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Job URL</label>

              <input
                type="url"
                name="job_url"
                value={formData.job_url}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>Status</label>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Interview Date & Time</label>

              <input
                type="datetime-local"
                name="interview_date"
                value={formData.interview_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>

            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add notes about this application..."
              rows="3"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="submit-button">
            {editingId ? "Update Application" : "Save Application"}
          </button>
        </form>
      )}

      {!showForm && error && (
        <p className="form-error">{error}</p>
      )}

      {loading && <p>Loading applications...</p>}

      {!loading && !error && (
        <div className="board">
          {statuses.map((status) => (
            <div className="status-column" key={status}>
              <div className="status-title">
                <h3>{status}</h3>
              </div>

              <div className="application-list">
                {applications
                  .filter(
                    (application) =>
                      application.status === status
                  )
                  .map((application) => (
                    <div
                      className="application-card"
                      key={application.id}
                    >
                      <h4>{application.company}</h4>

                      <p>{application.job_title}</p>

                      {application.job_url && (
                        <a
                          href={application.job_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View Job
                        </a>
                      )}

                      {application.interview_date && (
                        <div className="interview-date">
                          📅{" "}
                          {formatInterviewDate(
                            application.interview_date
                          )}
                        </div>
                      )}

                      {application.notes && (
                        <small>{application.notes}</small>
                      )}

                      <div className="card-actions">
                        <button
                          className="edit-button"
                          onClick={() =>
                            handleEdit(application)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="delete-button"
                          onClick={() =>
                            handleDelete(application.id)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ApplicationBoard;