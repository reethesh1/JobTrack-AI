import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";

function Placeholder({ title }) {
  return (
    <div>
      <h1>{title}</h1>
      <p>This page is currently under development.</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">

        <Sidebar />

        <main className="main-content">

          <Routes>

            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/applications"
              element={<Placeholder title="Applications" />}
            />

            <Route
              path="/calendar"
              element={<Placeholder title="Calendar" />}
            />

            <Route
              path="/resume-builder"
              element={<Placeholder title="Resume Builder" />}
            />

            <Route
              path="/ats-scorer"
              element={<Placeholder title="ATS Scorer" />}
            />

            <Route
              path="/analytics"
              element={<Placeholder title="Analytics" />}
            />

            <Route
              path="/settings"
              element={<Placeholder title="Settings" />}
            />

            <Route
              path="/profile"
              element={<Placeholder title="Profile" />}
            />

          </Routes>

        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;