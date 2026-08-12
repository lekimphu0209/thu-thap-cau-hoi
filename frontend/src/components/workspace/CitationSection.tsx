import type { CitationInput } from '../../lib/types'
import CitationBlock from './CitationBlock.tsx'

interface CitationSectionProps {
  citations: CitationInput[]
  onChange: (citations: CitationInput[]) => void
  error?: string
}

const blankCitation = (): CitationInput => ({
  citation_type: 'REQUIRED',
  guideline_document_id: 0,
  guideline_section_id: 0,
  texts: [{ content: '' }],
})

export default function CitationSection({ citations, onChange, error }: CitationSectionProps) {
  const updateCitation = (index: number, citation: CitationInput) => {
    const next = [...citations]
    next[index] = citation
    onChange(next)
  }

  const addBlock = () => {
    onChange([...citations, blankCitation()])
  }

  const removeBlock = (index: number) => {
    const next = citations.filter((_, i) => i !== index)
    onChange(next)
  }

  return (
    <div>
      {citations.length === 0 && (
        <div className="form-hint" style={{ marginBottom: 12 }}>
          Chưa có trích dẫn. Nhấn “+ Thêm trích dẫn” để bắt đầu.
        </div>
      )}
      {citations.map((citation, index) => (
        <CitationBlock
          key={index}
          citation={citation}
          onChange={(c) => updateCitation(index, c)}
          onRemove={citations.length > 1 ? () => removeBlock(index) : undefined}
        />
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={addBlock}>
        + Thêm trích dẫn
      </button>
      {error && <div className="field-error-text" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  )
}
