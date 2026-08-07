import { useCallback, useEffect, useRef, useState } from 'react'
import { surveyApi } from '../api/surveyApi'
import type { SurveyAnswerValue, SurveyAnswers, SurveyDefinition, SurveyState } from '../lib/types'

const AUTOSAVE_DELAY = 1200

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface UseSurveyResult {
  definition: SurveyDefinition | null
  survey: SurveyState | null
  answers: SurveyAnswers
  loading: boolean
  saveState: SaveState
  setAnswer: (code: string, value: SurveyAnswerValue) => void
  submit: () => Promise<SurveyState>
}

export function useSurvey(defaults: SurveyAnswers = {}): UseSurveyResult {
  const [definition, setDefinition] = useState<SurveyDefinition | null>(null)
  const [survey, setSurvey] = useState<SurveyState | null>(null)
  const [answers, setAnswers] = useState<SurveyAnswers>({})
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(false)

  useEffect(() => {
    let active = true
    Promise.all([surveyApi.getDefinition(), surveyApi.getMine()])
      .then(([definitionResponse, surveyResponse]) => {
        if (!active) return
        setDefinition(definitionResponse.data)
        setSurvey(surveyResponse.data)
        const stored = surveyResponse.data.answers
        setAnswers(Object.keys(stored).length > 0 ? stored : defaults)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!dirtyRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setSaveState('saving')
      surveyApi
        .saveDraft(answers)
        .then((response) => {
          setSurvey(response.data)
          setSaveState('saved')
        })
        .catch(() => setSaveState('error'))
    }, AUTOSAVE_DELAY)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [answers])

  const setAnswer = useCallback((code: string, value: SurveyAnswerValue) => {
    dirtyRef.current = true
    setAnswers((prev) => ({ ...prev, [code]: value }))
  }, [])

  const submit = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaveState('saving')
    try {
      const response = await surveyApi.submit(answers)
      setSurvey(response.data)
      setSaveState('saved')
      return response.data
    } catch (error) {
      setSaveState('error')
      throw error
    }
  }, [answers])

  return { definition, survey, answers, loading, saveState, setAnswer, submit }
}
