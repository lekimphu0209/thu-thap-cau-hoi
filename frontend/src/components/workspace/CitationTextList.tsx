import { Plus } from 'lucide-react'
import type { CitationTextInput } from '../../lib/types'

interface CitationTextListProps {
  texts: CitationTextInput[]
  onChange: (texts: CitationTextInput[]) => void
}

export default function CitationTextList({ texts, onChange }: CitationTextListProps) {
  const updateText = (index: number, content: string) => {
    const next = texts.map((t, i) => (i === index ? { content } : t))
    onChange(next)
  }

  const addText = () => {
    onChange([...texts, { content: '' }])
  }

  const removeText = (index: number) => {
    const next = texts.filter((_, i) => i !== index)
    onChange(next.length ? next : [{ content: '' }])
  }

  return (
    <div className="citation-text-list">
      {texts.map((text, index) => (
        <div key={index} className="citation-text-row">
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Một ý cụ thể, VD: THA khi HA tâm thu ≥140 mmHg"
            value={text.content}
            onChange={(e) => updateText(index, e.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-xs citation-text-remove"
            onClick={() => removeText(index)}
            title="Xóa ý này"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="add-dashed-btn" onClick={addText}>
        <Plus size={12} /> Thêm ý
      </button>
    </div>
  )
}
