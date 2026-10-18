(() => {
if (window.__jobTrackExtensionLoaded) {
return;
}

window.__jobTrackExtensionLoaded = true;

function getJobDetails() {
const url = window.location.href;
const host = window.location.hostname.toLowerCase();

let source = "other";

if (host.includes("linkedin.com")) {
  source = "linkedin";
} else if (host.includes("indeed.com")) {
  source = "indeed";
}

const titleSelectors = [
  ".job-details-jobs-unified-top-card__job-title",
  ".jobs-unified-top-card__job-title",
  "h1.jobsearch-JobInfoHeader-title",
  "[data-testid='jobsearch-JobInfoHeader-title']",
  "h1"
];

const companySelectors = [
  ".job-details-jobs-unified-top-card__company-name",
  ".jobs-unified-top-card__company-name",
  "[data-testid='inlineHeader-companyName']",
  ".jobsearch-InlineCompanyRating div",
  "[data-testid='company-name']"
];

function firstText(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const text = element?.textContent?.trim();

    if (text) {
      return text.replace(/\s+/g, " ");
    }
  }

  return "";
}

const jobTitle = firstText(titleSelectors);
const company = firstText(companySelectors);

if (!jobTitle || !company) {
  throw new Error(
    "Could not identify the company and job title on this page. Open a specific job listing and try again."
  );
}

return {
  company,
  job_title: jobTitle,
  job_url: url,
  source,
  source_url: url,
  external_id: null,
  notes: "Manually confirmed as applied by the user through the browser extension."
};

}

function createButton() {
if (document.getElementById("jobtrack-import-button")) {
return;
}

const button = document.createElement("button");
button.id = "jobtrack-import-button";
button.textContent = "Add to JobTrack-AI";
button.type = "button";

Object.assign(button.style, {
  position: "fixed",
  right: "20px",
  bottom: "20px",
  zIndex: "2147483647",
  padding: "12px 18px",
  border: "none",
  borderRadius: "8px",
  background: "#2563eb",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
});

button.addEventListener("click", async () => {
  const originalText = button.textContent;

  try {
    button.disabled = true;
    button.textContent = "Sending...";

    const job = getJobDetails();

    const result = await chrome.runtime.sendMessage({
      type: "JOBTRACK_IMPORT_JOB",
      job
    });

    if (!result?.ok) {
      throw new Error(result?.message || "Import failed.");
    }

    button.textContent = "Added to Import Review";
    button.style.background = "#15803d";
  } catch (error) {
    button.textContent = "Import failed";

    window.alert(
      error.message ||
        "Could not send this job to JobTrack-AI."
    );

    button.textContent = originalText;
  } finally {
    button.disabled = false;
  }
});

document.body.appendChild(button);

}

function initialize() {
createButton();
}

initialize();

// Some job pages update their contents without a full page reload.
const observer = new MutationObserver(() => {
if (!document.getElementById("jobtrack-import-button")) {
createButton();
}
});

observer.observe(document.documentElement, {
childList: true,
subtree: true
});
})();