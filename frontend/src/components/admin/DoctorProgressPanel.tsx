import type { AdminOverview } from '../../lib/types'
import DoctorsTable from './DoctorsTable'

interface DoctorProgressPanelProps {
  overview: AdminOverview
  onSelectExport: (doctorId: number) => void
  onDelete: (doctorId: number) => void
}

export default function DoctorProgressPanel({
  overview,
  onSelectExport,
  onDelete,
}: DoctorProgressPanelProps) {
  return (
    <div className="card">
      <div className="admin-section-title">Tài khoản bác sĩ &amp; số câu đã điền</div>
      <p className="admin-section-subtitle">
        Danh sách tài khoản bác sĩ kèm số câu đã nhập, số loại câu hỏi đã đủ 5 câu và bản đồ tiến
        độ của cả 24 loại.
      </p>

      <div className="tiles">
        <div className="tile">
          <div className="tile-label">Bác sĩ tham gia</div>
          <div className="tile-value tnum">{overview.doctors_total}</div>
        </div>
        <div className="tile accent">
          <div className="tile-label">Câu đã thu</div>
          <div className="tile-value tnum">
            {overview.entries_total}
            <small>/{overview.entries_target}</small>
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">Hoàn thành</div>
          <div className="tile-value tnum">
            {overview.completion_pct}
            <small>%</small>
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">Bác sĩ đã xong</div>
          <div className="tile-value tnum">
            {overview.doctors_done}
            <small>/{overview.doctors_total}</small>
          </div>
        </div>
      </div>

      <DoctorsTable
        doctors={overview.doctors}
        onSelectExport={onSelectExport}
        onDelete={onDelete}
      />
    </div>
  )
}
