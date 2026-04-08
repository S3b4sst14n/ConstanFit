import "./Navbar.css";
import logo from "../../../assets/images/Logo.png";
import { Link } from "react-router-dom";
import { useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faDumbbell, faHome, faCircleInfo, faBars, faXmark,} from "@fortawesome/free-solid-svg-icons";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <section className="header">
        <img src={logo} alt="ConstanFit Logo" className="logo" />

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
        </button>

        <nav className={`navbar ${menuOpen ? "active" : ""}`}>
          <ul className="nav-links">
            <li>
              <Link to="/" onClick={closeMenu}>
                <FontAwesomeIcon icon={faHome} /> Inicio
              </Link>
            </li>
            <li>
              <Link to="/Planes" onClick={closeMenu}>
                <FontAwesomeIcon icon={faDumbbell} /> Planes
              </Link>
            </li>
            <li>
              <Link to="/Acerca" onClick={closeMenu}>
                <FontAwesomeIcon icon={faCircleInfo} /> Acerca de nosotros
              </Link>
            </li>
            <li>
              <Link to="/Login" onClick={closeMenu}>
                <FontAwesomeIcon icon={faUser} /> Iniciar sesión
              </Link>
            </li>
          </ul>
        </nav>
      </section>

      {/* Overlay */}
      <div
        className={`nav-overlay ${menuOpen ? "active" : ""}`}
        onClick={closeMenu}
      />
    </>
  );
};

export default Navbar;