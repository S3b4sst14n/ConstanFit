import Model from "../../assets/images/Model.png";
import CTAButton from "./CTAButton";

const HeroImage = () => {
  return (
    <div className="hero-image">
      <div className="image-card">
        <img src={Model} alt="Modelo fitness" />
      </div>
      <CTAButton />
    </div>
  );
};

export default HeroImage;