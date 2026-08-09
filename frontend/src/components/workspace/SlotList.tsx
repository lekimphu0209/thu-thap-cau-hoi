import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { QaEntry } from '../../lib/types'

interface SlotListProps {
  entries: QaEntry[]
  targetCount: number
  onEdit: (entry: QaEntry) => void
  onDelete: (entry: QaEntry) => void
}

export default function SlotList({ entries, targetCount, onEdit, onDelete }: SlotListProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const slotCount = Math.max(targetCount, entries.length)
  const bySlot = new Map(entries.map((entry) => [entry.slot_index, entry]))

  function renderCitations(citations: QaEntry['citations']) {
    return citations.map((citation) => (
      <div key={citation.citation_id} style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 500, fontSize: 12.5 }}>
          {citation.chunk?.section_heading || citation.manual_location || '—'}
        </div>
        {citation.chunk && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {citation.chunk.text_abstract || citation.chunk.text}
          </div>
        )}
        {citation.manual_doc_name && !citation.chunk && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {citation.manual_doc_name} · {citation.manual_location}
          </div>
        )}
      </div>
    ))
  }

  return (
    <div>
      {Array.from({ length: slotCount }, (_, i) => i + 1).map((slotIndex) => {
        const entry = bySlot.get(slotIndex)
        if (!entry) {
          return (
            <div className="slot-card empty" key={`empty-${slotIndex}`}>
              <div className="slot-card-top">
                <span className="slot-card-index">{slotIndex}</span>
                <span className="slot-card-query">Ô trống — chưa nhập câu hỏi thứ {slotIndex}</span>
              </div>
            </div>
          )
        }

        const isOpen = openId === entry.entry_id
        const required = entry.citations.filter((c) => c.citation_type === 'REQUIRED')
        const supporting = entry.citations.filter((c) => c.citation_type === 'SUPPORTING')

        return (
          <div className={`slot-card filled${entry.is_extra ? ' extra' : ''}`} key={entry.entry_id}>
            <div className="slot-card-top" onClick={() => setOpenId(isOpen ? null : entry.entry_id)}>
              <span className="slot-card-index">{slotIndex}</span>
              <span className="slot-card-query truncate">{entry.query}</span>
              <span className="badge badge-default text-sm">{entry.review_status}</span>
              <div className="slot-card-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEdit(entry)
                  }}
                  title="Sửa"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(entry)
                  }}
                  title="Xoá"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : undefined, color: 'var(--text-muted)' }} />
            </div>
            {isOpen && (
              <div className="slot-card-body">
                <div className="field-label-block">Trích dẫn bắt buộc ({required.length})</div>
                <div className="field-value-block">
                  {required.length === 0 ? '—' : renderCitations(required)}
                </div>

                {supporting.length > 0 && (
                  <>
                    <div className="field-label-block">Trích dẫn bổ trợ ({supporting.length})</div>
                    <div className="field-value-block">{renderCitations(supporting)}</div>
                  </>
                )}

                <div className="field-label-block">Evidence</div>
                <div className="field-value-block">{entry.evidence}</div>

                <div className="field-label-block">Finding</div>
                <div className="field-value-block">{entry.finding}</div>

                <div className="field-label-block">Impression</div>
                <div className="field-value-block">{entry.impression}</div>

                <div className="field-label-block">Conclusion</div>
                <div className="field-value-block">{entry.conclusion}</div>

                {entry.required_answer_points.length > 0 && (
                  <>
                    <div className="field-label-block">Ý bắt buộc</div>
                    <div className="field-value-block">
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {entry.required_answer_points.map((point) => (
                          <li key={point.answer_point_id}>{point.content}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {entry.safety_notes && (
                  <>
                    <div className="field-label-block">Lưu ý an toàn</div>
                    <div className="field-value-block">{entry.safety_notes}</div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
