import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>

      {/* Header */}
      <div className="sidebar-top">

        <div className="logo">
          🚀
          {isOpen && <span>JobTrack-AI</span>}
        </div>

        <button
          className="toggle-button"
          onClick={() => setIsOpen(!isOpen)}
        >
          ☰
        </button>

      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">

        <NavLink to="/dashboard" className="nav-item">
          🏠
          {isOpen && <span>Dashboard</span>}
        </NavLink>

        <NavLink to="/applications" className="nav-item">
          📋
          {isOpen && <span>Applications</span>}
        </NavLink>

        <NavLink to="/calendar" className="nav-item">
          📅
          {isOpen && <span>Calendar</span>}
        </NavLink>

        <NavLink to="/resume-builder" className="nav-item">
          📄
          {isOpen && <span>Resume Builder</span>}
        </NavLink>

        <NavLink to="/ats-scorer" className="nav-item">
          🎯
          {isOpen && <span>ATS Scorer</span>}
        </NavLink>

        <NavLink to="/analytics" className="nav-item">
          📊
          {isOpen && <span>Analytics</span>}
        </NavLink>

        <NavLink to="/settings" className="nav-item">
          ⚙️
          {isOpen && <span>Settings</span>}
        </NavLink>

      </nav>

      {/* Profile */}
      <div className="profile">

        <NavLink to="/profile" className="nav-item">
          👤
          {isOpen && <span>Profile</span>}
        </NavLink>

      </div>

    </aside>
  );
}

export default Sidebar;