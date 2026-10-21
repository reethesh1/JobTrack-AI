import { useCallback, useEffect, useState } from "react";
import { apiRequest, getAccessToken } from "../lib/api";
import "./ImportReview.css";

function getImportId(item) {
return item.id ?? item.import_id;
}

function getErrorMessage(error) {
return error instanceof Error ? error.message : "Something went wrong.";
}

function formatDate(value) {
if (!value) return "—";

const date = new Date(value);

return Number.isNaN(date.getTime())
? String(value)
: date.toLocaleString();
}

function getItems(data) {
if (Array.isArray(data)) return data;
if (Array.isArray(data?.items)) return data.items;
if (Array.isArray(data?.imports)) return data.imports;
if (Array.isArray(data?.results)) return data.results;

return [];
}

export default function ImportReview() {
const [authenticated, setAuthenticated] = useState(
() => Boolean(getAccessToken())
);

const [pendingImports, setPendingImports] = useState([]);
const [history, setHistory] = useState([]);
const [activeTab, setActiveTab] = useState("pending");

const [loading, setLoading] = useState(false);
const [actionId, setActionId] = useState(null);
const [error, setError] = useState("");
const [notice, setNotice] = useState("");

const loadImports = useCallback(async () => {
if (!getAccessToken()) {
setAuthenticated(false);
setPendingImports([]);
setHistory([]);
return;
}


setLoading(true);
setError("");

try {
  const [pendingResult, historyResult] = await Promise.all([
    apiRequest("/imports/pending"),
    apiRequest("/imports/history"),
  ]);

  setPendingImports(getItems(pendingResult));
  setHistory(getItems(historyResult));
  setAuthenticated(true);
} catch (err) {
  const message = getErrorMessage(err);

  if (
    message.toLowerCase().includes("token") ||
    message.toLowerCase().includes("credentials")
  ) {
    setAuthenticated(false);
  }

  setError(message);
} finally {
  setLoading(false);
}


}, []);

useEffect(() => {
if (getAccessToken()) {
loadImports();
} else {
setAuthenticated(false);
}
}, [loadImports]);

async function handleAction(importId, action) {
if (importId === undefined || importId === null) {
setError("This import has no ID. Please check the backend response.");
return;
}


setActionId(importId);
setError("");
setNotice("");

try {
  await apiRequest(
    `/imports/${encodeURIComponent(importId)}/${action}`,
    { method: "POST" }
  );

  setNotice(
    action === "approve"
      ? "Import approved successfully!"
      : "Import rejected successfully!"
  );

  await loadImports();
} catch (err) {
  setError(getErrorMessage(err));
} finally {
  setActionId(null);
}
```

}

if (!authenticated) {
return ( <section className="import-review-page"> <header className="import-review-header"> <div> <h1>Import Review</h1> <p>Sign in to review your imported jobs.</p> </div> </header>


    <div className="import-empty-state">
      <h2>Login required</h2>
      <p>
        Sign in to your JobTrack-AI account to access your import queue.
      </p>
      <a href="/login">Go to Login</a>

      {error && (
        <p className="import-error" role="alert">
          {error}
        </p>
      )}
    </div>
  </section>
);
```

}

const displayedImports =
activeTab === "pending" ? pendingImports : history;

return ( <section className="import-review-page"> <header className="import-review-header"> <div> <h1>Import Review</h1> <p>Review job imports before adding them to your tracker.</p> </div>

```
    <div className="import-header-actions">
      <button
        type="button"
        onClick={loadImports}
        disabled={loading || actionId !== null}
      >
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  </header>

  <div className="import-summary">
    <article className="import-summary-card">
      <span>Pending imports</span>
      <strong>{pendingImports.length}</strong>
    </article>

    <article className="import-summary-card">
      <span>Import history</span>
      <strong>{history.length}</strong>
    </article>
  </div>

  <div className="import-tabs" role="tablist" aria-label="Import views">
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === "pending"}
      className={activeTab === "pending" ? "active" : ""}
      onClick={() => setActiveTab("pending")}
    >
      Pending ({pendingImports.length})
    </button>

    <button
      type="button"
      role="tab"
      aria-selected={activeTab === "history"}
      className={activeTab === "history" ? "active" : ""}
      onClick={() => setActiveTab("history")}
    >
      History ({history.length})
    </button>
  </div>

  {error && (
    <div className="import-message import-error" role="alert">
      {error}
    </div>
  )}

  {notice && (
    <div className="import-message import-success" role="status">
      {notice}
    </div>
  )}

  {loading && displayedImports.length === 0 ? (
    <div className="import-empty-state">
      <p>Loading imports...</p>
    </div>
  ) : displayedImports.length === 0 ? (
    <div className="import-empty-state">
      <span className="import-empty-icon">📥</span>
      <h2>
        {activeTab === "pending"
          ? "No pending imports"
          : "No import history yet"}
      </h2>
      <p>
        {activeTab === "pending"
          ? "New job imports awaiting your review will appear here."
          : "Approved and rejected imports will appear here."}
      </p>
    </div>
  ) : (
    <div className="import-list">
      {displayedImports.map((item, index) => {
        const importId = getImportId(item);
        const company =
          item.company || item.company_name || "Unknown company";
        const jobTitle =
          item.job_title || item.title || item.position || "Untitled role";
        const source = item.source || "unknown";
        const status = item.review_status || item.status || "pending";
        const isPending = activeTab === "pending";

        return (
          <article
            className="import-card"
            key={importId ?? `${company}-${jobTitle}-${index}`}
          >
            <div className="import-card-top">
              <div>
                <span className="import-source">
                  {String(source).replaceAll("_", " ")}
                </span>

                <h2>{jobTitle}</h2>
                <p className="import-company">{company}</p>
              </div>

              <span
                className={`import-status status-${String(status)
                  .toLowerCase()
                  .replaceAll(" ", "-")}`}
              >
                {String(status).replaceAll("_", " ")}
              </span>
            </div>

            {item.job_url && (
              <p>
                <strong>Job link: </strong>
                <a
                  href={item.job_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View job posting ↗
                </a>
              </p>
            )}

            {item.notes && (
              <p className="import-notes">{item.notes}</p>
            )}

            <div className="import-card-footer">
              <span>
                {formatDate(
                  item.created_at || item.imported_at || item.createdAt
                )}
              </span>

              {isPending && (
                <div className="import-card-actions">
                  <button
                    type="button"
                    onClick={() => handleAction(importId, "approve")}
                    disabled={actionId !== null || loading}
                  >
                    {actionId === importId
                      ? "Processing..."
                      : "✓ Approve"}
                  </button>

                  <button
                    type="button"
                    className="import-reject-button"
                    onClick={() => handleAction(importId, "reject")}
                    disabled={actionId !== null || loading}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  )}
</section>

);
}