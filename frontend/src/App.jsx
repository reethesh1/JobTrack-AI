import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ApplicationBoard from "./components/ApplicationBoard";
import Calendar from "./components/calendar";
import ATSScorer from "./components/ATSScorer";
import {
  Analytics,
  Profile,
  ResumeBuilder,
  Settings,
} from "./components/UtilityPages";
import "./App.css";

function AppLayout() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/applications" element={<ApplicationBoard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/resume-builder" element={<ResumeBuilder />} />
          <Route path="/ats-scorer" element={<ATSScorer />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}