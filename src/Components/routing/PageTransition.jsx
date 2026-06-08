import { useLocation, useOutlet } from "react-router-dom";
import "./PageTransition.css";

// Anima la entrada del contenido al cambiar de ruta. Al keyear por pathname,
// React remonta el contenido y la animación CSS vuelve a reproducirse.
const PageTransition = () => {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <div key={location.pathname} className="page-transition">
      {outlet}
    </div>
  );
};

export default PageTransition;
