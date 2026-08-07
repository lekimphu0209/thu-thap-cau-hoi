import { Check } from 'lucide-react'
import type { SurveyAnswerValue, SurveyQuestion } from '../../lib/types'
import SearchableSelect from './SearchableSelect'

const OTHER_LABEL = 'Khác (vui lòng ghi rõ)'

interface QuestionFieldProps {
  question: SurveyQuestion
  otherValue: string
  value: SurveyAnswerValue
  error?: string
  otherToken: string
  onChange: (value: SurveyAnswerValue) => void
  onOtherChange: (value: string) => void
}

export default function QuestionField({
  question,
  value,
  otherValue,
  error,
  otherToken,
  onChange,
  onOtherChange,
}: QuestionFieldProps) {
  const choices = question.allow_other
    ? [...question.options, otherToken]
    : question.options
  const labelOf = (option: string) => (option === otherToken ? OTHER_LABEL : option)
  const selectedList = Array.isArray(value) ? value : []
  const showOtherInput =
    question.allow_other && (value === otherToken || selectedList.includes(otherToken))

  function toggleMulti(option: string) {
    const next = selectedList.includes(option)
      ? selectedList.filter((item) => item !== option)
      : [...selectedList, option]
    onChange(next)
  }

  return (
    <div className={`survey-question${error ? ' has-error' : ''}`}>
      <div className="survey-question-label">
        {question.label}
        {question.required && <span className="required-mark">*</span>}
      </div>
      {question.help_text && <div className="survey-question-help">{question.help_text}</div>}

      {question.control === 'consent' && (
        <button
          type="button"
          className={`consent-check${value === true ? ' checked' : ''}`}
          onClick={() => onChange(value === true ? false : true)}
        >
          <span className="consent-box">{value === true && <Check size={13} />}</span>
          <span>Tôi xác nhận</span>
        </button>
      )}

      {question.control === 'signature' && (
        <input
          type="text"
          className={`form-input${error ? ' has-error' : ''}`}
          value={typeof value === 'string' ? value : ''}
          placeholder="VD: BS. Nguyễn Văn A"
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {question.control === 'radio' && (
        <div className="choice-grid">
          {choices.map((option) => (
            <button
              key={option}
              type="button"
              className={`choice-item${value === option ? ' selected' : ''}`}
              onClick={() => onChange(option)}
            >
              <span className="choice-marker radio" />
              <span>{labelOf(option)}</span>
            </button>
          ))}
        </div>
      )}

      {question.control === 'checkbox' && (
        <div className="choice-grid">
          {choices.map((option) => (
            <button
              key={option}
              type="button"
              className={`choice-item${selectedList.includes(option) ? ' selected' : ''}`}
              onClick={() => toggleMulti(option)}
            >
              <span className="choice-marker check">
                {selectedList.includes(option) && <Check size={12} />}
              </span>
              <span>{labelOf(option)}</span>
            </button>
          ))}
        </div>
      )}

      {question.control === 'select' && (
        <select
          className="form-select"
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">— Chọn một phương án —</option>
          {choices.map((option) => (
            <option key={option} value={option}>
              {labelOf(option)}
            </option>
          ))}
        </select>
      )}

      {question.control === 'search_select' && (
        <SearchableSelect
          options={choices.map((option) => ({ value: option, label: labelOf(option) }))}
          value={typeof value === 'string' ? value : ''}
          placeholder="— Chọn hoặc tìm kiếm —"
          invalid={Boolean(error)}
          onChange={onChange}
        />
      )}

      {question.control === 'scale' && (
        <div className="scale-row">
          {question.scale_labels.map((scaleLabel, index) => {
            const point = index + 1
            return (
              <button
                key={scaleLabel}
                type="button"
                className={`scale-item${value === point ? ' selected' : ''}`}
                onClick={() => onChange(point)}
              >
                <span className="scale-point">{point}</span>
                <span className="scale-label">{scaleLabel}</span>
              </button>
            )
          })}
        </div>
      )}

      {showOtherInput && (
        <input
          type="text"
          className="form-input mt-2"
          value={otherValue}
          placeholder="Vui lòng ghi rõ"
          onChange={(event) => onOtherChange(event.target.value)}
        />
      )}

      {error && <div className="field-error-text">{error}</div>}
    </div>
  )
}
