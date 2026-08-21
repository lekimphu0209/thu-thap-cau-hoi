import { AlertCircle, Stethoscope, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../lib/api'
import { SPECIALTY_OPTIONS } from '../lib/specialties'
import type { RegisterPayload } from '../lib/types'
import { useAuth } from '../store/auth'

export default function SignupPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterPayload>({
    email: '',
    full_name: '',
    specialty: '',
    password: '',
    confirm_password: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updateForm<K extends keyof RegisterPayload>(key: K, value: RegisterPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): string | null {
    if (!form.full_name.trim()) return 'Họ tên không được để trống'
    if (!form.email.trim()) return 'Email không được để trống'
    if (!form.specialty.trim()) return 'Vui lòng chọn chuyên khoa'
    if (form.password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự'
    if (form.password !== form.confirm_password) return 'Mật khẩu xác nhận không khớp'
    return null
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const payload: RegisterPayload = { ...form, specialty: form.specialty.trim() }
      const user = await register(payload)
      navigate(user.survey_completed ? '/workspace' : '/survey', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'Đăng ký thất bại.'))
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
          <p className="login-subtitle">Tạo tài khoản bác sĩ để đóng góp bộ câu hỏi & đáp án.</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="full_name">
              Họ tên
            </label>
            <input
              id="full_name"
              type="text"
              className="form-input"
              value={form.full_name}
              onChange={(event) => updateForm('full_name', event.target.value)}
              placeholder="Nguyễn Văn A"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={form.email}
              onChange={(event) => updateForm('email', event.target.value)}
              placeholder="ban@benhvien.vn"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="specialty">
              Chuyên khoa <span className="required-mark">*</span>
            </label>
            <select
              id="specialty"
              className="form-select"
              value={form.specialty}
              onChange={(event) => updateForm('specialty', event.target.value)}
              required
            >
              <option value="">— Chọn chuyên khoa —</option>
              {SPECIALTY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={form.password}
              onChange={(event) => updateForm('password', event.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm_password">
              Xác nhận mật khẩu
            </label>
            <input
              id="confirm_password"
              type="password"
              className="form-input"
              value={form.confirm_password}
              onChange={(event) => updateForm('confirm_password', event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-2" disabled={submitting}>
            <UserPlus size={16} style={{ marginRight: 8 }} />
            {submitting ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
          </button>
        </form>

        <p className="form-hint mt-4 text-center">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
