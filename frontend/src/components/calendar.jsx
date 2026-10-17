import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarComponent from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./calendar.css";

const API_URL =
import.meta.env.VITE_API_URL ||
"https://jobtrack-ai-1-a4ie.onrender.com";

function parseInterviewDate(value) {
if (!value) return null;

const date = new Date(value);

return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(dateOne, dateTwo) {
return (
dateOne.getFullYear() === dateTwo.getFullYear() &&
dateOne.getMonth() === dateTwo.getMonth() &&
dateOne.getDate() === dateTwo.getDate()
);
}

function formatTime(value) {
const date = parseInterviewDate(value);

if (!date) return "Time unavailable";

return date.toLocaleTimeString([], {
hour: "2-digit",
minute: "2-digit",
});
}

function formatDate(date) {
return date.toLocaleDateString([], {
weekday: "long",
day: "numeric",
month: "long",
year: "numeric",
});
}

function formatShortDate(value) {
const date = parseInterviewDate(value);

if (!date) return "Date unavailable";

return date.toLocaleDateString([], {
day: "numeric",
month: "short",
});
}

function getStatusClass(status) {
return String(status || "Unknown")
.toLowerCase()
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-|-$/g, "");
}

function Calendar() {
const [applications, setApplications] = useState([]);
const [selectedDate, setSelectedDate] = useState(() => new Date());
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [retryKey, setRetryKey] = useState(0);

const loadApplications = useCallback(async (signal) => {
setLoading(true);
setError("");

try {
  const response = await fetch(`${API_URL}/jobs?limit=100`, {
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch applications");
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Unexpected applications response");
  }

  setApplications(data);
} catch (err) {
  if (err.name === "AbortError") return;

  console.error("Error loading calendar:", err);
  setError("We couldn't load your interview dates. Please try again.");
} finally {
  if (!signal.aborted) {
    setLoading(false);
  }
}

}, []);

useEffect(() => {
const controller = new AbortController();

loadApplications(controller.signal);

return () => controller.abort();

}, [loadApplications, retryKey]);

const interviews = useMemo(() => {
return applications
.filter((application) => {
return Boolean(parseInterviewDate(application.interview_date));
})
.map((application) => ({
...application,
parsedInterviewDate: parseInterviewDate(
application.interview_date
),
}))
.sort(
(a, b) =>
a.parsedInterviewDate - b.parsedInterviewDate
);
}, [applications]);

const now = new Date();

const upcomingInterviews = useMemo(() => {
const currentTime = Date.now();

return interviews.filter(
  (application) =>
    application.parsedInterviewDate.getTime() >= currentTime
);

}, [interviews]);

const selectedInterviews = useMemo(() => {
return interviews.filter((application) =>
sameDay(application.parsedInterviewDate, selectedDate)
);
}, [interviews, selectedDate]);

const hasInterviewOnDate = useCallback(
(date) => {
return interviews.some((application) =>
sameDay(application.parsedInterviewDate, date)
);
},
[interviews]
);

const handleRetry = () => {
setRetryKey((previous) => previous + 1);
};

return (
<section className="calendar-page">
<header className="calendar-header">
<div>
<span className="calendar-eyebrow">YOUR JOB SEARCH</span>
<h1>Interview Calendar</h1>
<p>
Keep track of your interviews and prepare for every opportunity.
</p>
</div>

    <div className="calendar-summary-badge">
      <span className="calendar-summary-dot" />
      <span>
        {upcomingInterviews.length} upcoming interview
        {upcomingInterviews.length !== 1 ? "s" : ""}
      </span>
    </div>
  </header>

  {loading && (
    <div className="calendar-message" role="status">
      <span className="calendar-spinner" />
      <span>Loading your interviews...</span>
    </div>
  )}

  {!loading && error && (
    <div className="calendar-error" role="alert">
      <div>
        <strong>Unable to load your calendar</strong>
        <p>{error}</p>
      </div>

      <button
        type="button"
        className="calendar-retry-button"
        onClick={handleRetry}
      >
        Try again
      </button>
    </div>
  )}

  {!loading && !error && (
    <>
      <div className="calendar-layout">
        <section className="calendar-card">
          <div className="calendar-section-heading">
            <div>
              <h2>Schedule</h2>
              <p>Select a date to view your interviews.</p>
            </div>
          </div>

          <CalendarComponent
            onChange={setSelectedDate}
            value={selectedDate}
            minDetail="month"
            next2Label={null}
            prev2Label={null}
            tileClassName={({ date, view }) => {
              if (view === "month" && hasInterviewOnDate(date)) {
                return "has-interview";
              }

              return null;
            }}
            tileContent={({ date, view }) => {
              if (view === "month" && hasInterviewOnDate(date)) {
                return (
                  <span
                    className="calendar-interview-indicator"
                    aria-hidden="true"
                  />
                );
              }

              return null;
            }}
            tileAriaLabel={({ date, view }) => {
              if (view === "month" && hasInterviewOnDate(date)) {
                return `${formatDate(date)} — interview scheduled`;
              }

              return formatDate(date);
            }}
          />

          <div className="calendar-legend">
            <span className="calendar-legend-dot" />
            <span>Interview scheduled</span>
          </div>
        </section>

        <section className="selected-date-card">
          <div className="selected-date-header">
            <div>
              <span className="calendar-card-eyebrow">
                SELECTED DATE
              </span>
              <h2>{formatDate(selectedDate)}</h2>
            </div>

            <span className="interview-count">
              {selectedInterviews.length}
            </span>
          </div>

          <p className="selected-date-caption">
            {selectedInterviews.length === 1
              ? "1 interview scheduled"
              : `${selectedInterviews.length} interviews scheduled`}
          </p>

          {selectedInterviews.length === 0 ? (
            <div className="no-interviews">
              <div className="no-interviews-icon" aria-hidden="true">
                📅
              </div>

              <h3>No interviews scheduled</h3>

              <p>
                You have no interviews on this date. Choose another date
                to check your schedule.
              </p>
            </div>
          ) : (
            <div className="interview-list">
              {selectedInterviews.map((application) => (
                <article
                  className="calendar-interview"
                  key={application.id}
                >
                  <div className="interview-time">
                    {formatTime(application.interview_date)}
                  </div>

                  <div className="interview-details">
                    <h3>{application.company || "Company not specified"}</h3>

                    <p>
                      {application.job_title || "Job title not specified"}
                    </p>

                    <span
                      className={`calendar-status status-${getStatusClass(
                        application.status
                      )}`}
                    >
                      {application.status || "Unknown status"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="upcoming-section">
        <div className="upcoming-header">
          <div>
            <span className="calendar-card-eyebrow">
              WHAT'S NEXT
            </span>
            <h2>Upcoming Interviews</h2>
            <p>
              Your next opportunities, arranged by date and time.
            </p>
          </div>

          <span className="upcoming-total">
            {upcomingInterviews.length} scheduled
          </span>
        </div>

        {upcomingInterviews.length === 0 ? (
          <div className="empty-upcoming">
            <div className="empty-upcoming-icon" aria-hidden="true">
              🎯
            </div>

            <h3>No upcoming interviews</h3>

            <p>
              When you schedule an interview in Applications, it will
              appear here automatically.
            </p>
          </div>
        ) : (
          <div className="upcoming-list">
            {upcomingInterviews.map((application) => (
              <article
                className="upcoming-interview"
                key={application.id}
              >
                <div className="upcoming-date">
                  <strong>
                    {formatShortDate(application.interview_date)}
                  </strong>

                  <span>
                    {formatTime(application.interview_date)}
                  </span>
                </div>

                <div className="upcoming-details">
                  <h3>{application.company || "Company not specified"}</h3>

                  <p>
                    {application.job_title || "Job title not specified"}
                  </p>
                </div>

                <span
                  className={`upcoming-status status-${getStatusClass(
                    application.status
                  )}`}
                >
                  {application.status || "Unknown"}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )}
</section>

);
}

export default Calendar;