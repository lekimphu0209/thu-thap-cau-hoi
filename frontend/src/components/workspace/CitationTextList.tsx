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
    if (texts.length <= 1) return
    const next = texts.filter((_, i) => i !== index)
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {texts.map((text, index) => (
        <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Nhập đoạn trích dẫn từ tài liệu..."
            value={text.content}
            onChange={(e) => updateText(index, e.target.value)}
            style={{ flex: 1, minHeight: 48 }}
          />
          {texts.length > 1 && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{ marginTop: 4 }}
              onClick={() => removeText(index)}
              title="Xóa ý này"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={addText}>
        + Thêm ý
      </button>
    </div>
  )
}
