// components/PlansSection.jsx
import { useState } from 'react';
import PlanCard from './PlanCard';
import './PlanSection.css';

const plans = [
  {
    title: 'Plan Diario',
    price: '3.000',
    description: 'Tienes acceso por un día completo',
    buttonText: '¡Entrena hoy!',
    icon: '🏋️',
  },
  {
    title: 'Plan Mensual',
    price: '60.000',
    description: 'Entrena todo el mes sin límites',
    buttonText: 'Inscribirme',
    icon: '💪',
    featured: true,
  },
  {
    title: 'Plan Quincenal',
    price: '35.000',
    description: 'Entrena 15 días consecutivos.',
    buttonText: 'Empieza ahora',
    icon: '🥊',
  },
];

const PlansSection = () => {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((i) => (i === 0 ? plans.length - 1 : i - 1));
  const next = () => setCurrent((i) => (i === plans.length - 1 ? 0 : i + 1));

  return (
    <section className="plans-section">

      {/* Desktop: grid normal */}
      <div className="plans-grid">
        {plans.map((plan) => (
          <PlanCard key={plan.title} {...plan} />
        ))}
      </div>

      {/* Mobile: carrusel */}
      <div className="plans-carousel">
        <button className="carousel-btn carousel-btn--prev" onClick={prev} aria-label="Anterior">
          &#8592;
        </button>

        <div className="carousel-track-wrapper">
          <div
            className="carousel-track"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {plans.map((plan) => (
              <div className="carousel-slide" key={plan.title}>
                <PlanCard {...plan} />
              </div>
            ))}
          </div>
        </div>

        <button className="carousel-btn carousel-btn--next" onClick={next} aria-label="Siguiente">
          &#8594;
        </button>

      </div>
    </section>
  );
};

export default PlansSection;
