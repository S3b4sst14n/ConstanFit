import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import "./WhatsAppButton.css";

// Número en formato internacional sin "+" ni espacios.
const PHONE = "573136539047";
const MESSAGE = "Hola, quiero información sobre los planes de ConstanFit.";

const WhatsAppButton = () => {
  const href = `https://wa.me/${PHONE}?text=${encodeURIComponent(MESSAGE)}`;

  return (
    <a
      className="wa-fab"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
    >
      <span className="wa-fab__pulse" aria-hidden />
      <FontAwesomeIcon icon={faWhatsapp} className="wa-fab__icon" />
      <span className="wa-fab__label">¿Hablamos?</span>
    </a>
  );
};

export default WhatsAppButton;
