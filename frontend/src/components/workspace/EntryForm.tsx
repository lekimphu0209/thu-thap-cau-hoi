import { Check, X } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { CitationInput, CitationType, LookupOption, QaEntry, QaEntryUpsertRequest, Subgroup } from '../../lib/types'
import CitationSection from './CitationSection.tsx'
import { type CitationErrors } from './CitationBlock.tsx'
import KeyPointsBuilder from './KeyPointsBuilder'

const ROLE_OPTIONS = [
  { value: 'patient', label: 'Bệnh nhân' },
  { value: 'doctor', label: 'Bác sĩ' },
  { value: 'caregiver', label: 'Người chăm sóc' },
]

const MIN_WORDS = 20
const MAX_WORDS = 200
const REQUIRED_FIELD_MESSAGE = 'Thông tin này cần được điền'
const REQUIRED_CITATION_MESSAGE = 'Cần ít nhất 1 trích dẫn bắt buộc (REQUIRED)'

interface AnswerField {
  key: 'evidence' | 'finding' | 'impression' | 'conclusion'
  orderLabel: string
  label: string
  description: string
  bullets: string[]
}

const ANSWER_FIELDS: AnswerField[] = [
  {
    key: 'evidence',
    orderLabel: '3.1',
    label: 'Tình huống và dữ kiện',
    description:
      'Những gì câu hỏi đã cho biết và những gì còn thiếu. Ghi đúng như người hỏi mô tả, chưa nhận định.',
    bullets: [
      'Người hỏi là người bệnh, người nhà hay nhân viên y tế.',
      'Triệu chứng người hỏi kể: khởi phát, tính chất, mức độ và diễn biến theo thời gian.',
      'Tiền sử, bệnh kèm theo, thuốc đang dùng, yếu tố nguy cơ hoặc yếu tố dịch tễ.',
      'Chỉ số, kết quả xét nghiệm hoặc chẩn đoán hình ảnh người hỏi đã cung cấp, nếu có.',
      'Dữ kiện còn thiếu, cần hỏi thêm trước khi kết luận.',
    ],
  },
  {
    key: 'finding',
    orderLabel: '3.2',
    label: 'Căn cứ theo hướng dẫn',
    description:
      'Nội dung hướng dẫn chuyên môn dùng làm căn cứ, lấy từ tài liệu đã nêu ở phần Trích dẫn.',
    bullets: [
      'Tiêu chuẩn chẩn đoán, phân độ, chỉ định, chống chỉ định hoặc khuyến cáo, tuỳ nội dung câu hỏi.',
      'Cận lâm sàng hướng dẫn yêu cầu để chẩn đoán xác định hoặc để theo dõi.',
      'Dấu hiệu nặng, tiêu chí nhập viện, chuyển tuyến hoặc cấp cứu nếu hướng dẫn có nêu.',
      'Nếu hướng dẫn không đề cập, ghi rõ là chưa có căn cứ thay vì suy đoán.',
    ],
  },
  {
    key: 'impression',
    orderLabel: '3.3',
    label: 'Nhận định chuyên môn',
    description:
      'Đối chiếu dữ kiện với căn cứ hướng dẫn để đưa ra nhận định cho đúng tình huống này.',
    bullets: [
      'Tóm tắt hội chứng, triệu chứng dương tính và triệu chứng âm tính có giá trị.',
      'Biện luận chẩn đoán hướng tới và chẩn đoán phân biệt, kèm bằng chứng ủng hộ hoặc loại trừ.',
      'Với câu hỏi về điều trị, phòng bệnh hoặc chăm sóc: nêu lựa chọn phù hợp và lý do chọn.',
      'Khi dữ kiện chưa đủ thì dừng ở mức triệu chứng hoặc hội chứng, không kết luận thành bệnh.',
    ],
  },
  {
    key: 'conclusion',
    orderLabel: '3.4',
    label: 'Kết luận và hướng xử trí',
    description: 'Chốt lại câu trả lời và việc người hỏi cần làm tiếp theo.',
    bullets: [
      'Trả lời trực tiếp vào câu hỏi đã đặt; người bệnh và người nhà cần diễn đạt dễ hiểu, nhân viên y tế có thể dùng thuật ngữ chuyên môn.',
      'Hướng xử trí tiếp theo: khám ở tuyến nào, cần làm xét nghiệm gì, theo dõi và tái khám ra sao.',
      'Dấu hiệu cần đi khám ngay hoặc chuyển cấp cứu.',
      'Giới hạn tư vấn: không kê đơn hoặc chỉ định liều cụ thể, không khẳng định chẩn đoán khi chưa đủ dữ kiện.',
    ],
  },
]

interface FormState {
  role: string
  diseaseOrTopic: string
  query: string
  expectedBehavior: string
  evidence: string
  finding: string
  impression: string
  conclusion: string
  requiredAnswerPoints: string[]
  safetyNotes: string
  annotatorName: string
  reviewStatus: string
  noteForExpert: string
  citations: CitationInput[]
}

type FormErrorKey = 'query' | 'diseaseOrTopic' | 'annotatorName' | 'citations' | AnswerField['key']
type FormErrors = Partial<Record<FormErrorKey, string>> & { citationErrors?: CitationErrors[] }

function blankForm(annotatorName: string, expectedBehaviors: LookupOption[], reviewStatuses: LookupOption[]): FormState {
  return {
    role: 'patient',
    diseaseOrTopic: '',
    query: '',
    expectedBehavior: expectedBehaviors[0]?.value ?? '',
    evidence: '',
    finding: '',
    impression: '',
    conclusion: '',
    requiredAnswerPoints: [''],
    safetyNotes: '',
    annotatorName,
    reviewStatus: reviewStatuses.find((status) => status.value === 'draft')?.value ?? reviewStatuses[0]?.value ?? '',
    noteForExpert: '',
    citations: [],
  }
}

function formFromEntry(entry: QaEntry): FormState {
  const toDraft = (citation: QaEntry['citations'][number]): CitationInput => ({
    citation_type: citation.citation_type as CitationType,
    guideline_document_id: citation.guideline_document_id,
    guideline_section_id: citation.guideline_section_id,
    texts: citation.texts.length ? citation.texts.map((t) => ({ content: t.content })) : [{ content: '' }],
  })
  return {
    role: entry.role,
    diseaseOrTopic: entry.disease_or_topic,
    query: entry.query,
    expectedBehavior: entry.expected_behavior,
    evidence: entry.evidence,
    finding: entry.finding,
    impression: entry.impression,
    conclusion: entry.conclusion,
    requiredAnswerPoints: entry.required_answer_points.length
      ? entry.required_answer_points.map((point) => point.content)
      : [''],
    safetyNotes: entry.safety_notes ?? '',
    annotatorName: entry.annotator_name,
    reviewStatus: entry.review_status,
    noteForExpert: entry.note_for_expert ?? '',
    citations: entry.citations.length ? entry.citations.map(toDraft) : [],
  }
}

function countWords(value: string): number {
  return (value.trim().match(/\S+/g) || []).length
}

function validateField(value: string): string | null {
  const words = countWords(value)
  if (words < MIN_WORDS) return `Cần tối thiểu ${MIN_WORDS} từ (hiện có ${words} từ)`
  if (words > MAX_WORDS) return `Không quá ${MAX_WORDS} từ (hiện có ${words} từ)`
  return null
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.query.trim()) errors.query = REQUIRED_FIELD_MESSAGE
  if (!form.diseaseOrTopic.trim()) errors.diseaseOrTopic = REQUIRED_FIELD_MESSAGE
  if (!form.annotatorName.trim()) errors.annotatorName = REQUIRED_FIELD_MESSAGE

  for (const field of ANSWER_FIELDS) {
    const error = validateField(form[field.key])
    if (error) errors[field.key] = error
  }

  const citationErrors: CitationErrors[] = form.citations.map((c) => {
    const cErrors: CitationErrors = {}
    if (!c.guideline_document_id) cErrors.document = 'Vui lòng chọn tài liệu.'
    if (!c.guideline_section_id) cErrors.section = 'Vui lòng chọn section.'
    if (!c.texts.some((t) => t.content.trim().length > 0)) {
      cErrors.texts = 'Cần ít nhất 1 ý trích dẫn.'
    }
    return cErrors
  })

  const validCitations = form.citations.filter(
    (c, i) =>
      c.guideline_document_id > 0 &&
      c.guideline_section_id > 0 &&
      c.texts.some((t) => t.content.trim().length > 0) &&
      Object.keys(citationErrors[i]).length === 0
  )
  const hasRequired = validCitations.some((c) => c.citation_type === 'REQUIRED')
  if (!hasRequired) {
    errors.citations = REQUIRED_CITATION_MESSAGE
    if (form.citations.length > 0) {
      errors.citationErrors = citationErrors
    }
  }

  return errors
}

export interface EntryFormHandle {
  fillQuery: (query: string) => void
  reset: () => void
}

interface EntryFormProps {
  subgroup: Subgroup
  annotatorName: string
  expectedBehaviors: LookupOption[]
  reviewStatuses: LookupOption[]
  editingEntry: QaEntry | null
  onCancelEdit: () => void
  onSubmit: (payload: QaEntryUpsertRequest) => Promise<void>
  submitting: boolean
  errorMessage: string | null
}

function RequiredMark() {
  return <span className="required-mark">*</span>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <div className="field-error-text">{message}</div>
}

function WordCounter({ value }: { value: string }) {
  const words = countWords(value)
  const withinRange = words >= MIN_WORDS && words <= MAX_WORDS
  return (
    <span className={`answer-word-count${withinRange ? ' ok' : ''}`}>
      {words} từ · yêu cầu {MIN_WORDS}–{MAX_WORDS} từ
    </span>
  )
}

function EntryFormImpl(
  {
    subgroup,
    annotatorName,
    expectedBehaviors,
    reviewStatuses,
    editingEntry,
    onCancelEdit,
    onSubmit,
    submitting,
    errorMessage,
  }: EntryFormProps,
  ref: React.Ref<EntryFormHandle>,
) {
  const [form, setForm] = useState<FormState>(() => blankForm(annotatorName, expectedBehaviors, reviewStatuses))
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (editingEntry) {
      setForm(formFromEntry(editingEntry))
    } else {
      setForm(blankForm(annotatorName, expectedBehaviors, reviewStatuses))
    }
    setFieldErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingEntry, subgroup.subgroup_id])

  useImperativeHandle(ref, () => ({
    fillQuery: (query: string) => setForm((prev) => ({ ...prev, query })),
    reset: () => {
      setForm(blankForm(annotatorName, expectedBehaviors, reviewStatuses))
      setFieldErrors({})
    },
  }))

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const errors = validateForm(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    const payload: QaEntryUpsertRequest = {
      subgroup_id: subgroup.subgroup_id,
      role: form.role,
      disease_or_topic: form.diseaseOrTopic,
      query: form.query,
      expected_behavior: form.expectedBehavior,
      evidence: form.evidence.trim(),
      finding: form.finding.trim(),
      impression: form.impression.trim(),
      conclusion: form.conclusion.trim(),
      required_answer_points: form.requiredAnswerPoints
        .filter((point) => point.trim().length > 0)
        .map((point) => ({ content: point.trim() })),
      safety_notes: form.safetyNotes.trim() || null,
      annotator_name: form.annotatorName,
      review_status: form.reviewStatus,
      note_for_expert: form.noteForExpert.trim() || null,
      citations: form.citations.filter(
        (c) =>
          c.guideline_document_id > 0 &&
          c.guideline_section_id > 0 &&
          c.texts.some((t) => t.content.trim().length > 0)
      ),
    }
    await onSubmit(payload)
  }

  const remaining = Math.max(0, subgroup.target_count - subgroup.done_count)
  const isEditing = editingEntry !== null

  return (
    <div className="card">
      <div className="entry-form-header">
        <h3>{isEditing ? '✎ Chỉnh sửa câu hỏi' : '➕ Thêm câu hỏi mới'}</h3>
        {isEditing && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelEdit}>
            <X size={13} /> Huỷ chỉnh sửa
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="alert alert-error">
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-col gap-4" noValidate>
        <div className="form-group">
          <label className="form-label">
            1 · Câu hỏi <RequiredMark />
          </label>
          <textarea
            className={`form-textarea${fieldErrors.query ? ' has-error' : ''}`}
            rows={2}
            value={form.query}
            onChange={(event) => update('query', event.target.value)}
            placeholder="VD: Tôi ho kéo dài hơn 2 tuần thì có cần nghĩ đến bệnh lao không?"
          />
          <FieldError message={fieldErrors.query} />
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">
              Người hỏi <RequiredMark />
            </label>
            <select className="form-select" value={form.role} onChange={(event) => update('role', event.target.value)}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              Bệnh / chủ đề <RequiredMark />
            </label>
            <input
              type="text"
              className={`form-input${fieldErrors.diseaseOrTopic ? ' has-error' : ''}`}
              value={form.diseaseOrTopic}
              onChange={(event) => update('diseaseOrTopic', event.target.value)}
              placeholder="VD: Bệnh lao"
            />
            <FieldError message={fieldErrors.diseaseOrTopic} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Hành vi kỳ vọng của chatbot <RequiredMark />
          </label>
          <select
            className="form-select"
            value={form.expectedBehavior}
            onChange={(event) => update('expectedBehavior', event.target.value)}
          >
            {expectedBehaviors.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            2 · Trích dẫn bắt buộc <RequiredMark />
          </label>
          <CitationSection
            citations={form.citations}
            onChange={(citations) => update('citations', citations)}
            errors={fieldErrors.citationErrors}
            error={fieldErrors.citations}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            3 · Câu trả lời chuẩn <RequiredMark />
          </label>
          <div className="form-hint">
            Viết đủ 4 phần dưới đây, mỗi phần {MIN_WORDS}–{MAX_WORDS} từ. Ngắn gọn, đủ ý, bám tài
            liệu đã trích dẫn; dùng từ ngữ rõ ràng, hạn chế viết tắt.
          </div>
          <div className="answer-sections">
            {ANSWER_FIELDS.map((field) => (
              <div key={field.key} className="answer-section">
                <div className="answer-section-title">
                  <span className="answer-section-order">{field.orderLabel}</span>
                  {field.label}
                </div>
                <div className="answer-section-desc">{field.description}</div>
                <ul className="answer-section-bullets">
                  {field.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <textarea
                  className={`form-textarea${fieldErrors[field.key] ? ' has-error' : ''}`}
                  rows={4}
                  value={form[field.key]}
                  onChange={(event) => update(field.key, event.target.value)}
                />
                <div className="answer-section-foot">
                  {fieldErrors[field.key] ? (
                    <span className="field-error-text">{fieldErrors[field.key]}</span>
                  ) : (
                    <span />
                  )}
                  <WordCounter value={form[field.key]} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Các ý bắt buộc phải có trong câu trả lời</label>
          <KeyPointsBuilder
            points={form.requiredAnswerPoints}
            onChange={(points) => update('requiredAnswerPoints', points)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Lưu ý an toàn</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={form.safetyNotes}
            onChange={(event) => update('safetyNotes', event.target.value)}
            placeholder="VD: Không chẩn đoán chắc; khuyên đi khám nếu có dấu hiệu nặng."
          />
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">
              Người điền <RequiredMark />
            </label>
            <input
              type="text"
              className={`form-input${fieldErrors.annotatorName ? ' has-error' : ''}`}
              value={form.annotatorName}
              onChange={(event) => update('annotatorName', event.target.value)}
            />
            <FieldError message={fieldErrors.annotatorName} />
          </div>
          <div className="form-group">
            <label className="form-label">Trạng thái duyệt</label>
            <select
              className="form-select"
              value={form.reviewStatus}
              onChange={(event) => update('reviewStatus', event.target.value)}
            >
              {reviewStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Ghi chú cho chuyên gia (tuỳ chọn)</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={form.noteForExpert}
            onChange={(event) => update('noteForExpert', event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3" style={{ borderTop: '1px dashed var(--border)', paddingTop: 16 }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <Check size={14} /> {isEditing ? 'Cập nhật câu hỏi' : 'Lưu câu hỏi'}
          </button>
          <div className="flex-1" />
          {!isEditing && (
            <span className="form-hint">
              Còn thiếu <b>{remaining}</b> câu cho loại này
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

const EntryForm = forwardRef(EntryFormImpl)
export default EntryForm
