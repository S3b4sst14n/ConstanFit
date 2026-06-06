import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faCalendarCheck,
  faHouse,
  faDumbbell,
  faPersonRunning,
  faRightFromBracket,
  faBars,
  faAnglesLeft,
  faAnglesRight,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../../context/auth-context";
import logo from "../../../assets/images/Logo.png";
import "./DashboardLayout.css";

const navItems = [
  { to: "/Dashboard", label: "Panel", icon: faGaugeHigh, end: true },
  { to: "/Dashboard/Asistencias", label: "Asistencias", icon: faCalendarCheck },
  { to: "/", label: "Inicio", icon: faHouse, end: true },
  { to: "/Planes", label: "Planes", icon: faDumbbell },
  { to: "/Acerca", label: "Acerca", icon: faPersonRunning },
];

const DashboardLayout = () => {
  const [pinned, setPinned] = useState(false); // expandido fijo (clic)
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // El panel no tiene el header superior, así que quitamos su offset del body.
  useEffect(() => {
    document.body.classList.add("no-nav-offset");
    return () => document.body.classList.remove("no-nav-offset");
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = () => {
    closeMobile();
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className={`dlayout ${pinned ? "dlayout--pinned" : ""}`}>
      <button
        className="dlayout-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <FontAwesomeIcon icon={faBars} />
      </button>

      <aside
        className={`dsidebar ${mobileOpen ? "dsidebar--mobile-open" : ""}`}
        aria-label="Navegación del panel"
      >
        <div className="dsidebar-top">
          <NavLink to="/" className="dsidebar-logo" onClick={closeMobile} aria-label="Ir al inicio">
            <img src={logo} alt="ConstanFit" />
          </NavLink>
        </div>

        <nav className="dsidebar-nav">
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="dsidebar-link"
              onClick={closeMobile}
            >
              <span className="dsidebar-ico">
                <FontAwesomeIcon icon={icon} aria-hidden />
              </span>
              <span className="dsidebar-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dsidebar-bottom">
          <div className="dsidebar-user">
            <span className="dsidebar-ico dsidebar-avatar" aria-hidden>
              {(user?.username?.[0] ?? "U").toUpperCase()}
            </span>
            <span className="dsidebar-label dsidebar-username">
              {user?.username ?? "Usuario"}
            </span>
          </div>
          <button type="button" className="dsidebar-link dsidebar-logout" onClick={handleLogout}>
            <span className="dsidebar-ico">
              <FontAwesomeIcon icon={faRightFromBracket} aria-hidden />
            </span>
            <span className="dsidebar-label">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <button
        className="dsidebar-toggle"
        onClick={() => setPinned((v) => !v)}
        aria-label={pinned ? "Contraer menú" : "Expandir menú"}
        aria-pressed={pinned}
        title={pinned ? "Contraer menú" : "Expandir menú"}
      >
        <FontAwesomeIcon icon={pinned ? faAnglesLeft : faAnglesRight} />
      </button>

      <div
        className={`dsidebar-backdrop ${mobileOpen ? "active" : ""}`}
        onClick={closeMobile}
        aria-hidden
      />

      <main className="dlayout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
