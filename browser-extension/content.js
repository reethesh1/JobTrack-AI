(() => {
    if (window.__jobTrackExtensionLoaded) {
        return;
    }

    window.__jobTrackExtensionLoaded = true;

    function cleanText(value) {
        return (value || "").replace(/\s+/g, " ").trim();
    }

    function firstVisibleText(selectors) {
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);

            for (const element of elements) {
                const text = cleanText(
                    element.innerText || element.textContent
                );

                if (text && element.getClientRects().length > 0) {
                    return text;
                }
            }
        }

        return "";
    }

    // Build a shorter, cleaner URL without tracking parameters.
    function getCleanJobUrl(source, currentJobId) {
        if (source === "linkedin" && currentJobId) {
            return `https://www.linkedin.com/jobs/view/${encodeURIComponent(currentJobId)}/`;
        }

        if (source === "indeed" && currentJobId) {
            const url = new URL(window.location.href);
            url.search = "";
            url.hash = "";
            return url.toString().slice(0, 500);
        }

        const url = new URL(window.location.href);

        // Remove common tracking parameters.
        const trackingParameters = [
            "eBP",
            "refId",
            "trackingId",
            "trk",
            "trkInfo",
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content"
        ];

        for (const parameter of trackingParameters) {
            url.searchParams.delete(parameter);
        }

        url.hash = "";

        let cleanedUrl = url.toString();

        // Keep the URL within the backend's 500-character limit.
        if (cleanedUrl.length > 500) {
            cleanedUrl = `${url.origin}${url.pathname}`;
        }

        return cleanedUrl.slice(0, 500);
    }

    function getJobDetails() {
        const url = window.location.href;
        const host = window.location.hostname.toLowerCase();

        const pageTitle = document.title
            .replace(/\s*\|\s*LinkedIn\s*$/i, "")
            .split(" | ")
            .map(part => part.trim());

        const parsedUrl = new URL(url);

        const currentJobId =
            parsedUrl.searchParams.get("currentJobId") ||
            window.location.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] ||
            null;

        let source = "other";

        if (host.includes("linkedin.com")) {
            source = "linkedin";
        } else if (host.includes("indeed.com")) {
            source = "indeed";
        }

        let jobTitle = "";
        let company = "";

        if (source === "linkedin") {
            jobTitle = firstVisibleText([
                ".job-details-jobs-unified-top-card__job-title",
                ".jobs-unified-top-card__job-title",
                ".job-details-jobs-unified-top-card h1",
                ".jobs-unified-top-card h1",
                "main h1"
            ]);

            company = firstVisibleText([
                ".job-details-jobs-unified-top-card__company-name",
                ".jobs-unified-top-card__company-name",
                ".job-details-jobs-unified-top-card__primary-description a",
                ".jobs-unified-top-card__primary-description a",
                ".job-details-jobs-unified-top-card__primary-description",
                ".jobs-unified-top-card__primary-description"
            ]);

            const panels = [
                ...document.querySelectorAll(
                    ".jobs-search__job-details--container, " +
                    ".jobs-search__job-details, " +
                    ".scaffold-layout__detail"
                )
            ];

            for (const panel of panels) {
                if (!panel.getClientRects().length) {
                    continue;
                }

                if (!jobTitle) {
                    const heading = panel.querySelector("h1, h2");

                    if (heading) {
                        const headingText = cleanText(heading.innerText);

                        if (
                            headingText &&
                            !/^about the job$/i.test(headingText) &&
                            !/^about the company$/i.test(headingText)
                        ) {
                            jobTitle = headingText;
                        }
                    }
                }

                if (!company) {
                    const companyLink = [
                        ...panel.querySelectorAll('a[href*="/company/"]')
                    ].find(link => {
                        const text = cleanText(link.innerText);

                        return (
                            text &&
                            !text.toLowerCase().includes("follow")
                        );
                    });

                    if (companyLink) {
                        company = cleanText(companyLink.innerText);
                    }
                }

                if (jobTitle && company) {
                    break;
                }
            }

            if (pageTitle.length >= 2) {
                if (!jobTitle) {
                    jobTitle = pageTitle[0];
                }

                if (!company) {
                    company = pageTitle[1];
                }
            }
        } else if (source === "indeed") {
            jobTitle = firstVisibleText([
                "[data-testid='jobsearch-JobInfoHeader-title']",
                "h1.jobsearch-JobInfoHeader-title",
                "h1"
            ]);

            company = firstVisibleText([
                "[data-testid='inlineHeader-companyName']",
                "[data-testid='company-name']",
                ".jobsearch-InlineCompanyRating",
                ".jobsearch-CompanyInfoContainer"
            ]);
        }

        company = company.replace(/\s*[·|]\s*$/, "");

        if (!jobTitle || !company) {
            throw new Error(
                "Couldn't identify both the company and job title. " +
                "Open a job listing, wait for its details to load, and try again."
            );
        }

        const cleanJobUrl = getCleanJobUrl(source, currentJobId);

        return {
            company,
            job_title: jobTitle,
            job_url: cleanJobUrl,
            source,
            source_url: cleanJobUrl,
            tracking_method: "browser_extension",
            external_id: currentJobId,
            notes:
                "Job details captured by the browser extension. " +
                "Application status has not been verified."
        };
    }

    function createButton() {
        if (
            !document.body ||
            document.getElementById("jobtrack-import-button")
        ) {
            return;
        }

        const button = document.createElement("button");

        button.id = "jobtrack-import-button";
        button.textContent = "Save Job for Review";
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
            try {
                button.disabled = true;
                button.textContent = "Reading job details...";

                const job = getJobDetails();

                button.textContent = "Sending for review...";

                const result = await chrome.runtime.sendMessage({
                    type: "JOBTRACK_IMPORT_JOB",
                    job
                });

                if (!result?.ok) {
                    throw new Error(
                        result?.message || "Import failed."
                    );
                }

                button.textContent = "Sent for Review";
                button.style.background = "#15803d";
            } catch (error) {
                button.textContent = "Import failed";

                window.alert(
                    error.message ||
                    "Could not send this job to JobTrack-AI."
                );

                button.textContent = "Save Job for Review";
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

    const observer = new MutationObserver(() => {
        createButton();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();