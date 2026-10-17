import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import "./ApplicationBoard.css";

const statuses = [
  "Applied",
  "In Progress",
  "Interview",
  "Offer Received",
  "Rejected",
];

const statusStyles = {
  Applied: "status-applied",
  "In Progress": "status-progress",
  Interview: "status-interview",
  "Offer Received": "status-offer",
  Rejected: "status-rejected",
};

const statusIcons = {
  Applied: "📨",
  "In Progress": "⏳",
  Interview: "🎯",
  "Offer Received": "🎉",
  Rejected: "↩️",
};

const emptyForm = {
  company: "",
  job_title: "",
  job_url: "",
  status: "Applied",
  notes: "",
  interview_date: "",
};

function toLocalDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function ApplicationBoard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const fetchApplications = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/jobs");
      setApplications(Array.isArray(data) ? data : []);
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

  const filteredApplications = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return applications
      .filter((application) => {
        const matchesSearch =
          application.company?.toLowerCase().includes(search) ||
          application.job_title?.toLowerCase().includes(search);

        const matchesStatus =
          statusFilter === "All" ||
          application.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "company") {
          return (a.company || "").localeCompare(b.company || "");
        }

        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();

        return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
      });
  }, [applications, searchTerm, statusFilter, sortBy]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const openNewForm = () => {
    setFormData({ ...emptyForm });
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.company.trim() || !formData.job_title.trim()) {
      setError("Company and job title are required.");
      return;
    }

    let interviewDate = null;

    if (formData.interview_date) {
      const parsedDate = new Date(formData.interview_date);

      if (Number.isNaN(parsedDate.getTime())) {
        setError("Please enter a valid interview date and time.");
        return;
      }

      interviewDate = parsedDate.toISOString();
    }

    const payload = {
      company: formData.company.trim(),
      job_title: formData.job_title.trim(),
      job_url: formData.job_url.trim(),
      status: formData.status,
      notes: formData.notes.trim(),
      interview_date: interviewDate,
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

  const handleEdit = (application) => {
    setFormData({
      company: application.company || "",
      job_title: application.job_title || "",
      job_url: application.job_url || "",
      status: application.status || "Applied",
      notes: application.notes || "",
      interview_date: toLocalDateTime(application.interview_date),
    });

    setEditingId(application.id);
    setShowForm(true);
    setError("");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application? This action cannot be undone."
    );

    if (!confirmed) return;

    setError("");
    setDeletingId(id);

    try {
      await apiRequest(`/jobs/${id}`, {
        method: "DELETE",
      });

      setApplications((previousApplications) =>
        previousApplications.filter((application) => application.id !== id)
      );
    } catch (err) {
      console.error("Error deleting application:", err);
      setError(err.message || "Could not delete application.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancel = () => {
    setFormData({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const totalApplications = applications.length;

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setSortBy("newest");
  };

  return (
    <section className="application-board">
      <header className="board-header">
        <div className="board-heading">
          <span className="board-eyebrow">YOUR JOB SEARCH</span>
          <h1>Applications</h1>
          <p>Organise your opportunities and keep your career moving forward.</p>
        </div>

        <button
          type="button"
          className="add-application-button"
          onClick={showForm ? handleCancel : openNewForm}
        >
          <span>{showForm ? "×" : "+"}</span>
          {showForm ? "Cancel" : "Add Application"}
        </button>
      </header>

      <div className="application-summary">
        <div className="summary-icon">📁</div>
        <div>
          <span className="summary-label">Applications tracked</span>
          <strong className="summary-value">{totalApplications}</strong>
        </div>
        <div className="summary-divider" />
        <div className="summary-description">
          <strong>{filteredApplications.length} shown</strong>
          <span>Matching your current search and filters</span>
        </div>
      </div>

      {showForm && (
        <form className="application-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <div>
              <span className="board-eyebrow">
                {editingId ? "UPDATE DETAILS" : "NEW OPPORTUNITY"}
              </span>
              <h2>{editingId ? "Edit application" : "Add an application"}</h2>
              <p>
                {editingId
                  ? "Update the details of this opportunity."
                  : "Record a job opportunity to keep everything organised."}
              </p>
            </div>
            <span className="form-heading-icon">✍️</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="company">Company name <span>*</span></label>
              <input
                id="company"
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="e.g. Google"
                autoComplete="organization"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="job_title">Job title <span>*</span></label>
              <input
                id="job_title"
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                placeholder="e.g. AI/ML Intern"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="job_url">Job posting URL</label>
              <input
                id="job_url"
                type="url"
                name="job_url"
                value={formData.job_url}
                onChange={handleChange}
                placeholder="https://example.com/careers"
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Application status</label>
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
            <label htmlFor="interview_date">Interview date and time</label>
            <input
              id="interview_date"
              type="datetime-local"
              name="interview_date"
              value={formData.interview_date}
              onChange={handleChange}
            />
            <small>
              Optional. Scheduled interviews can appear in your calendar.
            </small>

            {formData.interview_date && (
              <button
                type="button"
                className="clear-date-button"
                onClick={() =>
                  setFormData((previousData) => ({
                    ...previousData,
                    interview_date: "",
                  }))
                }
              >
                Clear interview date
              </button>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add recruiter details, application deadlines, or follow-up notes..."
              rows={3}
            />
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-form-button"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Save Application"}
            </button>
          </div>
        </form>
      )}

      {!showForm && error && (
        <div className="board-error" role="alert">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchApplications}>
            Try again
          </button>
        </div>
      )}

      <div className="application-toolbar">
        <div className="search-wrapper">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            aria-label="Search applications"
            placeholder="Search companies or job titles..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-button"
              aria-label="Clear search"
              onClick={() => setSearchTerm("")}
            >
              ×
            </button>
          )}
        </div>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="All">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort applications"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="company">Company name (A–Z)</option>
        </select>

        {(searchTerm || statusFilter !== "All" || sortBy !== "newest") && (
          <button
            type="button"
            className="reset-filters-button"
            onClick={clearFilters}
          >
            Reset
          </button>
        )}
      </div>

      {loading ? (
        <div className="board-loading">
          <span className="loading-spinner" />
          <p>Loading your applications...</p>
        </div>
      ) : (
        <>
          <div className="board-caption">
            <div>
              <h2>Application pipeline</h2>
              <p>Move forward one opportunity at a time.</p>
            </div>
            <span className="pipeline-count">
              {filteredApplications.length}{" "}
              {filteredApplications.length === 1 ? "result" : "results"}
            </span>
          </div>

          <div className="board">
            {statuses.map((status) => {
              const statusApplications = filteredApplications.filter(
                (application) => application.status === status
              );

              return (
                <section
                  className={`status-column ${statusStyles[status]}`}
                  key={status}
                >
                  <div className="status-title">
                    <div className="status-title-main">
                      <span className="status-icon" aria-hidden="true">
                        {statusIcons[status]}
                      </span>
                      <h3>{status}</h3>
                    </div>
                    <span className="status-count">
                      {statusApplications.length}
                    </span>
                  </div>

                  <div className="application-list">
                    {statusApplications.length === 0 ? (
                      <div className="empty-state">
                        <span aria-hidden="true">📭</span>
                        <p>
                          {searchTerm || statusFilter !== "All"
                            ? "No matching applications"
                            : "Nothing here yet"}
                        </p>
                      </div>
                    ) : (
                      statusApplications.map((application) => (
                        <article
                          className="application-card"
                          key={application.id}
                        >
                          <div className="application-card-top">
                            <div className="company-avatar" aria-hidden="true">
                              {(application.company || "?")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div className="application-card-heading">
                              <h4>{application.company}</h4>
                              <p>{application.job_title}</p>
                            </div>
                          </div>

                          <div className="application-card-status">
                            <span className={`status-badge ${statusStyles[status]}`}>
                              {status}
                            </span>
                          </div>

                          {application.interview_date && (
                            <div className="application-interview-date">
                              <span aria-hidden="true">📅</span>
                              <div>
                                <strong>Interview scheduled</strong>
                                <p>
                                  {new Date(
                                    application.interview_date
                                  ).toLocaleString([], {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })}
                                </p>
                              </div>
                            </div>
                          )}

                          {application.notes && (
                            <p className="application-notes">
                              {application.notes}
                            </p>
                          )}

                          {application.job_url && (
                            <a
                              className="job-link"
                              href={application.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View job posting <span aria-hidden="true">↗</span>
                            </a>
                          )}

                          <div className="card-actions">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => handleEdit(application)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => handleDelete(application.id)}
                              disabled={deletingId === application.id}
                            >
                              {deletingId === application.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default ApplicationBoard;
