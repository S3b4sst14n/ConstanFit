import CTAButton from "./CTAButton";
import "./Hero.css";
import HeroContent from "./HeroContent";
import HeroImage from "./HeroImage";

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-overlay">
        <HeroContent />
        <HeroImage />
      </div>
    </section>
  );
};

export default Hero;