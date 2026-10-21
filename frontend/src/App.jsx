import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ApplicationBoard from "./components/ApplicationBoard";
import Calendar from "./components/calendar";
import ImportReview from "./components/ImportReview";
import ATSScorer from "./components/ATSScorer";
import AuthPage from "./components/AuthPage";

import {
  Analytics,
  Profile,
  ResumeBuilder,
  Settings,
} from "./components/UtilityPages";

import {
  apiRequest,
  clearAuthSession,
  getAccessToken,
} from "./lib/api";

import "./App.css";


function ProtectedRoute({ children }) {
  const [authStatus, setAuthStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const token = getAccessToken();

      if (!token) {
        if (!cancelled) {
          setAuthStatus("unauthenticated");
        }
        return;
      }

      try {
        await apiRequest("/auth/me");

        if (!cancelled) {
          setAuthStatus("authenticated");
        }
      } catch {
        clearAuthSession();

        if (!cancelled) {
          setAuthStatus("unauthenticated");
        }
      }
    }

    verifySession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (authStatus === "checking") {
    return (
      <div className="auth-loading">
        Checking your session...
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return children;
}


function AppLayout() {
  return (
    <div className="app">
      <Sidebar />

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route path="/dashboard" element={<Dashboard />} />

          <Route
            path="/applications"
            element={<ApplicationBoard />}
          />

          <Route
            path="/import-review"
            element={<ImportReview />}
          />

          <Route path="/calendar" element={<Calendar />} />

          <Route
            path="/resume-builder"
            element={<ResumeBuilder />}
          />

          <Route path="/ats-scorer" element={<ATSScorer />} />

          <Route path="/analytics" element={<Analytics />} />

          <Route path="/settings" element={<Settings />} />

          <Route path="/profile" element={<Profile />} />

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </main>
    </div>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<AuthPage mode="login" />}
        />

        <Route
          path="/register"
          element={<AuthPage mode="register" />}
        />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
