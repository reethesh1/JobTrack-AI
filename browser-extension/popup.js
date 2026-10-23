const DEFAULT_API_URL = "https://jobtrack-ai-1-a4ie.onrender.com";

const form = document.getElementById("settings-form");
const apiUrlInput = document.getElementById("api-url");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginSection = document.getElementById("login-section");
const accountSection = document.getElementById("account-section");

const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");

const accountInfo = document.getElementById("account-info");
const statusElement = document.getElementById("status");

function showStatus(message) {
    statusElement.textContent = message;
}

function validateApiUrl(value) {
    const apiUrl = value.trim().replace(/\/+$/, "");

    if (!apiUrl) {
        throw new Error("Enter your backend URL.");
    }

    const parsedUrl = new URL(apiUrl);

    const isLocalhost =
        parsedUrl.hostname === "localhost" ||
        parsedUrl.hostname === "127.0.0.1";

    if (parsedUrl.protocol !== "https:" && !isLocalhost) {
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
            "Enter only the backend base URL, without credentials or extra parameters."
        );
    }

    return apiUrl;
}

async function loadSettings() {
    const settings = await chrome.storage.local.get([
        "apiUrl",
        "accessToken",
        "user"
    ]);

    apiUrlInput.value = settings.apiUrl || DEFAULT_API_URL;

    if (settings.accessToken) {
        loginSection.classList.add("hidden");
        accountSection.classList.remove("hidden");

        const user = settings.user || {};

        accountInfo.textContent = user.email
            ? `Signed in as ${user.email}`
            : "You are signed in to JobTrack-AI.";

        emailInput.required = false;
        passwordInput.required = false;
    } else {
        loginSection.classList.remove("hidden");
        accountSection.classList.add("hidden");

        emailInput.required = true;
        passwordInput.required = true;
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginButton.disabled = true;
    showStatus("Signing in...");

    try {
        const apiUrl = validateApiUrl(apiUrlInput.value);
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        if (!email || !password) {
            throw new Error("Enter your email and password.");
        }

        const response = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const detail =
                typeof payload.detail === "string"
                    ? payload.detail
                    : `Sign-in failed (HTTP ${response.status}).`;

            throw new Error(detail);
        }

        if (!payload.access_token) {
            throw new Error(
                "The server did not return an access token."
            );
        }

        await chrome.storage.local.set({
            apiUrl,
            accessToken: payload.access_token,
            user: {
                user_id: payload.user_id,
                email: payload.email,
                full_name: payload.full_name
            }
        });

        passwordInput.value = "";

        await loadSettings();

        showStatus("Signed in successfully!");
    } catch (error) {
        showStatus(error.message || "Could not sign in.");
    } finally {
        loginButton.disabled = false;
    }
});

logoutButton.addEventListener("click", async () => {
    try {
        await chrome.storage.local.remove([
            "accessToken",
            "user"
        ]);

        passwordInput.value = "";

        await loadSettings();

        showStatus("Signed out successfully.");
    } catch {
        showStatus("Could not sign out.");
    }
});

loadSettings().catch(() => {
    showStatus("Could not load extension settings.");
});