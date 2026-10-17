import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <aside
      className={`sidebar ${isHovered ? "open" : "closed"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="sidebar-top">
        <div className="logo">
          🚀
          {isHovered && <span>JobTrack-AI</span>}
        </div>

        <button
          type="button"
          className="toggle-button"
          aria-label={isHovered ? "Collapse sidebar" : "Expand sidebar"}
          title={isHovered ? "Collapse sidebar" : "Expand sidebar"}
          onClick={() => setIsHovered((previous) => !previous)}
        >
          ☰
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className="nav-item" title="Dashboard">
          🏠
          {isHovered && <span>Dashboard</span>}
        </NavLink>

        <NavLink to="/applications" className="nav-item" title="Applications">
          📋
          {isHovered && <span>Applications</span>}
        </NavLink>

        <NavLink to="/calendar" className="nav-item" title="Calendar">
          📅
          {isHovered && <span>Calendar</span>}
        </NavLink>

        <NavLink to="/resume-builder" className="nav-item" title="Resume Builder">
          📄
          {isHovered && <span>Resume Builder</span>}
        </NavLink>

        <NavLink to="/ats-scorer" className="nav-item" title="ATS Scorer">
          🎯
          {isHovered && <span>ATS Scorer</span>}
        </NavLink>

        <NavLink to="/analytics" className="nav-item" title="Analytics">
          📊
          {isHovered && <span>Analytics</span>}
        </NavLink>

        <NavLink to="/settings" className="nav-item" title="Settings">
          ⚙️
          {isHovered && <span>Settings</span>}
        </NavLink>
      </nav>

      {/* Profile */}
      <div className="profile">
        <NavLink to="/profile" className="nav-item" title="Profile">
          👤
          {isHovered && <span>Profile</span>}
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;