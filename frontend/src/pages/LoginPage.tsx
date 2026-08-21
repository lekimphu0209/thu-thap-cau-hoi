import { AlertCircle, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../lib/api'
import { useAuth } from '../store/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await login(email, password)
      if (user.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate(user.survey_completed ? '/workspace' : '/survey', { replace: true })
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Đăng nhập thất bại.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-header">
          <div className="login-icon">
            <Stethoscope size={28} color="var(--accent)" />
          </div>
          <h1 className="login-title">Dataset Builder</h1>
          <p className="login-subtitle">
            Nền tảng thu thập bộ câu hỏi &amp; đáp án chuẩn cho chatbot y tế.
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ban@benhvien.vn"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-2" disabled={submitting}>
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="form-hint mt-4 text-center">
          Chưa có tài khoản? <Link to="/signup">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  )
}
