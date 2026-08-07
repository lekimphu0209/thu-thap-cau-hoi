import { ArrowLeft, ArrowRight, Check, CloudOff, Loader2, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import QuestionField from '../components/survey/QuestionField'
import Toast from '../components/Toast'
import TopBar from '../components/TopBar'
import { useSurvey } from '../hooks/useSurvey'
import { useToast } from '../hooks/useToast'
import { extractErrorMessage } from '../lib/api'
import { countAnswered, validateSection, type SurveyErrors } from '../lib/surveyValidation'
import type { SurveyAnswerValue } from '../lib/types'
import { useAuth } from '../store/auth'

export default function SurveyPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const { toastMessage, showToast } = useToast()
  const { definition, answers, loading, saveState, setAnswer, submit } = useSurvey({
    consent_signature: user?.full_name ?? '',
    primary_specialty: user?.specialty ?? '',
  })

  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState<SurveyErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const sections = definition?.sections ?? []
  const section = sections[stepIndex]
  const alreadyCompleted = user?.survey_completed === true

  const progress = useMemo(() => {
    if (!definition) return { answered: 0, total: 0, pct: 0 }
    const total = definition.sections.reduce((sum, item) => sum + item.questions.length, 0)
    const answered = definition.sections.reduce(
      (sum, item) => sum + countAnswered(item, answers),
      0,
    )
    return { answered, total, pct: total ? Math.round((answered / total) * 100) : 0 }
  }, [definition, answers])

  if (alreadyCompleted) {
    return <Navigate to="/workspace" replace />
  }

  if (loading || !definition || !section) {
    return (
      <div className="flex-col" style={{ minHeight: '100%' }}>
        <TopBar title="Dataset Builder" subtitle="Khảo sát trước khi bắt đầu đóng góp dữ liệu." />
        <div className="loading-center">
          <span className="loading-spinner" />
          Đang tải khảo sát...
        </div>
      </div>
    )
  }

  function goTo(nextIndex: number) {
    setStepIndex(nextIndex)
    setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNext() {
    const sectionErrors = validateSection(section, answers, definition!)
    if (Object.keys(sectionErrors).length > 0) {
      setErrors(sectionErrors)
      showToast('Vui lòng hoàn thiện các mục còn thiếu.')
      return
    }
    goTo(stepIndex + 1)
  }

  async function handleSubmit() {
    const allErrors = definition!.sections.reduce<SurveyErrors>(
      (acc, item) => ({ ...acc, ...validateSection(item, answers, definition!) }),
      {},
    )
    if (Object.keys(allErrors).length > 0) {
      const firstIndex = definition!.sections.findIndex((item) =>
        item.questions.some((question) => allErrors[question.code]),
      )
      setStepIndex(firstIndex >= 0 ? firstIndex : 0)
      setErrors(allErrors)
      showToast('Vui lòng hoàn thiện các mục còn thiếu.')
      return
    }

    setSubmitting(true)
    try {
      await submit()
      await refreshUser()
      navigate('/workspace', { replace: true })
    } catch (error) {
      showToast(extractErrorMessage(error, 'Không thể gửi khảo sát.'))
    } finally {
      setSubmitting(false)
    }
  }

  const isLastStep = stepIndex === sections.length - 1

  return (
    <div className="flex-col" style={{ minHeight: '100%' }}>
      <TopBar title="Dataset Builder" subtitle="Khảo sát trước khi bắt đầu đóng góp dữ liệu.">
        <div className="survey-save-state">
          {saveState === 'saving' && (
            <>
              <Loader2 size={13} className="spin" /> Đang lưu...
            </>
          )}
          {saveState === 'saved' && (
            <>
              <Check size={13} /> Đã lưu tạm
            </>
          )}
          {saveState === 'error' && (
            <>
              <CloudOff size={13} /> Chưa lưu được
            </>
          )}
        </div>
      </TopBar>

      <div className="survey-page">
        <div className="survey-intro">
          <div className="survey-badge">
            <ShieldCheck size={14} /> Bắt buộc trước khi sử dụng hệ thống
          </div>
          <h1 className="page-title">Khảo sát dành cho bác sĩ tham gia</h1>
          <p className="page-subtitle">
            Khảo sát gồm {sections.length} phần, mất khoảng 5–10 phút. Câu trả lời được lưu tạm tự
            động, bạn có thể quay lại hoàn thành sau.
          </p>
        </div>

        <div className="survey-steps">
          {sections.map((item, index) => (
            <button
              key={item.code}
              type="button"
              className={`survey-step${index === stepIndex ? ' active' : ''}${index < stepIndex ? ' done' : ''}`}
              onClick={() => index < stepIndex && goTo(index)}
            >
              <span className="survey-step-index">
                {index < stepIndex ? <Check size={13} /> : index + 1}
              </span>
              <span className="survey-step-title">{item.title}</span>
            </button>
          ))}
        </div>

        <div className="survey-progress">
          <div className="bar">
            <div className="fill" style={{ width: `${progress.pct}%` }} />
          </div>
          <small className="tnum">
            {progress.answered}/{progress.total} mục
          </small>
        </div>

        <div className="card survey-card">
          <div className="survey-section-head">
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </div>

          {section.consent_blocks.length > 0 && (
            <div className="consent-document">
              {section.consent_blocks.map((block) => (
                <section key={block.heading}>
                  <h3>{block.heading}</h3>
                  {block.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>
          )}

          <div className="survey-question-list">
            {section.questions.map((question) => (
              <QuestionField
                key={question.code}
                question={question}
                value={answers[question.code] ?? null}
                otherValue={
                  (answers[`${question.code}${definition.other_suffix}`] as string) ?? ''
                }
                error={errors[question.code]}
                otherToken={definition.other_value}
                onChange={(value: SurveyAnswerValue) => setAnswer(question.code, value)}
                onOtherChange={(value) =>
                  setAnswer(`${question.code}${definition.other_suffix}`, value)
                }
              />
            ))}
          </div>

          <div className="survey-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={stepIndex === 0}
              onClick={() => goTo(stepIndex - 1)}
            >
              <ArrowLeft size={14} /> Quay lại
            </button>
            <div className="flex-1" />
            {isLastStep ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={handleSubmit}
              >
                <Check size={14} /> {submitting ? 'Đang gửi...' : 'Hoàn thành khảo sát'}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                Tiếp tục <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <Toast message={toastMessage} />
    </div>
  )
}
