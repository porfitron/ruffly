import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Home from './pages/Home'
import About from './pages/About'
import WebApp from './app/WebApp'
import { useAnalyticsScreen } from './analytics'
import { isStandaloneDisplay } from './utils/appBadge'

function StandaloneAppRedirect() {
  const { pathname } = useLocation()
  if (isStandaloneDisplay() && !pathname.startsWith('/web')) {
    return <Navigate to="/web" replace />
  }
  return null
}

function MarketingPageViews() {
  const { pathname } = useLocation()
  const screen =
    pathname.startsWith('/web')
      ? null
      : pathname === '/about'
        ? 'about'
        : 'home'
  useAnalyticsScreen(screen)
  return null
}

export default function App() {
  return (
    <>
      <StandaloneAppRedirect />
      <MarketingPageViews />
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
