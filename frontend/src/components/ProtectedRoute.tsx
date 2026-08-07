import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

interface ProtectedRouteProps {
  allowedRole: 'admin' | 'doctor'
  requiresSurvey?: boolean
  children: React.ReactNode
}

export default function ProtectedRoute({
  allowedRole,
  requiresSurvey = true,
  children,
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }
  if (user.role !== allowedRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/workspace'} replace />
  }
  if (user.role === 'doctor' && requiresSurvey && !user.survey_completed) {
    return <Navigate to="/survey" replace />
  }
  return <>{children}</>
}
