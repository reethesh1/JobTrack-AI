const DEFAULT_API_URL = "http://127.0.0.1:8000";

async function getSettings() {
    const settings = await chrome.storage.local.get([
        "apiUrl",
        "accessToken"
    ]);

    const apiUrl = (
        settings.apiUrl || DEFAULT_API_URL
    ).replace(/\/+$/, "");

    return {
        apiUrl,
        accessToken: settings.accessToken || ""
    };
}

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (
            !message ||
            message.type !== "JOBTRACK_IMPORT_JOB"
        ) {
            return false;
        }

        importJob(message.job)
            .then((result) => sendResponse(result))
            .catch((error) => {
                sendResponse({
                    ok: false,
                    message:
                        error.message ||
                        "Could not import the job."
                });
            });

        return true;
    }
);

async function importJob(job) {
    const settings = await getSettings();

    if (!settings.accessToken) {
        throw new Error(
            "Please open the JobTrack-AI extension and sign in first."
        );
    }

    if (!job || !job.company || !job.job_title) {
        throw new Error(
            "Company or job title could not be extracted."
        );
    }

    const response = await fetch(
        `${settings.apiUrl}/imports`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${settings.accessToken}`
            },
            body: JSON.stringify({
                company: job.company,
                job_title: job.job_title,
                job_url: job.job_url || "",
                source: job.source || "other",
                source_url:
                    job.source_url || job.job_url || "",
                tracking_method: "browser_extension",
                external_id: job.external_id || null,
                notes:
                    job.notes ||
                    "Added using the JobTrack-AI browser extension."
            })
        }
    );

    const payload = await response.json().catch(() => ({}));

    if (response.status === 401) {
        throw new Error(
            "Your session may have expired. Open the extension, sign out, and sign in again."
        );
    }

    if (response.status === 409) {
        return {
            ok: false,
            duplicate: true,
            message:
                "This job may already exist in JobTrack-AI."
        };
    }

    if (!response.ok) {
        const detail =
            typeof payload.detail === "string"
                ? payload.detail
                : `The server returned HTTP ${response.status}.`;

        throw new Error(detail);
    }

    return {
        ok: true,
        message: "Job sent to Import Review.",
        import: payload
    };
}