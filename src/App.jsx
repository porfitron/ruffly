import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Home from './pages/Home'
import About from './pages/About'
import WebApp from './app/WebApp'
import { isStandaloneDisplay } from './utils/appBadge'

function StandaloneAppRedirect() {
  const { pathname } = useLocation()
  if (isStandaloneDisplay() && !pathname.startsWith('/web')) {
    return <Navigate to="/web" replace />
  }
  return null
}

export default function App() {
  return (
    <>
      <StandaloneAppRedirect />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/web/*"
          element={
            <AppProvider>
              <WebApp />
            </AppProvider>
          }
        />
      </Routes>
    </>
  )
}
