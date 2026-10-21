import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  apiRequest,
  saveAuthSession,
} from "../lib/api";

import "./AuthPage.css";

export default function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();

  const isRegister = mode === "register";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister
        ? "/auth/register"
        : "/auth/login";

      const body = isRegister
        ? {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
          }
        : {
            email: email.trim().toLowerCase(),
            password,
          };

      const result = await apiRequest(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      saveAuthSession(result);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.message ||
          "Authentication failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">JT</div>

          <h1>JobTrack-AI</h1>

          <p>
            Your career journey, organized intelligently.
          </p>
        </div>

        <div className="auth-heading">
          <h2>
            {isRegister
              ? "Create your account"
              : "Welcome back"}
          </h2>

          <p>
            {isRegister
              ? "Start tracking your career opportunities."
              : "Sign in to continue your career journey."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="auth-field">
              <label htmlFor="fullName">
                Full name
              </label>

              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                placeholder="Enter your full name"
                maxLength={150}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder={
                isRegister
                  ? "At least 12 characters"
                  : "Enter your password"
              }
              minLength={isRegister ? 12 : undefined}
              maxLength={128}
              autoComplete={
                isRegister
                  ? "new-password"
                  : "current-password"
              }
              required
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="auth-switch">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <Link to="/login">Sign in</Link>
            </>
          ) : (
            <>
              New to JobTrack-AI?{" "}
              <Link to="/register">
                Create an account
              </Link>
            </>
          )}
        </div>

        <p className="auth-footer">
          Built to help you move forward in your career.
        </p>
      </div>
    </div>
  );
}