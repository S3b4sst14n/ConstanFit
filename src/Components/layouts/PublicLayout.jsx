import Navbar from "./Navbar/Navbar";
import Footer from "./Footer/Footer";
import WhatsAppButton from "../WhatsAppButton/WhatsAppButton";
import PageTransition from "../routing/PageTransition";

// Layout del sitio público: nav superior + contenido + footer + WhatsApp.
const PublicLayout = () => (
  <>
    <Navbar />
    <div className="overlay">
      <PageTransition />
    </div>
    <Footer />
    <WhatsAppButton />
  </>
);

export default PublicLayout;
