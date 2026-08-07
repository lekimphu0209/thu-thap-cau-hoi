import { X } from 'lucide-react'
import { SURVEY_STATUS_LABEL, formatAnswer } from '../../lib/surveyFormat'
import type { SurveyDefinition, SurveyResponse } from '../../lib/types'

interface SurveyDetailModalProps {
  response: SurveyResponse
  definition: SurveyDefinition
  onClose: () => void
}

export default function SurveyDetailModal({
  response,
  definition,
  onClose,
}: SurveyDetailModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Khảo sát — {response.full_name}</span>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="survey-answer-grid">
            <div>Email</div>
            <div>{response.email}</div>
            <div>Chuyên khoa tài khoản</div>
            <div>{response.specialty ?? '—'}</div>
            <div>Trạng thái</div>
            <div>{SURVEY_STATUS_LABEL[response.status] ?? response.status}</div>
            <div>Thời điểm hoàn thành</div>
            <div>
              {response.completed_at
                ? new Date(response.completed_at).toLocaleString('vi-VN')
                : '—'}
            </div>
            <div>Phiên bản khảo sát</div>
            <div>{response.version ?? '—'}</div>
          </div>

          {definition.sections.map((section) => (
            <div className="survey-answer-section" key={section.code}>
              <h4>{section.title}</h4>
              <div className="survey-answer-grid">
                {section.questions.map((question) => (
                  <div style={{ display: 'contents' }} key={question.code}>
                    <div>{question.label}</div>
                    <div>{formatAnswer(question, response.answers, definition)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
