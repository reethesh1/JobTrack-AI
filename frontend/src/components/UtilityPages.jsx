import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { jsPDF } from "jspdf";
import "./UtilityPages.css";

const emptyProfile = {
  fullName: "",
  email: "",
  targetRole: "",
  location: "",
  linkedin: "",
  portfolio: "",
};

function useApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/jobs")
      .then((data) => { if (active) setApplications(data); })
      .catch(() => { if (active) setError("Could not load applications. Check the backend connection in Settings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { applications, loading, error };
}

export function Analytics() {
  const { applications, loading, error } = useApplications();
  const statuses = useMemo(() => {
    const counts = {};
    applications.forEach((application) => {
      const label = application.status || "Unknown";
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [applications]);
  const interviews = applications.filter((item) => item.interview_date).length;
  const responseRate = applications.length
    ? Math.round(((applications.length - (statuses.find(([name]) => name.toLowerCase() === "rejected")?.[1] || 0)) / applications.length) * 100)
    : 0;

  return (
    <section className="utility-page">
      <header className="utility-header"><div><h1>Analytics</h1><p>A live overview of your application pipeline.</p></div></header>
      {loading && <p className="utility-message">Loading analytics…</p>}
      {error && <p className="utility-error">{error}</p>}
      {!loading && !error && <>
        <div className="utility-metric-grid">
          <Metric label="Total applications" value={applications.length} />
          <Metric label="Interviews scheduled" value={interviews} />
          <Metric label="Active pipeline" value={applications.filter((item) => !["rejected", "offer received", "offer", "offers"].includes((item.status || "").toLowerCase())).length} />
          <Metric label="Non-rejected share" value={`${responseRate}%`} />
        </div>
        <div className="utility-card"><h2>Applications by status</h2>
          {statuses.length === 0 ? <p className="utility-muted">No applications yet. Add one on the Applications page to see analytics.</p> : statuses.map(([name, count]) => (
            <div className="analytics-row" key={name}>
              <div className="analytics-label"><span>{name}</span><strong>{count}</strong></div>
              <div className="analytics-track"><div className="analytics-fill" style={{ width: `${applications.length ? (count / applications.length) * 100 : 0}%` }} /></div>
            </div>
          ))}
        </div>
      </>}
    </section>
  );
}

function Metric({ label, value }) {
  return <div className="utility-metric"><span>{label}</span><strong>{value}</strong></div>;
}

export function ResumeBuilder() {
  const defaultResume = {
    ...emptyProfile,
    summary: "",
    skills: "",
    education: "",
    experience: "",
    projects: "",
  };

  const [resume, setResume] = useState(() => {
    try {
      return {
        ...defaultResume,
        ...JSON.parse(localStorage.getItem("jobtrack-resume") || "{}"),
      };
    } catch {
      return defaultResume;
    }
  });

  const [template, setTemplate] = useState(() => {
    return localStorage.getItem("jobtrack-resume-template") || "professional";
  });

  const [message, setMessage] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load profile details without overwriting existing resume information.
  useEffect(() => {
    let active = true;

    apiRequest("/profile")
      .then((data) => {
        if (!active) return;

        setResume((previous) => ({
          ...previous,
          fullName: previous.fullName || data.fullName || "",
          email: previous.email || data.email || "",
          targetRole: previous.targetRole || data.targetRole || "",
          location: previous.location || data.location || "",
          linkedin: previous.linkedin || data.linkedin || "",
          portfolio: previous.portfolio || data.portfolio || "",
        }));
      })
      .catch(() => {
        // The builder remains usable if the profile API is unavailable.
      })
      .finally(() => {
        if (active) setProfileLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Update an individual field.
  const update = (event) => {
    const { name, value } = event.target;

    setResume((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  };

  // Save resume details and template selection.
  const save = () => {
    try {
      localStorage.setItem("jobtrack-resume", JSON.stringify(resume));
      localStorage.setItem("jobtrack-resume-template", template);
      setMessage("Resume details saved successfully.");
    } catch {
      setMessage("Could not save your resume. Check your browser storage.");
    }
  };

  // Keep the resume preview and PDF consistent using the same template choice.
  const templates = {
    professional: {
      label: "Professional",
      description: "Clean headings and subtle dividers",
    },
    modern: {
      label: "Modern",
      description: "Bold header with a contemporary layout",
    },
    minimal: {
      label: "Minimal",
      description: "Simple, ATS-friendly single column",
    },
  };

  const sections = [
    ["summary", "Professional Summary", resume.summary],
    ["skills", "Technical Skills", resume.skills],
    ["experience", "Employment History", resume.experience],
    ["education", "Education", resume.education],
    ["projects", "Projects", resume.projects],
  ];

  const contactDetails = [
    resume.email,
    resume.location,
    resume.linkedin,
    resume.portfolio,
  ].filter((item) => item && item.trim());

  // Generate a PDF in A4 format using the selected template.
  const downloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const modern = template === "modern";
      const minimal = template === "minimal";

      const primaryColor = modern ? [30, 64, 175] : [31, 41, 55];

      const addPageIfNeeded = (height = 8) => {
        if (y + height > pageHeight - 18) {
          doc.addPage();
          y = 20;
        }
      };

      const addWrappedText = (text, options = {}) => {
        if (!text || !String(text).trim()) return;

        const {
          fontSize = 10,
          bold = false,
          lineHeight = 5,
          indent = 0,
        } = options;

        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(fontSize);

        const lines = doc.splitTextToSize(
          String(text).trim(),
          contentWidth - indent
        );

        lines.forEach((line) => {
          addPageIfNeeded(lineHeight);

          doc.text(line, margin + indent, y);
          y += lineHeight;
        });
      };

      const addSection = (title, content) => {
        if (!content || !String(content).trim()) return;

        addPageIfNeeded(20);
        y += 4;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.text(title.toUpperCase(), margin, y);

        y += 2;

        if (!minimal) {
          doc.setDrawColor(...primaryColor);
          doc.setLineWidth(0.3);
          doc.line(margin, y, pageWidth - margin, y);
        }

        y += 6;
        doc.setTextColor(55, 65, 81);

        addWrappedText(content, {
          fontSize: 9.5,
          lineHeight: 4.8,
        });
      };

      // Header.
      doc.setTextColor(...primaryColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(modern ? 24 : 21);

      const nameLines = doc.splitTextToSize(
        resume.fullName.trim() || "Your Name",
        contentWidth
      );

      nameLines.forEach((line) => {
        addPageIfNeeded(10);
        doc.text(line, margin, y);
        y += 9;
      });

      if (resume.targetRole.trim()) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(
          doc.splitTextToSize(resume.targetRole.trim(), contentWidth),
          margin,
          y
        );
        y += 7;
      }

      y += 1;

      // Contact information.
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(75, 85, 99);

      if (contactDetails.length) {
        const contactText = contactDetails.join("  |  ");
        const contactLines = doc.splitTextToSize(
          contactText,
          contentWidth
        );

        contactLines.forEach((line) => {
          addPageIfNeeded(5);
          doc.text(line, margin, y);
          y += 4.5;
        });
      }

      y += 2;

      // Main resume sections.
      sections.forEach(([, title, content]) => {
        addSection(title, content);
      });

      // Add page numbers to every page.
      const pageCount = doc.getNumberOfPages();

      for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);

        doc.text(
          `Page ${page} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 8,
          { align: "right" }
        );
      }

      const fileName = (resume.fullName || "my-resume")
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "");

      doc.save(`${fileName || "my-resume"}.pdf`);

      setMessage("Your PDF resume has been downloaded.");
    } catch (error) {
      console.error("Resume PDF generation failed:", error);
      setMessage("Could not generate the PDF. Please try again.");
    }
  };

  const fields = [
    ["fullName", "Full name", "text"],
    ["targetRole", "Target role", "text"],
    ["email", "Email", "email"],
    ["location", "Location", "text"],
    ["linkedin", "LinkedIn URL", "url"],
    ["portfolio", "Portfolio URL", "url"],
  ];

  return (
    <section className="utility-page resume-builder-page">
      <header className="utility-header">
        <div>
          <h1>Resume Builder</h1>
          <p>
            Create your resume and preview it as you type.
          </p>
        </div>
      </header>

      <div className="resume-template-selector">
        <div>
          <h2>Choose a template</h2>
          <p>Switch designs without re-entering your details.</p>
        </div>

        <div className="resume-template-options">
          {Object.entries(templates).map(([key, item]) => (
            <button
              key={key}
              type="button"
              className={`resume-template-option ${
                template === key ? "active" : ""
              }`}
              aria-pressed={template === key}
              onClick={() => {
                setTemplate(key);
                localStorage.setItem("jobtrack-resume-template", key);
                setMessage("");
              }}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="resume-editor-layout">
        {/* LEFT: Editable form */}
        <div className="resume-editor-panel">
          <div className="resume-panel-heading">
            <h2>Your details</h2>
            <span>
              {profileLoaded ? "Profile loaded" : "Loading profile..."}
            </span>
          </div>

          <div className="resume-editor-card">
            <h3>Personal information</h3>

            <div className="resume-form-grid">
              {fields.map(([name, label, type]) => (
                <label className="utility-field" key={name}>
                  {label}
                  <input
                    name={name}
                    type={type}
                    value={resume[name] || ""}
                    onChange={update}
                    placeholder={label}
                  />
                </label>
              ))}
            </div>

            {sections.map(([name, label]) => (
              <label className="utility-field" key={name}>
                {label}
                <textarea
                  name={name}
                  value={resume[name] || ""}
                  onChange={update}
                  rows={name === "summary" ? 4 : 5}
                  placeholder={`Enter your ${label.toLowerCase()}...`}
                />
              </label>
            ))}

            <div className="utility-actions">
              <button type="button" onClick={save}>
                Save details
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={downloadPDF}
              >
                Download PDF
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  const text = [
                    resume.fullName,
                    resume.targetRole,
                    ...contactDetails,
                    "",
                    ...sections.flatMap(([, title, content]) => [
                      title.toUpperCase(),
                      content || "",
                      "",
                    ]),
                  ].join("\n");

                  const blob = new Blob([text], {
                    type: "text/plain;charset=utf-8",
                  });

                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");

                  anchor.href = url;
                  anchor.download = "resume.txt";
                  anchor.click();

                  URL.revokeObjectURL(url);
                }}
              >
                Download TXT
              </button>
            </div>

            {message && (
              <p className="utility-success" role="status">
                {message}
              </p>
            )}

            <p className="utility-muted">
              Your resume details are saved in this browser when you
              select Save details.
            </p>
          </div>
        </div>

        {/* RIGHT: Live A4 preview */}
        <div className="resume-preview-panel">
          <div className="resume-panel-heading">
            <h2>Live preview</h2>
            <span>A4 document</span>
          </div>

          <div className="resume-paper-container">
            <article
              className={`resume-paper resume-template-${template}`}
              aria-label="Resume preview"
            >
              <header className="resume-paper-header">
                <h1>{resume.fullName.trim() || "Your Name"}</h1>

                {resume.targetRole.trim() && (
                  <p className="resume-paper-role">
                    {resume.targetRole}
                  </p>
                )}

                {contactDetails.length > 0 && (
                  <div className="resume-paper-contact">
                    {contactDetails.map((item, index) => (
                      <span key={`${item}-${index}`}>
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </header>

              {sections.map(([name, title, content]) => (
                <section
                  className="resume-paper-section"
                  key={name}
                >
                  <h2>{title}</h2>

                  <div className="resume-paper-content">
                    {content.trim()
                      ? content
                      : `Your ${title.toLowerCase()} will appear here.`}
                  </div>
                </section>
              ))}
            </article>
          </div>

          <p className="utility-muted resume-preview-note">
            Preview updates as you type. The downloaded PDF uses
            the selected template.
          </p>
        </div>
      </div>
    </section>
  );
}


export function Profile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  useEffect(() => {
    let active = true;

    apiRequest("/profile")
      .then((data) => {
        if (!active) return;

        setProfile({
          fullName: data.fullName || "",
          email: data.email || "",
          targetRole: data.targetRole || "",
          location: data.location || "",
          linkedin: data.linkedin || "",
          portfolio: data.portfolio || "",
        });
      })
      .catch(() => {
        if (active) {
          setError("Could not load your profile. Please check the backend connection and try refreshing.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);




  const update = (event) => {
    setProfile((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      await apiRequest("/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      setMessage("Profile saved successfully to the database.");
    } catch {
      setError("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ["fullName", "Full name", "text"],
    ["email", "Email", "email"],
    ["targetRole", "Target role", "text"],
    ["location", "Location", "text"],
    ["linkedin", "LinkedIn URL", "url"],
    ["portfolio", "Portfolio URL", "url"],
  ];

  return (
    <section className="utility-page">
      <header className="utility-header">
        <div>
          <h1>Profile</h1>
          <p>Keep your career details handy for applications.</p>
        </div>
      </header>

      <form className="utility-card" onSubmit={save}>
        {loading ? (
          <p className="utility-message">Loading your profile...</p>
        ) : (
          <>
            <div className="resume-form-grid">
              {fields.map(([name, label, type]) => (
                <label className="utility-field" key={name}>
                  {label}
                  <input
                    name={name}
                    type={type}
                    value={profile[name]}
                    onChange={update}
                    placeholder={label}
                  />
                </label>
              ))}
            </div>

            <div className="utility-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>

            {message && (
              <p className="utility-success" role="status">
                {message}
              </p>
            )}

            {error && (
              <p className="utility-error" role="alert">
                {error}
              </p>
            )}

            <p className="utility-muted">
              Your profile is saved in the JobTrack-AI database.
            </p>
          </>
        )}
      </form>
    </section>
  );
}

export function Settings() {
return (
<section className="utility-page">
<header className="utility-header">
<div>
<h1>Settings</h1>
<p>Manage your preferences and learn how your data is stored.</p>
</div>
</header>

  <div className="utility-card">
    <h2>Application status</h2>

    <p className="utility-muted">
      JobTrack-AI is configured to connect to its services
      automatically. You can manage your job applications,
      profile, and career information from your dashboard.
    </p>
  </div>

  <div className="utility-card">
    <h2>Data and privacy</h2>

    <p className="utility-muted">
      Your job applications and profile information are stored
      in the JobTrack-AI database associated with your account.
      Resume Builder details and template preferences are stored
      locally in your browser.
    </p>

    <p className="utility-muted">
      For your security, avoid including passwords or other
      sensitive personal information in application notes.
    </p>
  </div>

  <div className="utility-card">
    <h2>Need help?</h2>

    <p className="utility-muted">
      If something isn't working correctly, try refreshing
      the page. If the problem continues, please try again later.
    </p>
  </div>
</section>

);
}