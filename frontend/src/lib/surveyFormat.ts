import type { SurveyAnswers, SurveyDefinition, SurveyQuestion } from './types'

const OTHER_LABEL = 'Khác'
const EMPTY = '—'

export function formatAnswer(
  question: SurveyQuestion,
  answers: SurveyAnswers,
  definition: SurveyDefinition,
): string {
  const value = answers[question.code]
  const otherRaw = answers[`${question.code}${definition.other_suffix}`]
  const otherText = typeof otherRaw === 'string' ? otherRaw.trim() : ''
  const otherLabel = otherText ? `${OTHER_LABEL}: ${otherText}` : OTHER_LABEL
  const resolve = (item: string) => (item === definition.other_value ? otherLabel : item)

  if (value === undefined || value === null || value === '') return EMPTY
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (Array.isArray(value)) return value.length ? value.map(resolve).join(' · ') : EMPTY
  if (typeof value === 'number') {
    const label = question.scale_labels[value - 1]
    return label ? `${value}/${question.scale_labels.length} — ${label}` : String(value)
  }
  return resolve(value)
}

export const SURVEY_STATUS_LABEL: Record<string, string> = {
  completed: 'Đã hoàn thành',
  in_progress: 'Đang điền',
  not_started: 'Chưa bắt đầu',
}
