import type { CitationInput, GuidelineDocument, GuidelineSection } from '../../lib/types'
import CitationTextList from './CitationTextList.tsx'
import DocumentSearchSelect from './DocumentSearchSelect.tsx'
import SectionSelect from './SectionSelect.tsx'

export interface CitationErrors {
  document?: string
  section?: string
  texts?: string
}

interface CitationBlockProps {
  index: number
  citation: CitationInput
  onChange: (citation: CitationInput) => void
  onRemove?: () => void
  errors?: CitationErrors
}

export default function CitationBlock({ index, citation, onChange, onRemove, errors }: CitationBlockProps) {
  const isRequired = citation.citation_type === 'REQUIRED'

  const handleDocSelect = (doc: GuidelineDocument) => {
    onChange({
      ...citation,
      guideline_document_id: doc.doc_id,
      guideline_section_id: 0,
      texts: [{ content: '' }],
    })
  }

  const handleDocClear = () => {
    onChange({
      ...citation,
      guideline_document_id: 0,
      guideline_section_id: 0,
      texts: [{ content: '' }],
    })
  }

  const handleSectionSelect = (section: GuidelineSection) => {
    onChange({
      ...citation,
      guideline_section_id: section.section_id,
      texts: citation.texts.length ? citation.texts : [{ content: '' }],
    })
  }

  const handleSectionClear = () => {
    onChange({
      ...citation,
      guideline_section_id: 0,
      texts: [{ content: '' }],
    })
  }

  const handleTextChange = (texts: { content: string }[]) => {
    onChange({
      ...citation,
      texts,
    })
  }

  return (
    <div className="card citation-card">
      <div className="citation-card-header">
        <div className="citation-card-badges">
          <span className="citation-index-badge">{index}</span>
          <span className={`citation-kind-badge${isRequired ? ' required' : ' supporting'}`}>
            {isRequired ? 'BẮT BUỘC' : 'BỔ TRỢ'}
          </span>
        </div>
        {onRemove && (
          <button type="button" className="btn btn-ghost btn-xs citation-card-remove" onClick={onRemove}>
            Xóa
          </button>
        )}
      </div>

      <div className="citation-doc-row">
        <div className="citation-doc-field">
          <label className="form-label">
            Tài liệu / Guideline <span className="required-mark">*</span>
          </label>
          <DocumentSearchSelect
            selectedDocId={citation.guideline_document_id || null}
            onSelect={handleDocSelect}
            onClear={handleDocClear}
            invalid={!!errors?.document}
          />
          {errors?.document && <div className="field-error-text">{errors.document}</div>}
        </div>

        <div className="citation-doc-field">
          <label className="form-label">
            Vị trí / Section <span className="required-mark">*</span>
          </label>
          <SectionSelect
            docId={citation.guideline_document_id || null}
            selectedSectionId={citation.guideline_section_id || null}
            onSelect={handleSectionSelect}
            onClear={handleSectionClear}
            invalid={!!errors?.section}
          />
          {errors?.section && <div className="field-error-text">{errors.section}</div>}
        </div>
      </div>

      {!!citation.guideline_section_id && (
        <div className="citation-text-section">
          <label className="form-label">Các ý lấy từ trích dẫn này</label>
          <p className="form-hint" style={{ marginBottom: 10 }}>
            Nhập các đoạn cụ thể lấy từ tài liệu đã chọn.
          </p>
          <CitationTextList texts={citation.texts} onChange={handleTextChange} />
          {errors?.texts && <div className="field-error-text" style={{ marginTop: 6 }}>{errors.texts}</div>}
        </div>
      )}
    </div>
  )
}
