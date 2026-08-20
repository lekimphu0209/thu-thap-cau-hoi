import { Check, CloudOff, Loader2, RotateCcw, X } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { CitationInput, CitationType, LookupOption, QaEntry, QaEntryUpsertRequest, Subgroup } from '../../lib/types'
import { useAuth } from '../../store/auth'
import CitationSection from './CitationSection.tsx'
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

const AUTOSAVE_DELAY = 1500
const DRAFT_VERSION = 1

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface DraftData {
  version: number
  savedAt: number
  data: FormState
}

interface AnswerField {
  label: string
  key: 'evidence' | 'finding' | 'impression' | 'conclusion'
  hint: string
  placeholder: string
}

const ANSWER_FIELDS: AnswerField[] = [
  {
    key: 'evidence',
    label: 'Dữ kiện',
    hint: 'Các dữ kiện khách quan rút ra từ câu hỏi: triệu chứng, tiền sử, hoàn cảnh của người hỏi.',
    placeholder: 'VD: Bệnh nhân ho kéo dài >2 tuần, có thể kèm sốt nhẹ, đổ mồ hôi đêm, sụt cân.',
  },
  {
    key: 'finding',
    label: 'Phát hiện',
    hint: 'Đối chiếu dữ kiện với guideline đã trích dẫn: thông tin y khoa liên quan tìm được.',
    placeholder: 'VD: Theo guideline, ho kéo dài >2 tuần kèm sốt và sụt cân là dấu hiệu nghi lao phổi.',
  },
  {
    key: 'impression',
    label: 'Ấn tượng lâm sàng',
    hint: 'Nhận định/đánh giá tổng hợp dựa trên dữ kiện và phát hiện ở trên.',
    placeholder: 'VD: Nghi ngờ lao phổi tiềm ẩn, cần chẩn đoán xác định bằng X-quang và xét nghiệm đờm.',
  },
  {
    key: 'conclusion',
    label: 'Kết luận',
    hint: 'Khuyến nghị hành động cụ thể, an toàn dành cho người hỏi.',
    placeholder: 'VD: Khuyến nghị đi khám bác sĩ để làm thêm chẩn đoán; không tự ý dùng thuốc.',
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
type FormErrors = Partial<Record<FormErrorKey, string>>

const blankCitation = (): CitationInput => ({
  citation_type: 'REQUIRED',
  guideline_document_id: 0,
  guideline_section_id: 0,
  texts: [{ content: '' }],
})

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
    citations: [blankCitation()],
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
    citations: entry.citations.length ? entry.citations.map(toDraft) : [blankCitation()],
  }
}

function buildDraftKey(userId: number, subgroupId: number, entryId: string | undefined): string {
  return `qa-draft:${userId}:${subgroupId}:${entryId ?? 'new'}`
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function isValidCitation(value: unknown): value is CitationInput {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Partial<CitationInput>
  return (
    (c.citation_type === 'REQUIRED' || c.citation_type === 'SUPPORTING') &&
    typeof c.guideline_document_id === 'number' &&
    typeof c.guideline_section_id === 'number' &&
    Array.isArray(c.texts) &&
    c.texts.every(
      (t) =>
        typeof t === 'object' && t !== null && typeof (t as { content?: unknown }).content === 'string',
    )
  )
}

function isFormState(value: unknown): value is FormState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const v = value as Partial<FormState>
  const stringFields: (keyof FormState)[] = [
    'role',
    'diseaseOrTopic',
    'query',
    'expectedBehavior',
    'evidence',
    'finding',
    'impression',
    'conclusion',
    'safetyNotes',
    'annotatorName',
    'reviewStatus',
    'noteForExpert',
  ]
  return (
    stringFields.every((key) => typeof v[key] === 'string') &&
    Array.isArray(v.requiredAnswerPoints) &&
    v.requiredAnswerPoints.every((p) => typeof p === 'string') &&
    Array.isArray(v.citations) &&
    v.citations.every(isValidCitation)
  )
}

function loadDraftData(key: string): DraftData | null {
  if (!key) return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as DraftData).version === DRAFT_VERSION &&
      typeof (parsed as DraftData).savedAt === 'number' &&
      isFormState((parsed as DraftData).data)
    ) {
      return parsed as DraftData
    }
    localStorage.removeItem(key)
  } catch {
    localStorage.removeItem(key)
  }
  return null
}

function countWords(value: string): number {
  return (value.trim().match(/\S+/g) || []).length
}

function validateField(value: string, name: string): string | null {
  const words = countWords(value)
  if (words < MIN_WORDS) return `${name} cần ít nhất ${MIN_WORDS} từ (hiện tại ${words})`
  if (words > MAX_WORDS) return `${name} không được vượt quá ${MAX_WORDS} từ (hiện tại ${words})`
  return null
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.query.trim()) errors.query = REQUIRED_FIELD_MESSAGE
  if (!form.diseaseOrTopic.trim()) errors.diseaseOrTopic = REQUIRED_FIELD_MESSAGE
  if (!form.annotatorName.trim()) errors.annotatorName = REQUIRED_FIELD_MESSAGE

  for (const field of ANSWER_FIELDS) {
    const error = validateField(form[field.key], field.label)
    if (error) errors[field.key] = error
  }

  const validCitations = form.citations.filter(
    (c) =>
      c.guideline_document_id > 0 &&
      c.guideline_section_id > 0 &&
      c.texts.some((t) => t.content.trim().length > 0)
  )
  const hasRequired = validCitations.some((c) => c.citation_type === 'REQUIRED')
  if (!hasRequired) errors.citations = REQUIRED_CITATION_MESSAGE

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
  const color = words < MIN_WORDS || words > MAX_WORDS ? 'var(--error)' : 'var(--text-muted)'
  return (
    <div className="form-hint" style={{ color, textAlign: 'right', marginTop: 4 }}>
      {words} từ (yêu cầu {MIN_WORDS}–{MAX_WORDS} từ)
    </div>
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
  const { user } = useAuth()
  const [form, setForm] = useState<FormState>(() => blankForm(annotatorName, expectedBehaviors, reviewStatuses))
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [restoredAt, setRestoredAt] = useState<number | null>(null)
  const dirtyRef = useRef(false)

  const draftKey = user ? buildDraftKey(user.user_id, subgroup.subgroup_id, editingEntry?.entry_id) : ''

  useEffect(() => {
    let initialForm: FormState
    if (editingEntry) {
      initialForm = formFromEntry(editingEntry)
    } else {
      initialForm = blankForm(annotatorName, expectedBehaviors, reviewStatuses)
    }

    if (draftKey) {
      const draft = loadDraftData(draftKey)
      if (draft) {
        const serverTime = editingEntry ? new Date(editingEntry.updated_at).getTime() : 0
        if (!editingEntry || draft.savedAt > serverTime) {
          initialForm = draft.data
          setRestoredAt(draft.savedAt)
        }
      }
    } else {
      setRestoredAt(null)
    }

    setForm(initialForm)
    setFieldErrors({})
    dirtyRef.current = false
    setSaveState('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingEntry?.entry_id, subgroup.subgroup_id, annotatorName, user?.user_id])

  useEffect(() => {
    if (!draftKey || !dirtyRef.current) return
    setSaveState('saving')
    const timer = setTimeout(() => {
      try {
        const draft: DraftData = { version: DRAFT_VERSION, savedAt: Date.now(), data: form }
        localStorage.setItem(draftKey, JSON.stringify(draft))
        setLastSavedAt(Date.now())
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
  }, [form, draftKey])

  function clearDraft() {
    if (!draftKey) return
    try {
      localStorage.removeItem(draftKey)
    } catch {
      // ignore
    }
  }

  function resetForm() {
    const base = editingEntry
      ? formFromEntry(editingEntry)
      : blankForm(annotatorName, expectedBehaviors, reviewStatuses)
    setForm(base)
    setFieldErrors({})
    clearDraft()
    setRestoredAt(null)
    dirtyRef.current = false
    setSaveState('idle')
  }

  useImperativeHandle(ref, () => ({
    fillQuery: (query: string) => {
      dirtyRef.current = true
      setRestoredAt(null)
      setForm((prev) => ({ ...prev, query }))
    },
    reset: () => {
      resetForm()
    },
  }))

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    dirtyRef.current = true
    if (restoredAt) setRestoredAt(null)
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
    try {
      await onSubmit(payload)
      clearDraft()
      setRestoredAt(null)
      setSaveState('idle')
    } catch {
      // Parent handles and displays error via errorMessage prop
    }
  }

  const remaining = Math.max(0, subgroup.target_count - subgroup.done_count)
  const isEditing = editingEntry !== null

  return (
    <div className="card">
      <div className="entry-form-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <h3>{isEditing ? '✎ Chỉnh sửa câu hỏi' : '➕ Thêm câu hỏi mới'}</h3>
        <div className="flex items-center gap-3" style={{ marginLeft: 'auto' }}>
          {saveState === 'saving' && (
            <span className="form-hint">
              <Loader2 size={13} className="spin" style={{ display: 'inline', marginRight: 4 }} /> Đang lưu...
            </span>
          )}
          {saveState === 'saved' && lastSavedAt && (
            <span className="form-hint">
              <Check size={13} style={{ display: 'inline', marginRight: 4 }} /> Đã lưu tạm lúc {formatTime(lastSavedAt)}
            </span>
          )}
          {saveState === 'error' && (
            <span className="form-hint" style={{ color: 'var(--error)' }}>
              <CloudOff size={13} style={{ display: 'inline', marginRight: 4 }} /> Không lưu được nháp
            </span>
          )}
          {restoredAt && (
            <span className="form-hint draft-restored">
              Đã khôi phục bản nháp lúc {formatTime(restoredAt)}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={resetForm}
                style={{ marginLeft: 8 }}
              >
                <RotateCcw size={13} /> Xoá nháp
              </button>
            </span>
          )}
          {isEditing && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelEdit}>
              <X size={13} /> Huỷ chỉnh sửa
            </button>
          )}
        </div>
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
            2 · Trích dẫn guideline <RequiredMark />
          </label>
          <div className="form-hint" style={{ marginBottom: 8 }}>
            Mỗi trích dẫn gồm 1 tài liệu + 1 mục + ít nhất 1 đoạn text. Cần ít nhất 1 trích dẫn <b>Bắt buộc</b>.
          </div>
          <CitationSection
            citations={form.citations}
            onChange={(citations) => update('citations', citations)}
            error={fieldErrors.citations}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            3 · Câu trả lời chuẩn <RequiredMark />
          </label>
          <div className="form-hint" style={{ marginBottom: 8 }}>
            Điền đủ 4 phần theo cấu trúc, mỗi phần {MIN_WORDS}–{MAX_WORDS} từ.
          </div>
          {ANSWER_FIELDS.map((field) => (
            <div key={field.key} className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">{field.label}</label>
              <div className="form-hint" style={{ marginBottom: 4 }}>{field.hint}</div>
              <textarea
                className={`form-textarea${fieldErrors[field.key] ? ' has-error' : ''}`}
                rows={4}
                value={form[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder}
              />
              <WordCounter value={form[field.key]} />
              <FieldError message={fieldErrors[field.key]} />
            </div>
          ))}
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
