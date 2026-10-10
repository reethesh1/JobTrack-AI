import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import "./ApplicationBoard.css";

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
};

function ApplicationBoard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Load applications
  const fetchApplications = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/jobs");
      setApplications(data);
    } catch (err) {
      console.error("Error loading applications:", err);
      setError(err.message || "Could not load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Handle changes to form fields
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Create or update an application
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.company.trim() || !formData.job_title.trim()) {
      setError("Company and job title are required.");
      return;
    }

    const payload = {
      company: formData.company.trim(),
      job_title: formData.job_title.trim(),
      job_url: formData.job_url.trim(),
      status: formData.status,
      notes: formData.notes.trim(),
    };

    setSaving(true);

    try {
      const savedApplication = await apiRequest(
        editingId ? `/jobs/${editingId}` : "/jobs",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

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

      setFormData({ ...emptyForm });
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error("Error saving application:", err);
      setError(err.message || "Could not save application.");
    } finally {
      setSaving(false);
    }
  };

  // Populate the form when editing an application
  const handleEdit = (application) => {
    setFormData({
      company: application.company || "",
      job_title: application.job_title || "",
      job_url: application.job_url || "",
      status: application.status || "Applied",
      notes: application.notes || "",
    });

    setEditingId(application.id);
    setShowForm(true);
    setError("");
  };

  // Delete an application
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await apiRequest(`/jobs/${id}`, {
        method: "DELETE",
      });

      setApplications((previousApplications) =>
        previousApplications.filter(
          (application) => application.id !== id
        )
      );
    } catch (err) {
      console.error("Error deleting application:", err);
      setError(err.message || "Could not delete application.");
    }
  };

  // Cancel adding or editing
  const handleCancel = () => {
    setFormData({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setError("");
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
              setFormData({ ...emptyForm });
              setEditingId(null);
              setError("");
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
              <label htmlFor="company">Company *</label>
              <input
                id="company"
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="e.g. Google"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="job_title">Job Title *</label>
              <input
                id="job_title"
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                placeholder="e.g. AI Intern"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="job_url">Job URL</label>
              <input
                id="job_url"
                type="url"
                name="job_url"
                value={formData.job_url}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
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

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add notes about this application..."
              rows="3"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="submit-button"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Application"
                : "Save Application"}
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
                    (application) => application.status === status
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

                      {application.notes && (
                        <small>{application.notes}</small>
                      )}

                      <div className="card-actions">
                        <button
                          className="edit-button"
                          onClick={() => handleEdit(application)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-button"
                          onClick={() => handleDelete(application.id)}
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