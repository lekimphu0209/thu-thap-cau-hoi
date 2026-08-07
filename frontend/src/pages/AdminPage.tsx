import { useState } from 'react'
import { doctorsApi } from '../api/doctorsApi'
import AddDoctorForm from '../components/admin/AddDoctorForm'
import DoctorProgressPanel from '../components/admin/DoctorProgressPanel'
import ExportPanel from '../components/admin/ExportPanel'
import SubgroupManager from '../components/admin/SubgroupManager'
import SurveyPanel from '../components/admin/SurveyPanel'
import Toast from '../components/Toast'
import TopBar from '../components/TopBar'
import { useAdminOverview } from '../hooks/useAdminOverview'
import { useTaxonomy } from '../hooks/useTaxonomy'
import { useToast } from '../hooks/useToast'

export default function AdminPage() {
  const { overview, loading, refresh } = useAdminOverview()
  const { groups, refresh: refreshTaxonomy } = useTaxonomy()
  const { toastMessage, showToast } = useToast()
  const [exportDoctorId, setExportDoctorId] = useState<number | null>(null)

  async function handleDoctorCreated(message: string) {
    showToast(message)
    await refresh()
  }

  async function handleDeleteDoctor(doctorId: number) {
    try {
      await doctorsApi.remove(doctorId)
      showToast('Đã xoá bác sĩ thành công.')
      await refresh()
    } catch {
      showToast('Xoá thất bại. Vui lòng thử lại.')
    }
  }

  return (
    <div className="flex-col" style={{ minHeight: '100%' }}>
      <TopBar title="Dataset Builder" subtitle="Nền tảng thu thập bộ câu hỏi & đáp án chuẩn cho chatbot y tế." />

      <div className="list-page" style={{ overflowY: 'auto' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Bác sĩ &amp; tiến độ</h1>
            <p className="page-subtitle">
              Mỗi bác sĩ phụ trách một chuyên khoa và tự viết 5 câu × 24 loại = 120 câu. Theo dõi
              tiến độ từng người và của cả nhóm tại đây.
            </p>
          </div>
        </div>

        <AddDoctorForm onCreated={handleDoctorCreated} />

        {loading || !overview ? (
          <div className="loading-center">
            <span className="loading-spinner" />
            Đang tải dữ liệu...
          </div>
        ) : (
          <>
            <div className="admin-section">
              <DoctorProgressPanel
                overview={overview}
                onSelectExport={(doctorId) => {
                  setExportDoctorId(doctorId)
                  document.getElementById('export-panel')?.scrollIntoView({ behavior: 'smooth' })
                }}
                onDelete={handleDeleteDoctor}
              />
            </div>

            <div className="admin-section">
              <SurveyPanel notify={showToast} />
            </div>

            <div className="admin-section">
              <SubgroupManager groups={groups} onChanged={() => Promise.all([refresh(), refreshTaxonomy()])} />
            </div>

            <div className="admin-section" id="export-panel">
              <ExportPanel
                doctors={overview.doctors}
                groups={groups}
                presetDoctorId={exportDoctorId}
                notify={showToast}
              />
            </div>
          </>
        )}
      </div>

      <Toast message={toastMessage} />
    </div>
  )
}
