import Model from "../../assets/images/Model.png";

const HeroImage = () => {
  return (
    <div className="hero-image">
      <div className="hero-image__card">
        <div className="hero-image__glow" aria-hidden />
        <img src={Model} alt="Atleta entrenando en ConstanFit" />
      </div>

      <div className="hero-float" aria-hidden>
        <span className="hero-float__num">+500</span>
        <span className="hero-float__label">miembros activos</span>
      </div>
    </div>
  );
};

export default HeroImage;
