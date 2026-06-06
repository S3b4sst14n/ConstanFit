import { Check } from "lucide-react";

const benefits = [
  "Planes accesibles",
  "Entrenadores capacitados",
  "Ambiente motivador",
];

const Benefits = () => {
  return (
    <ul className="hero-benefits">
      {benefits.map((b) => (
        <li className="hero-benefits__item" key={b}>
          <Check size={16} strokeWidth={2.5} aria-hidden />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
};

export default Benefits;
