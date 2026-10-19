
const DEFAULT_API_URL = "http://127.0.0.1:8000";

const apiUrlInput = document.getElementById("api-url");
const tokenInput = document.getElementById("import-token");
const statusElement = document.getElementById("status");
const form = document.getElementById("settings-form");

async function loadSettings() {
    const settings = await chrome.storage.local.get([
        "apiUrl",
        "importToken"
    ]);

    apiUrlInput.value = settings.apiUrl || DEFAULT_API_URL;
    tokenInput.value = settings.importToken || "";
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const apiUrl = apiUrlInput.value.trim().replace(/\/+$/, "");
    const importToken = tokenInput.value.trim();

    if (!apiUrl || !importToken) {
        statusElement.textContent =
            "Enter both the backend URL and import token.";
        return;
    }

    try {
        const parsedUrl = new URL(apiUrl);

        const isLocalhost =
            parsedUrl.hostname === "localhost" ||
            parsedUrl.hostname === "127.0.0.1";

        if (
            parsedUrl.protocol !== "https:" &&
            !isLocalhost
        ) {
            throw new Error(
                "Use HTTPS for remote backends. HTTP is permitted only for localhost."
            );
        }

        if (
            parsedUrl.username ||
            parsedUrl.password ||
            parsedUrl.search ||
            parsedUrl.hash
        ) {
            throw new Error(
                "Enter only the backend base URL, without credentials, query parameters, or fragments."
            );
        }

        await chrome.storage.local.set({
            apiUrl,
            importToken
        });

        statusElement.textContent =
            "Settings saved successfully.";
    } catch (error) {
        statusElement.textContent =
            error.message || "Could not save settings.";
    }
});

loadSettings().catch(() => {
    statusElement.textContent =
        "Could not load saved settings.";
});
