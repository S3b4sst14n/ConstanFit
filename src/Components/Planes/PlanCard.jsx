import './PlanSection.css';

const PlanCard = ({ icon, title, price, description, buttonText, featured }) => {
  return (
    <div className={`plan-card ${featured ? 'plan-card--featured' : ''}`}>
      <div className="plan-card__icon-wrapper">
        <span className="plan-card__icon">{icon}</span>
      </div>
      <h3 className="plan-card__title">{title}</h3>
      <p className="plan-card__price">{price}</p>
      <p className="plan-card__description">{description}</p>
      <button className={`plan-card__btn ${featured ? 'plan-card__btn--featured' : ''}`}>
        {buttonText}
      </button>
    </div>
  );
};

export default PlanCard;
