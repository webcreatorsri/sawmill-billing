// src/main.jsx - Fixed with Consistent Layout and Offline Support
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import AddEstimate from "./components/AddEstimate";
import Report from "./components/Report";
import BillDetails from "./components/BillDetails";
import Login from "./components/Login";
import Signup from "./components/Signup";
import { auth, signOut } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { AppState } from "./utils/offlineStorage";
import './App.css';

function Root() {
  const [selectedBill, setSelectedBill] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [notifications, setNotifications] = React.useState([]);
  const { isOnline } = useNetworkStatus();

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleSignup = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      // Clear offline data on logout
      localStorage.removeItem('sawmill_user_data');
      AppState.saveState({});
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        };
        setUser(userData);
        // Save user data to offline storage
        AppState.saveState({ user: userData });
        // Simulate notifications
        setNotifications([
          { id: 1, message: "New estimate saved successfully", type: "success", time: "2 min ago" },
          { id: 2, message: "Bill #1045 is pending review", type: "warning", time: "1 hour ago" }
        ]);
      } else {
        setUser(null);
        setNotifications([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h2>Loading Sawmill Pro...</h2>
          <p>Preparing your workspace</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <BrowserRouter>
        <AuthApp onLogin={handleLogin} onSignup={handleSignup} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <MainApp 
        user={user} 
        onLogout={handleLogout} 
        selectedBill={selectedBill} 
        setSelectedBill={setSelectedBill}
        notifications={notifications}
      />
    </BrowserRouter>
  );
}

function MainApp({ user, onLogout, selectedBill, setSelectedBill, notifications }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const { isOnline } = useNetworkStatus();

  const NavLink = ({ to, children, icon }) => (
    <Link 
      to={to} 
      className={`nav-link ${location.pathname === to ? "active" : ""}`}
      onClick={() => setSidebarOpen(false)}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-text">{children}</span>
    </Link>
  );

  const getPageTitle = () => {
    switch(location.pathname) {
      case '/': return 'Shiva Sakthi Sawmill';
      case '/report': return 'Reports & Analytics';
      case '/customer': return 'Customer Portal';
      default: return 'Sawmill Pro';
    }
  };

  const getPageDescription = () => {
    switch(location.pathname) {
      case '/': return 'Create and manage sawmill estimates efficiently';
      case '/report': return 'View and manage all your estimates and generate reports';
      default: return '';
    }
  };

  // Add offline indicator for top bar
  const renderOfflineIndicator = () => (
    <div className={`top-bar-offline ${isOnline ? 'online' : 'offline'}`}>
      <span className="status-dot"></span>
      {isOnline ? 'Online' : 'Offline'}
    </div>
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="brand">
            
            <span className="brand-text">Sawmill Pro</span>
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-label">Main</div>
            <NavLink 
              to="/" 
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L20 8V20H4V8L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            >
              Create Estimate
            </NavLink>
            <NavLink 
              to="/report" 
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 17V15M12 17V11M15 17V13M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" 
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            >
              Reports & Analytics
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.displayName || user?.email}</div>
              <div className="user-role">Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <button 
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="page-info">
              <h1 className="page-title">{getPageTitle()}</h1>
              <p className="page-description">{getPageDescription()}</p>
            </div>
          </div>
          
          <div className="top-bar-right">
            {renderOfflineIndicator()}
            <div className="top-bar-actions">
              {/* User Menu */}
              <div className="user-menu">
                <button 
                  className="user-button"
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowNotifications(false);
                  }}
                >
                  <div className="user-avatar-sm">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
                  </div>
                  <span className="user-name-sm">{user?.displayName || user?.email}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-header">
                      <div className="user-avatar-md">
                        {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
                      </div>
                      <div className="user-details">
                        <div className="user-name">{user?.displayName || user?.email}</div>
                        <div className="user-email">{user?.email}</div>
                      </div>
                    </div>
                    <div className="user-dropdown-menu">
                      <div className="dropdown-divider"></div>
                      <button onClick={onLogout} className="dropdown-item logout">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" 
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <Routes>
            <Route path="/" element={<AddEstimate user={user} />} />
            <Route path="/report" element={<Report onSelect={(b) => setSelectedBill(b)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="modal-overlay">
          <BillDetails bill={selectedBill} onClose={() => setSelectedBill(null)} />
        </div>
      )}
    </div>
  );
}

function AuthApp({ onLogin, onSignup }) {
  return (
    <div className="auth-app">
      <Routes>
        <Route path="/login" element={<Login onLogin={onLogin} />} />
        <Route path="/signup" element={<Signup onSignup={onSignup} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);