import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { RequireAuth, RequireRole } from '@/routes/ProtectedRoute'
import LandingPage from '@/pages/public/LandingPage'
import LoginPage from '@/pages/public/LoginPage'
import SignupPage from '@/pages/public/SignupPage'
import DashboardPage from '@/pages/student/DashboardPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route element={<RequireRole roles={['mentor']} />}>
              {/* mentor routes added in a later task */}
            </Route>

            <Route element={<RequireRole roles={['admin']} />}>
              {/* admin routes added in a later task */}
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
