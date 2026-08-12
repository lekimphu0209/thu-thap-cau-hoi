import { useId } from 'react'
import type { CitationInput, GuidelineDocument, GuidelineSection } from '../../lib/types'
import CitationTextList from './CitationTextList.tsx'
import DocumentSearchSelect from './DocumentSearchSelect.tsx'
import SectionSelect from './SectionSelect.tsx'

interface CitationBlockProps {
  citation: CitationInput
  onChange: (citation: CitationInput) => void
  onRemove?: () => void
}

export default function CitationBlock({ citation, onChange, onRemove }: CitationBlockProps) {
  const groupId = useId()
  const handleDocSelect = (doc: GuidelineDocument) => {
    onChange({
      ...citation,
      guideline_document_id: doc.doc_id,
      guideline_section_id: 0,
      texts: citation.texts.length ? citation.texts : [{ content: '' }],
    })
  }

  const handleDocClear = () => {
    onChange({
      ...citation,
      guideline_document_id: 0,
      guideline_section_id: 0,
    })
  }

  const handleSectionSelect = (section: GuidelineSection) => {
    onChange({
      ...citation,
      guideline_section_id: section.section_id,
    })
  }

  const handleSectionClear = () => {
    onChange({
      ...citation,
      guideline_section_id: 0,
    })
  }

  const handleTextChange = (texts: { content: string }[]) => {
    onChange({
      ...citation,
      texts,
    })
  }

  const setType = (type: 'REQUIRED' | 'SUPPORTING') => {
    onChange({ ...citation, citation_type: type })
  }

  return (
    <div className="card" style={{ padding: 12, marginBottom: 12, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <span className="field-label-block" style={{ margin: 0 }}>Loại trích dẫn</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="radio"
            name={`citation-type-${groupId}`}
            value="REQUIRED"
            checked={citation.citation_type === 'REQUIRED'}
            onChange={() => setType('REQUIRED')}
          />
          Bắt buộc
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="radio"
            name={`citation-type-${groupId}`}
            value="SUPPORTING"
            checked={citation.citation_type === 'SUPPORTING'}
            onChange={() => setType('SUPPORTING')}
          />
          Bổ trợ
        </label>
        {onRemove && (
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            style={{ marginLeft: 'auto' }}
            onClick={onRemove}
          >
            Xóa block
          </button>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Tài liệu</label>
        <DocumentSearchSelect
          selectedDocId={citation.guideline_document_id || null}
          onSelect={handleDocSelect}
          onClear={handleDocClear}
        />
      </div>

      {!!citation.guideline_document_id && (
        <div className="form-group">
          <label className="form-label">Mục / Section</label>
          <SectionSelect
            docId={citation.guideline_document_id}
            selectedSectionId={citation.guideline_section_id || null}
            onSelect={handleSectionSelect}
            onClear={handleSectionClear}
          />
        </div>
      )}

      {!!citation.guideline_section_id && (
        <div className="form-group">
          <label className="form-label">Đoạn trích dẫn</label>
          <CitationTextList texts={citation.texts} onChange={handleTextChange} />
        </div>
      )}
    </div>
  )
}
