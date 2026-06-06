import { Link } from 'react-router-dom';
import { Users, Clock, MapPin, Phone, TrendingUp, HeartHandshake, Music } from 'lucide-react';
import gymPhoto from '../../assets/images/Background.png';
import './Acerca.css';

const values = [
  { Icon: TrendingUp,     title: 'Constancia',     text: 'Resultados reales nacen del trabajo diario, no de la motivación de un momento.' },
  { Icon: HeartHandshake, title: 'Acompañamiento', text: 'Cada plan se ajusta a tu nivel: principiante, intermedio o avanzado.' },
  { Icon: Music,          title: 'Ambiente',       text: 'Espacio motivador, música, equipos en buen estado y comunidad activa.' },
];

const offers = [
  { Icon: Users, title: 'Entrenadores capacitados', text: 'Profesionales certificados que diseñan tu rutina y corrigen tu técnica.' },
  { Icon: Clock, title: 'Horarios amplios',         text: 'Abierto de lunes a sábado para que se acomode a tu agenda.' },
  { Icon: MapPin, title: 'Ubicación accesible',     text: 'Fácil acceso en transporte público, parqueo cercano.' },
];

const Acerca = () => {
  return (
    <main className="about">
      <section className="about-hero">
        <span className="about-overline">Conócenos</span>
        <div className="about-hero__glass">
          <h1 className="about-title">Sobre ConstanFit</h1>
          <p className="about-lead">
            Somos un gimnasio enfocado en una sola cosa: que dejes de empezar y empieces a sostener.
            Disciplina, constancia y resultados reales.
          </p>
        </div>
      </section>

      <section className="about-block about-location">
        <h2 className="about-block__title">Dónde nos encuentras</h2>
        <div className="about-location__grid">
          <div className="about-showcase">
            <img src={gymPhoto} alt="Instalaciones de ConstanFit" loading="lazy" />
            <div className="about-showcase__caption">
              <span className="about-showcase__overline">Nuestro espacio</span>
              <p>Equipos en buen estado, ambiente motivador y una comunidad que entrena en serio.</p>
            </div>
          </div>

          <div className="about-location__map">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1962.2565540969113!2d-74.8827704!3d10.3807601!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef5fd0045235639%3A0xbbf2aef3c3bbe3eb!2sGimnasio%20deivi!5e0!3m2!1ses-419!2sco!4v1780700965276!5m2!1ses-419!2sco"
              title="Ubicación de ConstanFit en Google Maps"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <ul className="about-location__info">
          <li>
            <MapPin size={20} strokeWidth={1.8} aria-hidden />
            <span>Cl. 4 #8-161, Campo de La Cruz, Atlántico, Colombia</span>
          </li>
          <li>
            <Phone size={20} strokeWidth={1.8} aria-hidden />
            <a href="tel:+573136539047">+57 313 6539047</a>
          </li>
          <li>
            <Clock size={20} strokeWidth={1.8} aria-hidden />
            <span>Lun – Vie: 5:00 a.m. – 10:00 p.m.<br />Sábado: 7:00 a.m. – 6:00 p.m.</span>
          </li>
        </ul>
      </section>

      <section className="about-block">
        <h2 className="about-block__title">Nuestros valores</h2>
        <div className="about-grid">
          {values.map((item) => (
            <article key={item.title} className="about-card about-card--row">
              <div className="about-card__head">
                <h3>{item.title}</h3>
                <div className="about-card__icon about-card__icon--accent">
                  <item.Icon size={24} strokeWidth={1.8} />
                </div>
              </div>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-block">
        <h2 className="about-block__title">Qué te ofrecemos</h2>
        <div className="about-grid">
          {offers.map((item) => (
            <article key={item.title} className="about-card about-card--row">
              <div className="about-card__head">
                <h3>{item.title}</h3>
                <div className="about-card__icon about-card__icon--accent">
                  <item.Icon size={24} strokeWidth={1.8} />
                </div>
              </div>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-cta">
        <h2>¿Listo para forjar tu mejor versión?</h2>
        <div className="about-cta__buttons">
          <Link to="/Planes" className="about-btn about-btn--primary">Ver planes</Link>
          <Link to="/Login"  className="about-btn about-btn--ghost">Inicia sesión</Link>
        </div>
      </section>
    </main>
  );
};

export default Acerca;
