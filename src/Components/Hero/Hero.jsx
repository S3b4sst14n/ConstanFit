import "./Hero.css";
import HeroContent from "./HeroContent";
import HeroImage from "./HeroImage";

const stats = [
  { num: "+3", suffix: " años", label: "formando atletas" },
  { num: "100", suffix: "+", label: "rutinas guiadas" },
  { num: "4.9", suffix: "★", label: "valoración media" },
];

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero__inner">
        <HeroContent />
        <HeroImage />
      </div>

      <ul className="hero-stats" aria-label="Cifras de ConstanFit">
        {stats.map((s) => (
          <li className="hero-stats__item" key={s.label}>
            <span className="hero-stats__num">
              {s.num}
              <span className="hero-stats__suffix">{s.suffix}</span>
            </span>
            <span className="hero-stats__label">{s.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Hero;
