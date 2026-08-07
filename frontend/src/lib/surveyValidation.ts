import type { SurveyAnswers, SurveyDefinition, SurveyQuestion, SurveySection } from './types'

const SINGLE_CHOICE_CONTROLS = ['radio', 'select', 'search_select']

export type SurveyErrors = Record<string, string>

function otherText(question: SurveyQuestion, answers: SurveyAnswers, suffix: string): string {
  const raw = answers[`${question.code}${suffix}`]
  return typeof raw === 'string' ? raw.trim() : ''
}

function validateQuestion(
  question: SurveyQuestion,
  answers: SurveyAnswers,
  definition: SurveyDefinition,
): string | null {
  const value = answers[question.code]
  const { other_value: otherValue, other_suffix: otherSuffix } = definition

  if (question.control === 'consent') {
    return question.required && value !== true ? 'Bạn cần xác nhận mục này để tiếp tục.' : null
  }

  if (question.control === 'signature') {
    return typeof value === 'string' && value.trim() ? null : 'Vui lòng nhập họ tên đầy đủ.'
  }

  if (question.control === 'scale') {
    if (typeof value !== 'number') return question.required ? 'Vui lòng chọn một mức.' : null
    return null
  }

  if (question.control === 'checkbox') {
    const list = Array.isArray(value) ? value : []
    if (list.length === 0) return question.required ? 'Vui lòng chọn ít nhất một mục.' : null
    if (list.includes(otherValue) && !otherText(question, answers, otherSuffix)) {
      return 'Vui lòng nhập nội dung cho mục Khác.'
    }
    return null
  }

  if (SINGLE_CHOICE_CONTROLS.includes(question.control)) {
    if (typeof value !== 'string' || !value) {
      return question.required ? 'Vui lòng chọn một phương án.' : null
    }
    if (value === otherValue && !otherText(question, answers, otherSuffix)) {
      return 'Vui lòng nhập nội dung cho mục Khác.'
    }
    return null
  }

  return null
}

export function validateSection(
  section: SurveySection,
  answers: SurveyAnswers,
  definition: SurveyDefinition,
): SurveyErrors {
  const errors: SurveyErrors = {}
  for (const question of section.questions) {
    const error = validateQuestion(question, answers, definition)
    if (error) errors[question.code] = error
  }
  return errors
}

export function countAnswered(section: SurveySection, answers: SurveyAnswers): number {
  return section.questions.filter((question) => {
    const value = answers[question.code]
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'boolean') return value
    return value !== undefined && value !== null && value !== ''
  }).length
}
