import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isExpanded = isHovered || isMobileOpen;

  // Close the mobile drawer when the user presses Escape.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close the mobile drawer whenever a navigation link is selected.
  function closeMobileMenu() {
    setIsMobileOpen(false);
  }

  return (
    <>
      {/* Mobile top navigation */}
      <header className="mobile-nav-bar">
        <NavLink
          to="/dashboard"
          className="mobile-logo"
          onClick={closeMobileMenu}
        >
          <span aria-hidden="true">🚀</span>
          <span>JobTrack-AI</span>
        </NavLink>

        <button
          type="button"
          className="mobile-menu-button"
          aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileOpen}
          aria-controls="jobtrack-sidebar"
          onClick={() => setIsMobileOpen((previous) => !previous)}
        >
          {isMobileOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* Mobile background overlay */}
      {isMobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
        />
      )}

      {/* Main sidebar */}
      <aside
        id="jobtrack-sidebar"
        className={[
          "sidebar",
          isExpanded ? "open" : "closed",
          isMobileOpen ? "mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onMouseEnter={() => {
          if (window.matchMedia("(min-width: 769px)").matches) {
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          if (window.matchMedia("(min-width: 769px)").matches) {
            setIsHovered(false);
          }
        }}
      >
        {/* Desktop sidebar header */}
        <div className="sidebar-top">
          <div className="logo">
            <span aria-hidden="true">🚀</span>
            {isExpanded && <span>JobTrack-AI</span>}
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

        {/* Navigation links */}
        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink
            to="/dashboard"
            className="nav-item"
            title="Dashboard"
            onClick={closeMobileMenu}
          >
            <span className="nav-icon" aria-hidden="true">🏠</span>
            {isExpanded && <span>Dashboard</span>}
          </NavLink>

          <NavLink
            to="/applications"
            className="nav-item"
            title="Applications"
            onClick={closeMobileMenu}
          >
            <span className="nav-icon" aria-hidden="true">📋</span>
            {isExpanded && <span>Applications</span>}
          </NavLink>

          <NavLink
            to="/import-review"
            className="nav-item"
            title="Import Review"
            onClick={closeMobileMenu}
          >
            <span className="nav-icon" aria-hidden="true">📥</span>
            {isExpanded && <span>Import Review</span>}
          </NavLink>

          <NavLink
            to="/calendar"
            className="nav-item"
            title="Calendar"
            onClick={closeMobileMenu}
          >
            <span className="nav-icon" aria-hidden="true">📅</span>
            {isExpanded && <span>Calendar</span>}
          </NavLink>

          <NavLink
            to="/resume-builder"
            className="nav-item"
            title="Resume Builder"
            onClick={closeMobileMenu}
          >
            <span className="nav-icon" aria-hidden="true">📄</span>
            {isExpanded && <span>Resume Builder</span>}
          </NavLink>

          <NavLink
            to="/ats-scorer"
            className="nav-item"
            title="ATS Scorer"
            onClick={closeMobileMenu}
          >
            <span className="nav-icon" aria-hidden="true">🎯</span>
            {isExpanded && <span>ATS Scorer</span>}
          </NavLink>

          <NavLink
            to="/analytics"
            className="nav-item"
            title="Analytics"
            onClick={closeMobileMenu}
          >
            <span className="nav-icon" aria-hidden="true">📊</span>
            {isExpanded && <span>Analytics</span>}
          </NavLink>

          <NavLink
            to="/settings"
            className="nav-item"
            title="Settings"
            onClick={closeMobileMenu}
          >
            <span className="nav-icon" aria-hidden="true">⚙️</span>
            {isExpanded && <span>Settings</span>}
          </NavLink>
        </nav>

        {/* Profile link */}
        <div className="profile">
          <NavLink
            to="/profile"
            className="nav-item"
            title="Profile"
            onClick={closeMobileMenu}
          >
            <span className="nav-icon" aria-hidden="true">👤</span>
            {isExpanded && <span>Profile</span>}
          </NavLink>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
