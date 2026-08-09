import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Home from './pages/Home'
import About from './pages/About'
import WebApp from './app/WebApp'

export default function App() {
  return (
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
  )
}
