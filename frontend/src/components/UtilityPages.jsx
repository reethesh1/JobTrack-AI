import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../lib/api";
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
  const [resume, setResume] = useState(() => {
    try { return { ...emptyProfile, summary: "", skills: "", education: "", experience: "", projects: "", ...JSON.parse(localStorage.getItem("jobtrack-resume") || "{}") }; }
    catch { return { ...emptyProfile, summary: "", skills: "", education: "", experience: "", projects: "" }; }
  });
  const [message, setMessage] = useState("");
  const update = (event) => setResume((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const save = () => {
    localStorage.setItem("jobtrack-resume", JSON.stringify(resume));
    setMessage("Resume details saved in this browser.");
  };
  const download = () => {
    const content = [resume.fullName, resume.targetRole, resume.email, resume.location, resume.linkedin, resume.portfolio, "", "PROFESSIONAL SUMMARY", resume.summary, "", "SKILLS", resume.skills, "", "EXPERIENCE", resume.experience, "", "EDUCATION", resume.education, "", "PROJECTS", resume.projects].filter((line) => line !== undefined).join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(resume.fullName || "my").trim().replace(/\s+/g, "-")}-resume.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Resume text downloaded. Review its formatting before applying.");
  };
  const fields = [
    ["fullName", "Full name", "text"], ["email", "Email", "email"], ["targetRole", "Target role", "text"],
    ["location", "Location", "text"], ["linkedin", "LinkedIn URL", "url"], ["portfolio", "Portfolio URL", "url"],
  ];
  return <section className="utility-page"><header className="utility-header"><div><h1>Resume Builder</h1><p>Draft and save your resume details in this browser.</p></div></header>
    <div className="utility-card"><div className="resume-form-grid">{fields.map(([name, label, type]) => <label className="utility-field" key={name}>{label}<input name={name} type={type} value={resume[name] || ""} onChange={update} placeholder={label} /></label>)}</div>
      {[["summary", "Professional summary"], ["skills", "Skills (separate skills with commas)"], ["experience", "Experience"], ["education", "Education"], ["projects", "Projects"]].map(([name, label]) => <label className="utility-field" key={name}>{label}<textarea name={name} value={resume[name] || ""} onChange={update} rows={name === "summary" ? 3 : 4} placeholder={`Add your ${label.toLowerCase()}…`} /></label>)}
      <div className="utility-actions"><button onClick={save}>Save details</button><button className="secondary-button" onClick={download}>Download resume text</button></div>{message && <p className="utility-success" role="status">{message}</p>}
      <p className="utility-muted">This lightweight builder exports plain text, not a formatted PDF or DOCX. Your details stay in this browser unless you download them.</p>
    </div></section>;
}

export function Profile() {
  const [profile, setProfile] = useState(() => {
    try { return { ...emptyProfile, ...JSON.parse(localStorage.getItem("jobtrack-profile") || "{}") }; }
    catch { return emptyProfile; }
  });
  const [message, setMessage] = useState("");
  const update = (event) => setProfile((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const save = (event) => { event.preventDefault(); localStorage.setItem("jobtrack-profile", JSON.stringify(profile)); setMessage("Profile saved in this browser."); };
  return <section className="utility-page"><header className="utility-header"><div><h1>Profile</h1><p>Keep your career details handy for applications.</p></div></header>
    <form className="utility-card" onSubmit={save}><div className="resume-form-grid">{[["fullName", "Full name", "text"], ["email", "Email", "email"], ["targetRole", "Target role", "text"], ["location", "Location", "text"], ["linkedin", "LinkedIn URL", "url"], ["portfolio", "Portfolio URL", "url"]].map(([name, label, type]) => <label className="utility-field" key={name}>{label}<input name={name} type={type} value={profile[name]} onChange={update} placeholder={label} /></label>)}</div><div className="utility-actions"><button type="submit">Save profile</button></div>{message && <p className="utility-success" role="status">{message}</p>}<p className="utility-muted">Profile information is stored locally in this browser, not in a user account or the server database.</p></form>
  </section>;
}

export function Settings() {
  const [apiStatus, setApiStatus] = useState("Not checked yet");
  const [checking, setChecking] = useState(false);
  const check = async () => {
    setChecking(true); setApiStatus("Checking…");
    try {
      const response = await fetch(`${API_URL}/health`);
      if (!response.ok) throw new Error("Backend returned an error");
      const data = await response.json();
      setApiStatus(data.status === "ok" ? "Connected" : "Unexpected response");
    } catch { setApiStatus("Not reachable — check Render deployment and CORS settings."); }
    finally { setChecking(false); }
  };
  return <section className="utility-page"><header className="utility-header"><div><h1>Settings</h1><p>Check your deployment and local preferences.</p></div></header>
    <div className="utility-card"><h2>Backend connection</h2><p className="utility-muted">API endpoint: <code>{API_URL}</code></p><div className="settings-status"><span>Connection status</span><strong>{apiStatus}</strong></div><button onClick={check} disabled={checking}>{checking ? "Checking…" : "Test backend connection"}</button></div>
    <div className="utility-card"><h2>Data and privacy</h2><p className="utility-muted">Job applications are stored in your connected database. Profile and resume-builder details are stored locally in this browser. Do not enter passwords or other sensitive information in application notes.</p></div>
  </section>;
}
