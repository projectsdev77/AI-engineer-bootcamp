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
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import CurriculumListPage from '@/pages/admin/CurriculumListPage'
import WeekEditorPage from '@/pages/admin/WeekEditorPage'
import LessonEditorPage from '@/pages/admin/LessonEditorPage'
import AssignmentEditorPage from '@/pages/admin/AssignmentEditorPage'
import StudentsListPage from '@/pages/admin/StudentsListPage'
import StudentAdminDetailPage from '@/pages/admin/StudentAdminDetailPage'
import BrokenLinksPage from '@/pages/admin/BrokenLinksPage'
import CertificateEditorPage from '@/pages/admin/CertificateEditorPage'
import CertificatePage from '@/pages/public/CertificatePage'
import ResetPasswordRequestPage from '@/pages/public/ResetPasswordRequestPage'
import ResetPasswordConfirmPage from '@/pages/public/ResetPasswordConfirmPage'
import SettingsPage from '@/pages/student/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/curriculum" element={<CurriculumPage />} />
          <Route path="/certificates/:code" element={<CertificatePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordRequestPage />} />
          <Route path="/reset-password/confirm" element={<ResetPasswordConfirmPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/weeks/:weekId" element={<WeekPage />} />
            <Route path="/weeks/:weekId/lessons/:lessonId" element={<LessonPage />} />
            <Route path="/weeks/:weekId/assignments/:assignmentId" element={<AssignmentPage />} />

            <Route element={<RequireRole roles={['mentor']} />}>
              <Route path="/mentor" element={<MentorDashboardPage />} />
              <Route path="/mentor/students/:studentId" element={<StudentDetailPage />} />
              <Route path="/mentor/queue" element={<ExceptionQueuePage />} />
            </Route>

            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/curriculum" element={<CurriculumListPage />} />
              <Route path="/admin/curriculum/weeks/:weekId" element={<WeekEditorPage />} />
              <Route path="/admin/curriculum/lessons/:lessonId" element={<LessonEditorPage />} />
              <Route path="/admin/curriculum/assignments/:assignmentId" element={<AssignmentEditorPage />} />
              <Route path="/admin/queue" element={<ExceptionQueuePage />} />
              <Route path="/admin/students" element={<StudentsListPage />} />
              <Route path="/admin/students/:studentId" element={<StudentAdminDetailPage />} />
              <Route path="/admin/broken-links" element={<BrokenLinksPage />} />
              <Route path="/admin/certificate" element={<CertificateEditorPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
