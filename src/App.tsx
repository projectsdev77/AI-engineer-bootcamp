import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { RequireAuth, RequireRole } from '@/routes/ProtectedRoute'
import LandingPage from '@/pages/public/LandingPage'
import CurriculumPage from '@/pages/public/CurriculumPage'
import LoginPage from '@/pages/public/LoginPage'
import SignupPage from '@/pages/public/SignupPage'
import DashboardPage from '@/pages/student/DashboardPage'
import WeekPage from '@/pages/student/WeekPage'
import LessonPage from '@/pages/student/LessonPage'
import AssignmentPage from '@/pages/student/AssignmentPage'
import ExceptionQueuePage from '@/pages/shared/ExceptionQueuePage'
import MentorDashboardPage from '@/pages/mentor/MentorDashboardPage'
import StudentDetailPage from '@/pages/mentor/StudentDetailPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/curriculum" element={<CurriculumPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/weeks/:weekId" element={<WeekPage />} />
            <Route path="/weeks/:weekId/lessons/:lessonId" element={<LessonPage />} />
            <Route path="/weeks/:weekId/assignments/:assignmentId" element={<AssignmentPage />} />

            <Route element={<RequireRole roles={['mentor']} />}>
              <Route path="/mentor" element={<MentorDashboardPage />} />
              <Route path="/mentor/students/:studentId" element={<StudentDetailPage />} />
              <Route path="/mentor/queue" element={<ExceptionQueuePage />} />
            </Route>

            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/admin/queue" element={<ExceptionQueuePage />} />
              {/* remaining admin routes added in a later task */}
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
