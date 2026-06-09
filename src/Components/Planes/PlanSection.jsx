// components/PlansSection.jsx
import { useEffect, useState } from 'react';
import { PlanBasicIcon, PlanProIcon, PlanEnterpriseIcon } from './PlanIcons';
import PlanCard from './PlanCard';
import { api } from '../../lib/api';
import './PlanSection.css';

// La presentación (icono, texto, perks) se elige por la duración del plan,
// ya que el backend ya no expone un "type" sino duracionDias.
// Los íconos escalan de tier: básico → profesional → empresarial.
const PRESENTATION_BY_DURATION = {
  1: {
    Icon: PlanBasicIcon,
    buttonText: '¡Entrena hoy!',
    period: '/ día',
    perks: ['Acceso por 24 horas', 'Todo el equipamiento', 'Sin compromiso'],
  },
  15: {
    Icon: PlanProIcon,
    buttonText: 'Empieza ahora',
    period: '/ 15 días',
    perks: ['15 días consecutivos', 'Todo el equipamiento', 'Asesoría básica'],
  },
  30: {
    Icon: PlanEnterpriseIcon,
    buttonText: 'Inscribirme',
    period: '/ mes',
    perks: [
      'Acceso ilimitado todo el mes',
      'Asesoría de entrenadores',
      'Rutina personalizada',
      'Mejor relación precio/día',
    ],
  },
};

const presentationFor = (plan) =>
  PRESENTATION_BY_DURATION[plan.duracionDias] ?? {
    Icon: PlanProIcon,
    buttonText: 'Inscribirme',
    period: `/ ${plan.duracionDias} días`,
    perks: ['Todo el equipamiento'],
  };

const FALLBACK_PLANS = [
  { id: 'fallback-diario',    nombre: 'Plan Diario',    precio: 3000,  duracionDias: 1,  descripcion: 'Tienes acceso por un día completo' },
  { id: 'fallback-quincenal', nombre: 'Plan Quincenal', precio: 35000, duracionDias: 15, descripcion: 'Entrena 15 días consecutivos.' },
  { id: 'fallback-mensual',   nombre: 'Plan Mensual',   precio: 60000, duracionDias: 30, descripcion: 'Entrena todo el mes sin límites' },
];

// Precios en pesos colombianos. No anteponemos "$": el sufijo "COP" del precio
// principal (ver `toCards`) ya identifica la moneda y el "$" sería redundante.
const formatPrice = (n) => `${Number(n).toLocaleString('es-CO')}`;

// Convierte la lista de planes del backend en tarjetas. El plan de mayor
// duración se marca como destacado (antes lo era el mensual).
// Coloca la tarjeta destacada en el centro de la fila (resto a los lados).
const centerFeatured = (cards) => {
  const idx = cards.findIndex((c) => c.featured);
  if (idx === -1) return cards;
  const rest = cards.filter((_, i) => i !== idx);
  rest.splice(Math.floor(cards.length / 2), 0, cards[idx]);
  return rest;
};

const toCards = (plans) => {
  const maxDuration = Math.max(...plans.map((p) => p.duracionDias));
  return centerFeatured(plans.map((plan) => {
    const { Icon, buttonText, period, perks } = presentationFor(plan);
    // Coste por día para comparar planes de un vistazo (no se muestra en el diario).
    const perDay =
      plan.duracionDias > 1
        ? `≈ ${formatPrice(Math.round(plan.precio / plan.duracionDias))}/día`
        : null;
    return {
      id: plan.id,
      icon: <Icon size={40} />,
      buttonText,
      title: plan.nombre,
      price: `${formatPrice(plan.precio)} COP`,
      period,
      perDay,
      perks,
      description: plan.descripcion,
      featured: plan.duracionDias === maxDuration,
    };
  }));
};

const PlansSection = () => {
  const [plans, setPlans] = useState(() => toCards(FALLBACK_PLANS));
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    api.plans
      .list()
      .then((res) => {
        if (res.plans?.length) setPlans(toCards(res.plans));
      })
      .catch(() => { /* fallback ya cargado */ });
  }, []);

  const prev = () => setCurrent((i) => (i === 0 ? plans.length - 1 : i - 1));
  const next = () => setCurrent((i) => (i === plans.length - 1 ? 0 : i + 1));

  return (
    <section className="plans-section">
      <header className="plans-header">
        <span className="plans-overline">Membresías</span>
        <h1 className="plans-title">Elige el ritmo que vas a sostener</h1>
        <p className="plans-subtitle">
          Sin permanencia ni letra pequeña. Cambia o cancela cuando quieras.
        </p>
      </header>

      {/* Desktop: grid normal */}
      <div className="plans-grid">
        {plans.map((plan) => (
          <PlanCard key={plan.id} {...plan} />
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
              <div className="carousel-slide" key={plan.id}>
                <PlanCard {...plan} />
              </div>
            ))}
          </div>
        </div>

        <button className="carousel-btn carousel-btn--next" onClick={next} aria-label="Siguiente">
          &#8594;
        </button>

        <div className="carousel-dots" role="tablist" aria-label="Selector de plan">
          {plans.map((plan, i) => (
            <button
              key={plan.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Ir a ${plan.title}`}
              className={`carousel-dot ${i === current ? 'carousel-dot--active' : ''}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlansSection;
