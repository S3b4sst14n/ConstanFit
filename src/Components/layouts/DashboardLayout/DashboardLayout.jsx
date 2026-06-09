import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faCalendarCheck,
  faCashRegister,
  faUsersGear,
  faHouse,
  faDumbbell,
  faPersonRunning,
  faRightFromBracket,
  faBars,
  faAnglesLeft,
  faAnglesRight,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../../context/auth-context";
import PageTransition from "../../routing/PageTransition";
import logo from "../../../assets/images/Logo.png";
import "./DashboardLayout.css";

// Ítems del grupo "Administración" indexados por clave reutilizable.
const ADMIN_ITEMS = {
  panel: { to: "/Dashboard", label: "Panel", icon: faGaugeHigh, end: true },
  ingresos: { to: "/Dashboard/Ingresos", label: "Ingresos", icon: faCashRegister },
  asistencias: { to: "/Dashboard/Asistencias", label: "Asistencias", icon: faCalendarCheck },
  usuarios: { to: "/Dashboard/Usuarios", label: "Usuarios", icon: faUsersGear },
};

// Orden (y visibilidad) del grupo "Administración" según el rol de quien entra:
// · ADMIN / OWNER (revisión + gestión): Panel → Ingresos → Asistencias → Usuarios.
// · STAFF (instructor, registra): Asistencias → Ingresos → Panel (sin Usuarios).
const ADMIN_ORDER_BY_ROLE = {
  ADMIN: ["panel", "ingresos", "asistencias", "usuarios"],
  OWNER: ["panel", "ingresos", "asistencias", "usuarios"],
  STAFF: ["asistencias", "ingresos", "panel"],
};

// Enlaces al sitio público: iguales para todos los roles.
const SITIO_GROUP = {
  label: "Sitio",
  items: [
    { to: "/", label: "Inicio", icon: faHouse, end: true },
    { to: "/Planes", label: "Planes", icon: faDumbbell },
    { to: "/Acerca", label: "Acerca", icon: faPersonRunning },
  ],
};

function buildNavGroups(role) {
  const order = ADMIN_ORDER_BY_ROLE[role] ?? ADMIN_ORDER_BY_ROLE.STAFF;
  return [
    { label: "Administración", items: order.map((key) => ADMIN_ITEMS[key]) },
    SITIO_GROUP,
  ];
}

const DashboardLayout = () => {
  const [pinned, setPinned] = useState(false); // expandido fijo (clic)
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // El orden y los ítems del menú dependen del rol (ver ADMIN_ORDER_BY_ROLE).
  const navGroups = useMemo(() => buildNavGroups(user?.role), [user?.role]);

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
          {navGroups.map((group) => {
            if (group.items.length === 0) return null;
            return (
            <div className="dsidebar-group" key={group.label}>
              <span className="dsidebar-group-label" aria-hidden>{group.label}</span>
              {group.items.map(({ to, label, icon, end }) => (
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
            </div>
            );
          })}
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
        <PageTransition />
      </main>
    </div>
  );
};

export default DashboardLayout;
