import "./Navbar.css";
import logo from "../../../assets/images/Logo.png";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/auth-context";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faDumbbell,
  faPersonRunning,
  faRightToBracket,
  faRightFromBracket,
  faGaugeHigh,
  faBars,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

const links = [
  { to: "/",        label: "Inicio",            icon: faHome },
  { to: "/Planes",  label: "Planes",            icon: faDumbbell },
  { to: "/Acerca",  label: "Acerca de nosotros", icon: faPersonRunning },
];

const MOBILE_BREAKPOINT = 900;

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  const isStaff = ["ADMIN", "STAFF"].includes(user?.role);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate("/", { replace: true });
  };

  // Shadow + fondo más sólido al hacer scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cerrar con Escape + bloquear scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) setMenuOpen(false);
    };

    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className={`header ${scrolled ? "header--scrolled" : ""}`}>
        <NavLink to="/" onClick={closeMenu} className="logo-link" aria-label="Ir al inicio">
          <img src={logo} alt="ConstanFit Logo" className="logo" />
        </NavLink>

        <button
          className="hamburger"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
        </button>

        <nav
          id="primary-navigation"
          className={`navbar ${menuOpen ? "active" : ""}`}
          aria-label="Principal"
        >
          <ul className="nav-links">
            {links.map(({ to, label, icon }) => (
              <li key={to}>
                <NavLink to={to} end={to === "/"} onClick={closeMenu}>
                  <FontAwesomeIcon icon={icon} aria-hidden /> {label}
                </NavLink>
              </li>
            ))}
            {isStaff && (
              <li>
                <NavLink to="/Dashboard" onClick={closeMenu}>
                  <FontAwesomeIcon icon={faGaugeHigh} aria-hidden /> Panel
                </NavLink>
              </li>
            )}
            <li className="nav-cta">
              {user ? (
                <button type="button" onClick={handleLogout} className="nav-cta-link nav-cta-btn">
                  <FontAwesomeIcon icon={faRightFromBracket} aria-hidden /> Cerrar sesión
                </button>
              ) : (
                <NavLink to="/Login" onClick={closeMenu} className="nav-cta-link">
                  <FontAwesomeIcon icon={faRightToBracket} aria-hidden /> Iniciar sesión
                </NavLink>
              )}
            </li>
          </ul>
        </nav>
      </header>

      <div
        className={`nav-overlay ${menuOpen ? "active" : ""}`}
        onClick={closeMenu}
        aria-hidden
      />
    </>
  );
};

export default Navbar;
