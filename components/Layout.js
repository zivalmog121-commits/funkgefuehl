import { useRouter } from "next/router";
import Link from "next/link";
import { useState, useEffect } from "react";
import { signInWithGoogle, signOutUser } from "../lib/firebase";
import { onAuthStateChange } from "../lib/firebase";

const NAV_ITEMS = [
  { href: "/", icon: "📻", label: "Heute" },
  { href: "/sammlung", icon: "🗂️", label: "Sammlung" },
  { href: "/einstellungen", icon: "⚙️", label: "Einstellungen" },
];

export default function Layout({ children, title, onBack }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  useEffect(() => {
    // Load dark mode preference
    const saved = localStorage.getItem("funkgefuehl:darkmode");
    if (saved) {
      setDarkMode(saved === "true");
      document.documentElement.setAttribute("data-theme", saved === "true" ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
    });
    return () => unsubscribe();
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("funkgefuehl:darkmode", newMode);
    document.documentElement.setAttribute("data-theme", newMode ? "dark" : "light");
  };

  const handleSignIn = async () => {
    const authUser = await signInWithGoogle();
    if (authUser) {
      setUser(authUser);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setUserMenuOpen(false);
  };

  return (
    <div className="shell">
      {isDesktop && !onBack && (
        <aside className={`shell-sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <div className="topbar-brand" style={{ fontSize: "1.2rem", marginBottom: 10 }}>
            <span className="topbar-dot" />
            Funkgefühl
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} legacyBehavior>
                <a
                  className={`nav-item ${router.pathname === item.href ? "active" : ""}`}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    textAlign: "left",
                    textTransform: "none",
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    border: "none",
                    borderBottom: router.pathname === item.href ? "3px solid var(--accent)" : "none",
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}>{item.icon}</span>
                  {sidebarOpen && item.label}
                </a>
              </Link>
            ))}
          </nav>
        </aside>
      )}

      <div className="shell-main">
        <div className="topbar">
          {onBack ? (
            <button className="icon-btn" onClick={onBack} aria-label="Zurück">
              ←
            </button>
          ) : !isDesktop ? (
            <div className="topbar-brand">
              <span className="topbar-dot" />
              {title || "Funkgefühl"}
            </div>
          ) : null}
          
          {!onBack && isDesktop && (
            <button 
              className="nav-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Menü schließen" : "Menü öffnen"}
              title={sidebarOpen ? "Menü schließen" : "Menü öffnen"}
            >
              {sidebarOpen ? "◀" : "▶"}
            </button>
          )}
          
          <button 
            className="icon-btn"
            onClick={toggleDarkMode}
            aria-label="Dark mode toggle"
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          {user ? (
            <div style={{ position: "relative" }}>
              <button
                className="icon-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title={user.displayName || "User"}
              >
                👤
              </button>
              {userMenuOpen && (
                <div className="user-menu">
                  <div className="user-menu-name">{user.displayName || user.email}</div>
                  <button className="user-menu-item" onClick={handleSignOut}>
                    🚪 Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              className="btn btn-small"
              onClick={handleSignIn}
              style={{ fontSize: "0.85rem", padding: "8px 12px" }}
            >
              Sign in
            </button>
          )}
          
          {onBack && <div className="topbar-brand">{title}</div>}
          {onBack && <div style={{ width: 38 }} />}
        </div>

        {children}
      </div>

      {!isDesktop && !onBack && (
        <nav className="bottom-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} legacyBehavior>
              <a className={`nav-item ${router.pathname === item.href ? "active" : ""}`}>
                <span className="nav-item-icon">{item.icon}</span>
                {item.label}
              </a>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
