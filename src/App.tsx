import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AuthProvider } from '@/context/AuthContext'
import { FullPageSpinner, RequireAuth, RequireRole } from '@/routes/ProtectedRoute'
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
import MentorsListPage from '@/pages/admin/MentorsListPage'
import StudentAdminDetailPage from '@/pages/admin/StudentAdminDetailPage'
import BrokenLinksPage from '@/pages/admin/BrokenLinksPage'
import CertificateEditorPage from '@/pages/admin/CertificateEditorPage'
import CertificatePage from '@/pages/public/CertificatePage'
import ResetPasswordRequestPage from '@/pages/public/ResetPasswordRequestPage'
import ResetPasswordConfirmPage from '@/pages/public/ResetPasswordConfirmPage'
import SettingsPage from '@/pages/student/SettingsPage'
import MyQuestionsPage from '@/pages/student/MyQuestionsPage'
import CoachingPage from '@/pages/student/CoachingPage'
import NewQuestionPage from '@/pages/student/NewQuestionPage'
import PortfolioPage from '@/pages/student/PortfolioPage'
import TicketPage from '@/pages/shared/TicketPage'
import QuestionsPage from '@/pages/shared/QuestionsPage'
import NotFoundPage from '@/pages/public/NotFoundPage'

function QuestionsHome() {
  const { profile } = useAuth()
  // Wait for the role, or a student would briefly see the mentor queue.
  if (!profile) return <FullPageSpinner />
  return profile.role === 'student' ? <MyQuestionsPage /> : <QuestionsPage />
}

function LegacyTicketRedirect() {
  const { ticketId } = useParams()
  return <Navigate to={`/questions/${ticketId}`} replace />
}

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

            <Route element={<RequireRole roles={['student']} />}>
              <Route path="/questions/new" element={<NewQuestionPage />} />
              <Route path="/dashboard/coaching" element={<CoachingPage />} />
              <Route path="/dashboard/portfolio" element={<PortfolioPage />} />
            </Route>

            {/* One questions area for every role: students get their own inbox, mentors and admins the queue. */}
            <Route path="/questions" element={<QuestionsHome />} />
            <Route path="/questions/:ticketId" element={<TicketPage />} />
            {/* Old /messages links (e.g. in emails already sent) */}
            <Route path="/messages" element={<Navigate to="/questions" replace />} />
            <Route path="/messages/new" element={<Navigate to="/questions/new" replace />} />
            <Route path="/messages/:ticketId" element={<LegacyTicketRedirect />} />

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
              <Route path="/admin/students" element={<StudentsListPage />} />
              <Route path="/admin/mentors" element={<MentorsListPage />} />
              <Route path="/admin/students/:studentId" element={<StudentAdminDetailPage />} />
              <Route path="/admin/broken-links" element={<BrokenLinksPage />} />
              <Route path="/admin/certificate" element={<CertificateEditorPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
