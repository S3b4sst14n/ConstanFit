import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import Home from './Components/Home/Home'
import Planes from './Components/Pages/Planes'
import Acerca from './Components/Pages/Acerca'
import Login from './Components/Pages/Login'
import Dashboard from './Components/Pages/Dashboard'
import Asistencias from './Components/Pages/Asistencias'
import Ingresos from './Components/Pages/Ingresos'
import RequireRole from './Components/routing/RequireRole'
import PublicLayout from './Components/layouts/PublicLayout'
import DashboardLayout from './Components/layouts/DashboardLayout/DashboardLayout'

function App() {
  return (
    <Router>
      <Routes>
        {/* Sitio público: nav superior + footer */}
        <Route element={<PublicLayout/>}>
          <Route path='/' element={<Home/>}/>
          <Route path='/Planes' element={<Planes/>}/>
          <Route path='/Acerca' element={<Acerca/>}/>
          <Route path='/Login' element={<Login/>}/>
        </Route>

        {/* Panel admin/staff: sidebar lateral colapsable */}
        <Route
          path='/Dashboard'
          element={
            <RequireRole roles={['ADMIN', 'STAFF']}>
              <DashboardLayout/>
            </RequireRole>
          }
        >
          <Route index element={<Dashboard/>}/>
          <Route path='Asistencias' element={<Asistencias/>}/>
          <Route path='Ingresos' element={<Ingresos/>}/>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
