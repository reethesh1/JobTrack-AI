import { useEffect, useState } from "react";
import CalendarComponent from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./calendar.css";

const API_URL = "https://jobtrack-ai-1-a4ie.onrender.com";

function Calendar() {
  const [applications, setApplications] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/jobs?limit=100`)
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
        console.error("Error loading calendar:", error);
        setError("Could not load interview dates.");
        setLoading(false);
      });
  }, []);

  const interviews = applications.filter(
    (application) => application.interview_date
  );

  const sameDay = (dateOne, dateTwo) => {
    return (
      dateOne.getFullYear() === dateTwo.getFullYear() &&
      dateOne.getMonth() === dateTwo.getMonth() &&
      dateOne.getDate() === dateTwo.getDate()
    );
  };

  const selectedInterviews = interviews.filter((application) =>
    sameDay(
      new Date(application.interview_date),
      selectedDate
    )
  );

  const hasInterviewOnDate = (date) => {
    return interviews.some((application) =>
      sameDay(
        new Date(application.interview_date),
        date
      )
    );
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <section className="calendar-page">
      <div className="calendar-header">
        <div>
          <h1>Interview Calendar</h1>
          <p>
            Keep track of your upcoming interviews and important dates.
          </p>
        </div>
      </div>

      {loading && (
        <div className="calendar-message">
          Loading calendar...
        </div>
      )}

      {error && (
        <div className="calendar-error">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="calendar-layout">
          <div className="calendar-card">
            <CalendarComponent
              onChange={setSelectedDate}
              value={selectedDate}
              tileClassName={({ date, view }) => {
                if (
                  view === "month" &&
                  hasInterviewOnDate(date)
                ) {
                  return "has-interview";
                }

                return null;
              }}
            />
          </div>

          <div className="selected-date-card">
            <div className="selected-date-header">
              <h2>{formatDate(selectedDate)}</h2>

              <span>
                {selectedInterviews.length} interview
                {selectedInterviews.length !== 1 ? "s" : ""}
              </span>
            </div>

            {selectedInterviews.length === 0 && (
              <div className="no-interviews">
                <div className="no-interviews-icon">📅</div>

                <h3>No interviews scheduled</h3>

                <p>
                  There are no interviews scheduled for this date.
                </p>
              </div>
            )}

            {selectedInterviews.length > 0 && (
              <div className="interview-list">
                {selectedInterviews.map((application) => (
                  <div
                    className="calendar-interview"
                    key={application.id}
                  >
                    <div className="interview-time">
                      {formatTime(application.interview_date)}
                    </div>

                    <div className="interview-details">
                      <h3>{application.company}</h3>

                      <p>{application.job_title}</p>

                      <span>
                        {application.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="upcoming-section">
          <div className="upcoming-header">
            <div>
              <h2>Upcoming Interviews</h2>
              <p>Your scheduled interviews.</p>
            </div>
          </div>

          {interviews.length === 0 ? (
            <div className="empty-upcoming">
              <h3>No interviews scheduled yet</h3>
              <p>
                Add an interview date to an application to see it here.
              </p>
            </div>
          ) : (
            <div className="upcoming-list">
              {interviews
                .filter(
                  (application) =>
                    new Date(application.interview_date) >= new Date()
                )
                .sort(
                  (a, b) =>
                    new Date(a.interview_date) -
                    new Date(b.interview_date)
                )
                .map((application) => (
                  <div
                    className="upcoming-interview"
                    key={application.id}
                  >
                    <div className="upcoming-date">
                      <strong>
                        {new Date(
                          application.interview_date
                        ).toLocaleDateString([], {
                          day: "numeric",
                          month: "short",
                        })}
                      </strong>

                      <span>
                        {formatTime(
                          application.interview_date
                        )}
                      </span>
                    </div>

                    <div className="upcoming-details">
                      <h3>{application.company}</h3>
                      <p>{application.job_title}</p>
                    </div>

                    <div className="upcoming-status">
                      {application.status}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default Calendar;