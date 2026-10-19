import React, { useEffect, useState } from "react";
import "./ATSScorer.css";

// Use the configured backend URL in deployment.
// Fall back to the local FastAPI backend during development.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 60000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const STOP_WORDS = new Set([
  "a", "about", "an", "and", "are", "as", "at", "be", "been",
  "being", "but", "by", "can", "candidate", "could", "for", "from",
  "had", "has", "have", "having", "he", "her", "here", "his", "how",
  "i", "if", "in", "into", "is", "it", "its", "may", "might", "must",
  "of", "on", "or", "our", "ours", "she", "should", "so", "such",
  "than", "that", "the", "their", "them", "then", "there", "these",
  "they", "this", "those", "to", "us", "was", "we", "were", "what",
  "when", "where", "which", "who", "will", "with", "would", "you",
  "your", "yours", "work", "working", "experience", "ability", "skills",
  "skill", "role", "job", "responsibilities", "responsibility", "required",
  "requirements", "preferred", "including", "include", "using", "use",
]);

// Multi-word technical terms are counted as single keywords.
const KEYWORD_PHRASES = [
  "generative artificial intelligence",
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "natural language processing",
  "computer vision",
  "large language models",
  "large language model",
  "generative ai",
  "data science",
  "data analysis",
  "data engineering",
  "data visualization",
  "statistical analysis",
  "neural networks",
  "neural network",
  "predictive modeling",
  "feature engineering",
  "model evaluation",
  "model deployment",
  "prompt engineering",
  "retrieval augmented generation",
  "vector database",
  "time series",
  "cloud computing",
  "software development",
  "web development",
  "object oriented programming",
  "rest apis",
  "rest api",
  "api development",
  "continuous integration",
  "continuous deployment",
  "version control",
  "unit testing",
  "integration testing",
  "problem solving",
  "critical thinking",
  "project management",
  "data structures",
  "algorithms",
  "sql database",
  "relational database",
  "scikit-learn",
  "power bi",
  "javascript",
  "typescript",
  "postgresql",
  "python",
  "fastapi",
  "react",
  "pytorch",
  "tensorflow",
  "docker",
  "kubernetes",
  "github",
  "tableau",
  "excel",
  "git",
  "sql",
];

function normaliseKeywordText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\bml\b/g, "machine learning")
    .replace(/\bai\b/g, "artificial intelligence")
    .replace(/\bnlp\b/g, "natural language processing")
    .replace(/\bjs\b/g, "javascript")
    .replace(/\bts\b/g, "typescript")
    .replace(/\bpostgres\b/g, "postgresql")
    .replace(/scikit\s+learn/g, "scikit-learn")
    .replace(/\s+/g, " ")
    .trim();
}

const AI_REVIEW_SECTIONS = [
  {
    title: "OVERALL ASSESSMENT",
    heading: "Overall Assessment",
    icon: "🎯",
    color: "assessment",
  },
  {
    title: "MATCHING SKILLS",
    heading: "Matching Skills",
    icon: "✅",
    color: "matching",
  },
  {
    title: "MISSING OR UNDERDEMONSTRATED SKILLS",
    heading: "Skills to Develop",
    icon: "🧩",
    color: "missing",
  },
  {
    title: "RESUME IMPROVEMENTS",
    heading: "Resume Improvements",
    icon: "📝",
    color: "improvements",
  },
  {
    title: "KEYWORD SUGGESTIONS",
    heading: "Keyword Suggestions",
    icon: "🔑",
    color: "keywords",
  },
];

function containsKeywordPhrase(text, phrase) {
  const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const expression = new RegExp(
    `(^|[^a-z0-9+#.-])${escapedPhrase}($|[^a-z0-9+#.-])`,
    "i"
  );

  return expression.test(text);
}

function getKeywords(text) {
  const normalisedText = normaliseKeywordText(text);

  const detectedPhrases = KEYWORD_PHRASES.filter((phrase) =>
    containsKeywordPhrase(normalisedText, phrase)
  ).filter(
    (phrase) =>
      !KEYWORD_PHRASES.some(
        (otherPhrase) =>
          otherPhrase.length > phrase.length &&
          otherPhrase.includes(phrase) &&
          containsKeywordPhrase(normalisedText, otherPhrase)
      )
  );

  const phraseWords = new Set(
    detectedPhrases.flatMap(
      (phrase) => phrase.match(/[a-z][a-z+#.-]*/g) || []
    )
  );

  const words = normalisedText.match(/[a-z][a-z+#.-]*/g) || [];

  const individualKeywords = words
    .map((word) => word.replace(/^[.-]+|[.-]+$/g, ""))
    .filter(
      (word) =>
        word.length > 1 &&
        !STOP_WORDS.has(word) &&
        !phraseWords.has(word)
    );

  return [
    ...new Set([...detectedPhrases, ...individualKeywords]),
  ];
}

function normaliseHeading(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/^\s*[-•]\s*/, "")
    .replace(/^\s*\d+[\s.)-]+\s*/, "")
    .replace(/^[#*\s]+|[:*#\s]+$/g, "")
    .replace(/\s*[—–-]\s*$/, "")
    .trim();
}

function cleanAIReviewLine(line) {
  return String(line || "")
    .replace(/([#*_[\]`~>])/g, "")
    .replace(/^\s*-{3,}\s*$/, "")
    .replace(/^\s*#{1,6}\s*/, "")
    .trim();
}

function formatAIReview(review) {
  const parsedSections = [];
  let currentSection = null;

  String(review || "")
    .split("\n")
    .forEach((line) => {
      const cleanedLine = cleanAIReviewLine(line);

      if (!cleanedLine) {
        return;
      }

      const headingText = normaliseHeading(cleanedLine);

      const matchedSection = AI_REVIEW_SECTIONS.find(
        (section) =>
          headingText === section.title ||
          headingText.startsWith(`${section.title} `) ||
          headingText.startsWith(`${section.title}:`)
      );

      if (matchedSection) {
        currentSection = {
          ...matchedSection,
          content: [],
        };

        parsedSections.push(currentSection);
        return;
      }

      if (!currentSection) {
        currentSection = {
          title: "AI REVIEW",
          heading: "AI Review",
          icon: "🤖",
          color: "assessment",
          content: [],
        };

        parsedSections.push(currentSection);
      }

      currentSection.content.push(cleanedLine);
    });

  if (parsedSections.length === 0) {
    return [
      {
        title: "AI REVIEW",
        heading: "AI Review",
        icon: "🤖",
        color: "assessment",
        content: [String(review || "No review was returned.")],
      },
    ];
  }

  return parsedSections;
}

// Fetch helper with a timeout so a stalled backend cannot leave
// the page waiting forever.
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "The request timed out after 60 seconds. The backend may be starting up. Please try again."
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Could not connect to the JobTrack-AI backend at ${API_BASE_URL}. Check that the backend is running and the API URL is correct.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readResponseJSON(response) {
  try {
    return await response.json();
  } catch {
    throw new Error(
      "The backend returned an unreadable response. Please check the backend logs."
    );
  }
}

function ATSScorer() {
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [aiReview, setAiReview] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Convert saved Resume Builder details into text for analysis.
  const loadSavedResume = () => {
    try {
      const data = JSON.parse(
        localStorage.getItem("jobtrack-resume") || "{}"
      );

      const sections = [
        ["Name", data.fullName],
        ["Target Role", data.targetRole],
        ["Email", data.email],
        ["Location", data.location],
        ["LinkedIn", data.linkedin],
        ["Portfolio", data.portfolio],
        ["Professional Summary", data.summary],
        ["Technical Skills", data.skills],
        ["Employment History", data.experience],
        ["Education", data.education],
        ["Projects", data.projects],
      ];

      const text = sections
        .filter(([, value]) => value && String(value).trim())
        .map(([label, value]) => `${label}\n${value}`)
        .join("\n\n");

      setResumeText(text);
      setResumeFile(null);
      setResult(null);
      setAiReview("");
      setError("");

      if (text.trim()) {
        setNotice("Your saved Resume Builder details have been loaded.");
      } else {
        setNotice("");
        setError(
          "No saved resume details found. Complete your Resume Builder first."
        );
      }
    } catch {
      setError("Could not read your saved resume details.");
      setNotice("");
    }
  };

  useEffect(() => {
    loadSavedResume();
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    // Reset the input so the same file can be selected again.
    event.target.value = "";

    if (!file) {
      return;
    }

    const allowedExtensions = /\.(pdf|docx)$/i;

    if (!allowedExtensions.test(file.name)) {
      setResumeFile(null);
      setError(
        "Please select a PDF or DOCX resume. Older .doc files are not supported."
      );
      setNotice("");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setResumeFile(null);
      setError("Please choose a resume smaller than 10 MB.");
      setNotice("");
      return;
    }

    if (file.size === 0) {
      setResumeFile(null);
      setError("The selected file is empty. Please choose another resume.");
      setNotice("");
      return;
    }

    setResumeFile(file);
    setResumeText("");
    setResult(null);
    setAiReview("");
    setNotice("");
    setError("");
    setExtracting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/ats/extract-resume`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await readResponseJSON(response);

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Could not extract text from this resume."
        );
      }

      if (!data.text || !String(data.text).trim()) {
        throw new Error(
          "No readable text was found in this file. If it is a scanned PDF, it may require OCR."
        );
      }

      setResumeText(String(data.text));

      setNotice(
        `Successfully extracted text from ${
          data.filename || file.name
        }. You can now analyse this resume.`
      );
    } catch (err) {
      setResumeFile(null);
      setResumeText("");
      setError(
        err.message ||
          "Could not extract the resume. Please check your backend connection."
      );
      setNotice("");
    } finally {
      // Always stop the loading indicator, including on timeout or failure.
      setExtracting(false);
    }
  };

  const handleAnalyze = () => {
    setError("");
    setNotice("");
    setResult(null);

    if (!jobDescription.trim()) {
      setError("Please enter the job description.");
      return;
    }

    if (!resumeText.trim()) {
      setError(
        "Please load your saved resume, upload a supported file, or paste your resume text."
      );
      return;
    }

    const jobKeywords = getKeywords(jobDescription);
    const resumeKeywords = new Set(getKeywords(resumeText));

    if (jobKeywords.length === 0) {
      setError(
        "The job description does not contain enough analyzable keywords."
      );
      return;
    }

    const matched = jobKeywords.filter((word) =>
      resumeKeywords.has(word)
    );

    const missing = jobKeywords.filter(
      (word) => !resumeKeywords.has(word)
    );

    const score = Math.round(
      (matched.length / jobKeywords.length) * 100
    );

    setResult({
      score,
      matched,
      missing,
      total: jobKeywords.length,
    });
  };

  const handleAIReview = async () => {
    setError("");
    setNotice("");
    setAiReview("");

    if (!resumeText.trim()) {
      setError("Please load your saved resume or paste your resume text.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter the job description.");
      return;
    }

    setAiLoading(true);

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/ats/ai-review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_text: resumeText,
            job_description: jobDescription,
          }),
        }
      );

      const data = await readResponseJSON(response);

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Could not generate the AI review."
        );
      }

      if (!data.review || !String(data.review).trim()) {
        throw new Error(
          "The AI returned an empty review. Please try again."
        );
      }

      setAiReview(String(data.review));
    } catch (err) {
      setError(
        err.message ||
          "Could not complete the AI resume review. Please check your backend connection and try again."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const clearAnalysis = () => {
    setResult(null);
    setAiReview("");
    setError("");
    setNotice("");
  };

  return (
    <div className="ats-page">
      <div className="ats-header">
        <div>
          <h1>ATS Resume Scorer</h1>
          <p>
            Compare your resume with a job description, check keyword
            overlap, and get personalised feedback from Gemini AI.
          </p>
        </div>
      </div>

      <div className="ats-content">
        <div className="ats-input-grid">
          <section className="ats-card">
            <h2>Your Resume</h2>

            <p className="ats-description">
              Upload a PDF or DOCX, load your saved Resume Builder
              details, or paste resume text.
            </p>

            <button
              type="button"
              className="analyze-button"
              onClick={loadSavedResume}
              disabled={extracting}
            >
              Use My Saved Resume
            </button>

            <label className="upload-box">
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                disabled={extracting}
              />

              <div className="upload-icon">📄</div>

              <strong>
                {resumeFile
                  ? resumeFile.name
                  : "Choose your resume file"}
              </strong>

              <span>
                {extracting
                  ? "Extracting text from your resume..."
                  : "Supported formats: PDF and DOCX (maximum 10 MB)."}
              </span>
            </label>

            <label className="ats-input-label" htmlFor="resume-text">
              Resume text
            </label>

            <textarea
              id="resume-text"
              className="job-description-input"
              placeholder="Your saved resume appears here. You can also paste resume text..."
              value={resumeText}
              onChange={(event) => {
                setResumeText(event.target.value);
                setResumeFile(null);
                clearAnalysis();
              }}
            />

            {extracting && (
              <p
                className="ats-notice"
                role="status"
                aria-live="polite"
              >
                Please wait while your resume text is being extracted.
                This request will time out after 60 seconds if the
                backend does not respond.
              </p>
            )}

            {notice && (
              <p className="ats-notice" role="status">
                {notice}
              </p>
            )}
          </section>

          <section className="ats-card">
            <h2>Job Description</h2>

            <p className="ats-description">
              Paste the job description for the role you want to apply for.
            </p>

            <textarea
              className="job-description-input"
              aria-label="Job description"
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(event) => {
                setJobDescription(event.target.value);
                clearAnalysis();
              }}
            />
          </section>
        </div>

        {error && (
          <div className="ats-error" role="alert">
            {error}
          </div>
        )}

        <div className="ats-actions">
          <button
            type="button"
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={
              extracting ||
              !resumeText.trim() ||
              !jobDescription.trim()
            }
          >
            Analyze Resume
          </button>

          <button
            type="button"
            className="analyze-button ai-review-button"
            onClick={handleAIReview}
            disabled={
              extracting ||
              aiLoading ||
              !resumeText.trim() ||
              !jobDescription.trim()
            }
          >
            {aiLoading
              ? "AI is reviewing your resume..."
              : "✨ Get AI Review"}
          </button>
        </div>

        {aiLoading && (
          <div
            className="ai-loading-card"
            role="status"
            aria-live="polite"
          >
            <span className="ai-loading-spinner" />

            <div>
              <strong>Gemini is reviewing your resume</strong>

              <p>
                Gemini AI is comparing your resume with the job
                description. This can take a little while.
              </p>
            </div>
          </div>
        )}

        {result && (
          <div className="ats-results">
            <div className="score-card">
              <div className="score-circle">
                <span>{result.score}</span>
                <small>/ 100</small>
              </div>

              <div className="score-content">
                <h2>Keyword Match Score</h2>

                <p>
                  Matched {result.matched.length} of {result.total} unique
                  keywords identified in the job description.
                </p>

                <div
                  className="score-bar"
                  role="progressbar"
                  aria-label="Keyword match score"
                  aria-valuenow={result.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="score-bar-fill"
                    style={{ width: `${result.score}%` }}
                  />
                </div>

                <p className="score-message">
                  {result.score >= 80
                    ? "Strong keyword overlap. Review the job requirements to make sure your experience is relevant."
                    : result.score >= 50
                    ? "Moderate keyword overlap. Review the missing terms and add relevant experience where accurate."
                    : "Low keyword overlap. Review the job requirements and tailor your resume truthfully to your relevant experience."}
                </p>
              </div>
            </div>

            <div className="ats-keyword-grid">
              <section className="ats-keyword-card">
                <h3>
                  Matched Keywords ({result.matched.length})
                </h3>

                {result.matched.length > 0 ? (
                  <div className="ats-keyword-list">
                    {result.matched.map((word) => (
                      <span
                        className="ats-keyword matched"
                        key={word}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>No matching keywords were found.</p>
                )}
              </section>

              <section className="ats-keyword-card">
                <h3>
                  Potentially Missing ({result.missing.length})
                </h3>

                {result.missing.length > 0 ? (
                  <div className="ats-keyword-list">
                    {result.missing.map((word) => (
                      <span
                        className="ats-keyword missing"
                        key={word}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>
                    All identified keywords appear in your resume.
                  </p>
                )}
              </section>
            </div>

            <p className="ats-disclaimer">
              This is a basic keyword-overlap estimate, not an official ATS
              score. It does not assess context, skill proficiency,
              formatting, or actual hiring likelihood. Add missing terms
              only when they accurately describe your qualifications.
            </p>
          </div>
        )}

        {aiReview && (
          <section
            className="ai-review-results"
            aria-labelledby="ai-review-title"
          >
            <div className="ai-review-header">
              <div>
                <span className="ai-review-eyebrow">
                  POWERED BY GEMINI AI
                </span>

                <h2 id="ai-review-title">
                  ✨ Your AI Resume Review
                </h2>

                <p>
                  Personalised insights to help you tailor your resume
                  to this job opportunity.
                </p>
              </div>

              <span className="ai-model-badge">
                🤖 Gemini
              </span>
            </div>

            <div className="ai-review-grid">
              {formatAIReview(aiReview).map((section, index) => (
                <section
                  className={`ai-review-section ai-${section.color}`}
                  key={`${section.title}-${index}`}
                >
                  <div className="ai-section-heading">
                    <span
                      className="ai-section-icon"
                      aria-hidden="true"
                    >
                      {section.icon}
                    </span>

                    <h3>{section.heading}</h3>
                  </div>

                  <div className="ai-section-content">
                    {section.content.map((line, lineIndex) => (
                      <p key={lineIndex}>{line}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="ai-review-disclaimer">
              <span aria-hidden="true">ℹ️</span>

              <p>
                AI-generated advice may contain mistakes. Verify all
                recommendations against your actual qualifications and
                experience before changing your resume.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ATSScorer;