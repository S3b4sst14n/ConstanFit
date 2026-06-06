import { Check } from 'lucide-react';
import './PlanSection.css';

const PlanCard = ({
  icon,
  title,
  price,
  period,
  perDay,
  description,
  perks = [],
  buttonText,
  featured,
}) => {
  return (
    <article className={`plan-card ${featured ? 'plan-card--featured' : ''}`}>
      {featured && <span className="plan-card__badge">Más elegido</span>}

      <div className="plan-card__icon-wrapper">
        <span className="plan-card__icon">{icon}</span>
      </div>

      <h3 className="plan-card__title">{title}</h3>

      <div className="plan-card__price-wrap">
        <span className="plan-card__price">{price}</span>
        {period && <span className="plan-card__period">{period}</span>}
      </div>

      {perDay && <span className="plan-card__perday">{perDay}</span>}

      <p className="plan-card__description">{description}</p>

      {perks.length > 0 && (
        <ul className="plan-card__perks">
          {perks.map((perk) => (
            <li key={perk}>
              <Check size={16} strokeWidth={2.5} aria-hidden />
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      )}

      <button className={`plan-card__btn ${featured ? 'plan-card__btn--featured' : ''}`}>
        {buttonText}
      </button>
    </article>
  );
};

export default PlanCard;
