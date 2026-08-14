import { Plus } from 'lucide-react'
import type { CitationInput } from '../../lib/types'
import CitationBlock, { type CitationErrors } from './CitationBlock.tsx'

interface CitationSectionProps {
  citations: CitationInput[]
  onChange: (citations: CitationInput[]) => void
  errors?: CitationErrors[]
  error?: string
}

const blankCitation = (): CitationInput => ({
  citation_type: 'REQUIRED',
  guideline_document_id: 0,
  guideline_section_id: 0,
  texts: [{ content: '' }],
})

export default function CitationSection({ citations, onChange, errors, error }: CitationSectionProps) {
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
        <div className="citation-empty-state">
          <div className="form-hint">Chọn tài liệu, mục và nhập ít nhất một đoạn trích dẫn</div>
          <button type="button" className="add-dashed-btn" onClick={addBlock}>
            <Plus size={12} /> Thêm trích dẫn bắt buộc
          </button>
        </div>
      )}
      {citations.map((citation, index) => (
        <CitationBlock
          key={index}
          index={index + 1}
          citation={citation}
          onChange={(c) => updateCitation(index, c)}
          onRemove={() => removeBlock(index)}
          errors={errors?.[index]}
        />
      ))}
      {citations.length > 0 && (
        <button type="button" className="add-dashed-btn" onClick={addBlock} style={{ marginTop: 8 }}>
          <Plus size={12} /> Thêm trích dẫn bắt buộc
        </button>
      )}
      {error && <div className="field-error-text" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  )
}
