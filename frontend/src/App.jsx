import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import JobList from "./components/JobList";
import Analytics3d from "./components/Analytics3d";
import JobForm from "./components/JobForm";

// Inline Styles
const styles = {
  appContainer: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  sidebar: {
    background: 'linear-gradient(180deg, #1e3c72 0%, #2a5298 100%)',
    color: 'white',
    transition: 'width 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
    zIndex: 1000,
    position: 'relative',
  },
  sidebarOpen: {
    width: '260px',
  },
  sidebarClosed: {
    width: '80px',
  },
  sidebarHeader: {
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    minHeight: '80px',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'white',
    whiteSpace: 'nowrap',
    margin: 0,
  },
  toggleBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'white',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    fontSize: '1rem',
  },
  navMenu: {
    flex: 1,
    padding: '1rem 0',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    position: 'relative',
    margin: '0.25rem 0.75rem',
    borderRadius: '12px',
  },
  navItemActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },
  navIcon: {
    fontSize: '1.5rem',
    marginRight: '1rem',
    minWidth: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontWeight: 500,
    fontSize: '0.95rem',
    whiteSpace: 'nowrap',
  },
  sidebarFooter: {
    padding: '1rem',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    marginTop: 'auto',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: 'white',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    margin: 0,
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.7)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    margin: '0.25rem 0 0 0',
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    background: '#f5f7fa',
    transition: 'margin-left 0.3s ease',
  },
};

function AppContent() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { path: "/", label: "Dashboard", icon: "📊" },
    { path: "/jobs", label: "Jobs List", icon: "💼" },
    { path: "/analytics", label: "Analytics", icon: "📈" },
    { path: "/add", label: "Add Job", icon: "➕" }
  ];

  return (
    <div style={styles.appContainer}>
      {/* Sidebar */}
      <aside style={{...styles.sidebar, ...(sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed)}}>
        <div style={styles.sidebarHeader}>
          <h1 style={styles.logo}>
            {sidebarOpen ? "Job Trends" : "JT"}
          </h1>
          <button 
            style={styles.toggleBtn}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav style={styles.navMenu}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.navItem,
                ...(location.pathname === item.path ? styles.navItemActive : {})
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== item.path) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'translateX(5px)';
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== item.path) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              <span style={{...styles.navIcon, marginRight: sidebarOpen ? '1rem' : 0}}>
                {item.icon}
              </span>
              {sidebarOpen && <span style={styles.navLabel}>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {sidebarOpen && (
          <div style={styles.sidebarFooter}>
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>👤</div>
              <div style={styles.userDetails}>
                <p style={styles.userName}>Admin User</p>
                <p style={styles.userRole}>Analyst</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<JobList />} />
          <Route path="/analytics" element={<Analytics3d />} />
          <Route path="/add" element={<JobForm />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
