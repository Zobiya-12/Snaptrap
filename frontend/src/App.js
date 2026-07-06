import { useState, useEffect } from "react";

// ── All split components ──────────────────────────────────────────────────────
import Landing               from "./components/Landing";
import LandingHeroBattlefield from "./components/LandingHeroBattlefield";
import PublicDemo            from "./components/PublicDemo";
import LandingLiveFeed       from "./components/LandingLiveFeed";
import BlocklistPanel        from "./components/BlocklistPanel";
import ControlPanel          from "./components/ControlPanel";
import NetworkAgentConsole   from "./components/NetworkAgentConsole";
import Badge                 from "./components/Badge"; 
import Auth                  from "./components/Auth";
import AccountPage           from "./components/AccountPage";
import Battlefield           from "./components/Battlefield";
import LandingDemoBattlefield  from "./components/LandingDemoBattlefield";
import Livemonitor           from "./components/LiveMonitor";
import IntelPage             from "./components/IntelPage";
import XPPage                from "./components/XPPage";
import NgrokPortalButton     from "./components/NgrokPortalButton";
import RedTeamDashboard      from "./components/RedTeamDashboard";
import AdminPanel            from "./components/AdminPanel";
import shared                from "./components/shared";
import { DEMO_AGENTS }       from "./components/NetworkAgentConsole";
import { OrgDashboard }      from "./shells/OrgDashboard";
import { SuperAdminShell }   from "./shells/SuperAdminShell";
// ── Constants (single source of truth) ───────────────────────────────────────
import { CSS, api, API, SVC_CLS, TYPE_CLS, TYPE_XP,
         isPasswordStrong, ACHS, xpL, calcLvl, pwStr,
         tc, sc } from "./constants";
import AudioEngine from "./constants";   // default export

// ── Re-exports for shells/components that import from App ────────────────────
export { Battlefield, NgrokPortalButton, NetworkAgentConsole, DEMO_AGENTS };

/* ═══════════════════════════════════════════════════════════
   ROOT — only routing lives here now
   All state that crosses component boundaries lives here:
     view, user, theme
   Everything else lives in its own file.
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [view,      setView]      = useState("landing");
  const [authMode,  setAuthMode]  = useState("login");
  const [user,      setUser]      = useState(null);
  const [theme,     setTheme]     = useState(
    () => localStorage.getItem("st_theme") || "dark"
  );

  // ── Apply theme to <html> ────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("st_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  // ── Auto-login from localStorage JWT ────────────────────────────────────
  useEffect(() => {
    const tk = localStorage.getItem("st_token");
    if (tk) {
      try {
        const p = JSON.parse(atob(tk.split(".")[1]));
        setUser({ token: tk, role: p.role, email: p.email, name: p.name });
        setView("app");
      } catch {
        localStorage.removeItem("st_token");
      }
    }
  }, []);

  // ── Auth callbacks ───────────────────────────────────────────────────────
  function handleLogin(d) {
    localStorage.setItem("st_token", d.token);
    try {
      const p = JSON.parse(atob(d.token.split(".")[1]));
      setUser({ ...d, role: p.role, name: p.name || d.name });
    } catch {
      setUser(d);
    }
    setView("app");
  }

  function handleLogout() {
    localStorage.removeItem("st_token");
    localStorage.removeItem("st_xp");
    setUser(null);
    setView("landing");
  }

  // ── Route render ─────────────────────────────────────────────────────────
  return (
    <>
    {view === "demo" && (
  <PublicDemo
    onBack={() => setView("landing")}
    theme={theme}
    onTheme={toggleTheme}
  />
)}
      <style>{CSS}</style>

      {view === "landing" && (
  <Landing
    onSignup={() => { setAuthMode("signup"); setView("auth"); }}
    onLogin={()  => { setAuthMode("login");  setView("auth"); }}
    onDemo={()   => setView("demo")}
    onTheme={toggleTheme}
    theme={theme}
  />
)}

      {view === "auth" && (
        <Auth
          onLogin={handleLogin}
          onBack={() => setView("landing")}
          initialMode={authMode}
        />
      )}

      {view === "app" && user && (
        user.role === "superadmin"
          ? <SuperAdminShell user={user} onLogout={handleLogout} onTheme={toggleTheme} theme={theme} />
          : user.role === "redteam"
          ? <RedTeamDashboard user={user} onLogout={handleLogout} onTheme={toggleTheme} theme={theme} />
          : <OrgDashboard user={user} onLogout={handleLogout} onTheme={toggleTheme} theme={theme} />
      )}
    </>
  );
}