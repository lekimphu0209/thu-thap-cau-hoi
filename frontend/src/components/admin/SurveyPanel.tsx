import { Download, Eye, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { surveyApi, type SurveyExportFormat } from '../../api/surveyApi'
import { extractErrorMessage } from '../../lib/api'
import { SURVEY_STATUS_LABEL } from '../../lib/surveyFormat'
import type { SurveyDefinition, SurveyOverview, SurveyResponse } from '../../lib/types'
import SurveyDetailModal from './SurveyDetailModal'

const STATUS_CLASS: Record<string, string> = {
  completed: 'done',
  in_progress: 'in_progress',
  not_started: 'new',
}

interface SurveyPanelProps {
  notify: (message: string) => void
}

export default function SurveyPanel({ notify }: SurveyPanelProps) {
  const [overview, setOverview] = useState<SurveyOverview | null>(null)
  const [definition, setDefinition] = useState<SurveyDefinition | null>(null)
  const [selected, setSelected] = useState<SurveyResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadOverview = useCallback(
    () => surveyApi.listResponses().then((response) => setOverview(response.data)),
    [],
  )

  useEffect(() => {
    Promise.all([loadOverview(), surveyApi.getDefinition()])
      .then(([, definitionResponse]) => setDefinition(definitionResponse.data))
      .finally(() => setLoading(false))
  }, [loadOverview])

  async function handleDelete(response: SurveyResponse) {
    if (
      !window.confirm(
        `Xoá câu trả lời khảo sát của "${response.full_name}"?\nBác sĩ sẽ phải điền lại khảo sát trong lần đăng nhập kế tiếp.`,
      )
    ) {
      return
    }
    try {
      await surveyApi.deleteResponse(response.doctor_id)
      await loadOverview()
      notify('Đã xoá câu trả lời khảo sát.')
    } catch (error) {
      notify(extractErrorMessage(error, 'Không thể xoá câu trả lời khảo sát.'))
    }
  }

  async function handleDownload(format: SurveyExportFormat) {
    try {
      await surveyApi.download(format)
      notify(`✓ Đã tải khảo sát ${format.toUpperCase()}`)
    } catch (error) {
      notify(extractErrorMessage(error, `Không thể xuất file ${format.toUpperCase()}.`))
    }
  }

  return (
    <div className="card">
      <div className="admin-section-title">Khảo sát bác sĩ</div>
      <p className="admin-section-subtitle">
        Theo dõi tình trạng hoàn thành phiếu chấp thuận và thông tin nghề nghiệp của từng bác sĩ.
        Bác sĩ phải hoàn thành khảo sát trước khi được nhập dữ liệu.
      </p>

      {loading || !overview || !definition ? (
        <div className="loading-center">
          <span className="loading-spinner" />
          Đang tải khảo sát...
        </div>
      ) : (
        <>
          <div className="tiles">
            <div className="tile">
              <div className="tile-label">Tổng bác sĩ</div>
              <div className="tile-value tnum">{overview.doctors_total}</div>
            </div>
            <div className="tile accent">
              <div className="tile-label">Đã hoàn thành</div>
              <div className="tile-value tnum">
                {overview.completed_total}
                <small>/{overview.doctors_total}</small>
              </div>
            </div>
            <div className="tile">
              <div className="tile-label">Đang điền</div>
              <div className="tile-value tnum">{overview.in_progress_total}</div>
            </div>
            <div className="tile">
              <div className="tile-label">Chưa bắt đầu</div>
              <div className="tile-value tnum">{overview.not_started_total}</div>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bác sĩ</th>
                  <th>Chuyên khoa</th>
                  <th>Trạng thái</th>
                  <th>Hoàn thành lúc</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {overview.responses.map((response) => (
                  <tr key={response.doctor_id}>
                    <td>
                      <b>{response.full_name}</b>
                      <small
                        style={{
                          display: 'block',
                          color: 'var(--text-muted)',
                          fontFamily: 'ui-monospace, Menlo, monospace',
                        }}
                      >
                        {response.email}
                      </small>
                    </td>
                    <td>
                      <span className="badge badge-default">{response.specialty ?? '—'}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${STATUS_CLASS[response.status] ?? 'new'}`}>
                        {SURVEY_STATUS_LABEL[response.status] ?? response.status}
                      </span>
                    </td>
                    <td className="text-sm">
                      {response.completed_at
                        ? new Date(response.completed_at).toLocaleString('vi-VN')
                        : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          disabled={response.status === 'not_started'}
                          onClick={() => setSelected(response)}
                        >
                          <Eye size={13} /> Xem
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-xs"
                          title="Xoá câu trả lời khảo sát"
                          disabled={response.status === 'not_started'}
                          onClick={() => handleDelete(response)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {overview.responses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      Chưa có bác sĩ nào trong hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 mt-4">
            <button type="button" className="btn btn-secondary" onClick={() => handleDownload('json')}>
              <Download size={14} /> JSON
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => handleDownload('csv')}>
              <Download size={14} /> CSV
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => handleDownload('xlsx')}>
              <Download size={14} /> XLSX
            </button>
          </div>
        </>
      )}

      {selected && definition && (
        <SurveyDetailModal
          response={selected}
          definition={definition}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
