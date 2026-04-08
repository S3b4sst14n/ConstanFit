import Benefits from "./Benefit";
import SocialIcons from "./SocialIcons";

const HeroContent = () => {
  return (
    <div className="hero-content">
      <div className="glass-box">
        <h1>Forja tu mejor versión</h1>
        <p>Disciplina, constancia y resultados reales.</p>
      </div>

      <Benefits />
      <SocialIcons />
    </div>
  );
};

export default HeroContent;