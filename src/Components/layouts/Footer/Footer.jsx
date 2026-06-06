import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebookF, faInstagram, faTiktok, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { faLocationDot, faPhone, faEnvelope, faClock } from "@fortawesome/free-solid-svg-icons";
import logo from "../../../assets/images/Logo.png";
import "./Footer.css";

const quickLinks = [
  { to: "/",       label: "Inicio" },
  { to: "/Planes", label: "Planes" },
  { to: "/Acerca", label: "Acerca de nosotros" },
  { to: "/Login",  label: "Iniciar sesión" },
];

const socials = [
  { href: "https://facebook.com",  label: "Facebook",  icon: faFacebookF },
  { href: "https://instagram.com", label: "Instagram", icon: faInstagram },
  { href: "https://tiktok.com",    label: "TikTok",    icon: faTiktok },
  { href: "https://wa.me/573136539047", label: "WhatsApp", icon: faWhatsapp },
];

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <img src={logo} alt="ConstanFit" className="footer__logo" />
          <p className="footer__tagline">
            Disciplina, constancia y resultados reales.
          </p>
          <div className="footer__socials" aria-label="Redes sociales">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="footer__social"
              >
                <FontAwesomeIcon icon={s.icon} />
              </a>
            ))}
          </div>
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">Navegación</h3>
          <ul className="footer__links">
            {quickLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">Contacto</h3>
          <ul className="footer__contact">
            <li>
              <FontAwesomeIcon icon={faLocationDot} aria-hidden />
              <span>Cl. 4 #8-161, Campo de La Cruz, Atlántico, Colombia</span>
            </li>
            <li>
              <FontAwesomeIcon icon={faPhone} aria-hidden />
              <a href="tel:+573136539047">+57 313 6539047</a>
            </li>
            <li>
              <FontAwesomeIcon icon={faEnvelope} aria-hidden />
              <a>devbyjuan@outlook.com</a>
            </li>
          </ul>
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">Horario</h3>
          <ul className="footer__contact">
            <li>
              <FontAwesomeIcon icon={faClock} aria-hidden />
              <span>Lun – Vie: 5:00 a.m. – 10:00 p.m.</span>
            </li>
            <li>
              <FontAwesomeIcon icon={faClock} aria-hidden />
              <span>Sábado: 7:00 a.m. – 6:00 p.m.</span>
            </li>
            <li>
              <FontAwesomeIcon icon={faClock} aria-hidden />
              <span>Domingo: cerrado</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer__bottom">
        <span>© {year} ConstanFit | Todos los derechos reservados</span>
      </div>
    </footer>
  );
}

export default Footer;
