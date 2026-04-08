import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import Home from './Components/Home/Home'
import Navbar from './Components/layouts/Navbar/Navbar'
import Footer from './Components/layouts/Footer/Footer'
import Planes from './Components/Pages/Planes'
import Acerca from './Components/Pages/Acerca'
import Login from './Components/Pages/Login'

function App() {
  return (
    <>
      <Router>
        <Navbar/>
        <div className="overlay">
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/Planes' element={<Planes/>}/>
          <Route path='/Acerca' element={<Acerca/>}/>
          <Route path='/Login' element={<Login/>}/>
        </Routes>
        </div>
        <Footer/>
      </Router>
    </>
  )
}

export default App
