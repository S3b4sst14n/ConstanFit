import { Outlet } from "react-router-dom";
import Navbar from "./Navbar/Navbar";
import Footer from "./Footer/Footer";
import WhatsAppButton from "../WhatsAppButton/WhatsAppButton";

// Layout del sitio público: nav superior + contenido + footer + WhatsApp.
const PublicLayout = () => (
  <>
    <Navbar />
    <div className="overlay">
      <Outlet />
    </div>
    <Footer />
    <WhatsAppButton />
  </>
);

export default PublicLayout;
