import { useState } from 'react'
import { doctorsApi } from '../../api/doctorsApi'
import { extractErrorMessage } from '../../lib/api'
import { useSpecialties } from '../../hooks/useSpecialties'

interface AddDoctorFormProps {
  onCreated: (message: string) => void
}

function blankFields() {
  return { fullName: '', email: '', specialty: '', password: '' }
}

export default function AddDoctorForm({ onCreated }: AddDoctorFormProps) {
  const specialties = useSpecialties()
  const [fields, setFields] = useState(blankFields)
  const specialty = fields.specialty || specialties[0] || ''
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof ReturnType<typeof blankFields>>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await doctorsApi.create({
        full_name: fields.fullName,
        email: fields.email,
        specialty,
        password: fields.password,
      })
      onCreated(`✓ Đã thêm ${fields.fullName} — ${specialty}`)
      setFields(blankFields())
    } catch (err) {
      setError(extractErrorMessage(err, 'Không thể tạo tài khoản bác sĩ.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <div className="admin-section-title">Thêm bác sĩ mới</div>
      <p className="admin-section-subtitle">
        Tạo tài khoản cho bác sĩ; mỗi bác sĩ phụ trách một chuyên khoa và sẽ tự viết 5 câu × 24
        loại = 120 câu sau khi đăng nhập.
      </p>
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="doctor-form-grid">
          <div className="form-group">
            <label className="form-label">
              Họ tên bác sĩ <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              value={fields.fullName}
              onChange={(event) => update('fullName', event.target.value)}
              placeholder="VD: BS. Vũ Thị Mai"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Email đăng nhập <span className="required-mark">*</span>
            </label>
            <input
              type="email"
              className="form-input"
              required
              value={fields.email}
              onChange={(event) => update('email', event.target.value)}
              placeholder="bacsi@benhvien.vn"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Chuyên khoa phụ trách <span className="required-mark">*</span>
            </label>
            <select
              className="form-select"
              value={specialty}
              onChange={(event) => update('specialty', event.target.value)}
            >
              {specialties.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              Mật khẩu tạm <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              minLength={6}
              value={fields.password}
              onChange={(event) => update('password', event.target.value)}
              placeholder="Tối thiểu 6 ký tự"
            />
          </div>
        </div>
        <div className="mt-4">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Đang thêm...' : '✓ Thêm bác sĩ'}
          </button>
        </div>
      </form>
    </div>
  )
}
