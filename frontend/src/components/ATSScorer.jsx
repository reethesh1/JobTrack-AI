import React, { useState } from "react";
import "./ATSScorer.css";

function ATSScorer() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [score, setScore] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      setResumeFile(file);
    }
  };

  const handleAnalyze = () => {
    if (!resumeFile) {
      alert("Please upload your resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Please enter the job description.");
      return;
    }

    // Temporary score for the frontend.
    // We will replace this with real ATS analysis later.
    setScore(78);
  };

  return (
    <div className="ats-page">
      <div className="ats-header">
        <div>
          <h1>ATS Resume Scorer</h1>
          <p>
            Check how well your resume matches a job description before
            applying.
          </p>
        </div>
      </div>

      <div className="ats-content">
        <div className="ats-card">
          <h2>Upload Your Resume</h2>
          <p className="ats-description">
            Upload your resume in PDF or DOCX format.
          </p>

          <label className="upload-box">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
            />

            <div className="upload-icon">📄</div>

            <strong>
              {resumeFile ? resumeFile.name : "Choose your resume"}
            </strong>

            <span>
              {resumeFile
                ? "Resume selected successfully"
                : "Click here to upload your PDF or DOCX"}
            </span>
          </label>
        </div>

        <div className="ats-card">
          <h2>Job Description</h2>
          <p className="ats-description">
            Paste the job description you want to compare your resume against.
          </p>

          <textarea
            className="job-description-input"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
          />
        </div>

        <button className="analyze-button" onClick={handleAnalyze}>
          Analyze Resume
        </button>

        {score !== null && (
          <div className="score-card">
            <div className="score-circle">
              <span>{score}</span>
              <small>/ 100</small>
            </div>

            <div className="score-content">
              <h2>Your ATS Score</h2>
              <p>
                Your resume has been analyzed against the job description.
              </p>

              <div className="score-bar">
                <div
                  className="score-bar-fill"
                  style={{ width: `${score}%` }}
                ></div>
              </div>

              <p className="score-message">
                Good match! There are still some areas you can improve.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ATSScorer;