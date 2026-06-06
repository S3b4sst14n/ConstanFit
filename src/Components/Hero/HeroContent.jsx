import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Benefits from "./Benefit";

const HeroContent = () => {
  return (
    <div className="hero-content">
      <span className="hero-overline">Entrena con propósito</span>

      <h1 className="hero-title">
        Forja tu <span className="hero-title__accent">mejor versión</span>
      </h1>

      <p className="hero-lead">
        Disciplina, constancia y resultados que se sostienen en el tiempo.
      </p>

      <div className="hero-actions">
        <Link to="/Planes" className="btn btn--primary">
          Empieza hoy <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
        </Link>
        <Link to="/Acerca" className="btn btn--ghost">
          Conócenos
        </Link>
      </div>

      <Benefits />
    </div>
  );
};

export default HeroContent;
