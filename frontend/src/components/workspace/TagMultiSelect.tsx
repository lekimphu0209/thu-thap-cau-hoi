import { Plus, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cleanLabel, foldText } from '../../lib/text'

const MAX_LABEL_LENGTH = 100

interface TagMultiSelectProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  maxItems: number
  options?: readonly string[]
  invalid?: boolean
}

interface OptionRow {
  text: string
  custom: boolean
}

export default function TagMultiSelect({
  value,
  onChange,
  placeholder,
  maxItems,
  options,
  invalid = false,
}: TagMultiSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const label = cleanLabel(query)
  const full = value.length >= maxItems
  const selected = useMemo(() => new Set(value.map((item) => item.toLowerCase())), [value])

  const rows = useMemo<OptionRow[]>(() => {
    const needle = foldText(label)
    const matches = (options ?? [])
      .filter((option) => !selected.has(option.toLowerCase()) && foldText(option).includes(needle))
      .map((text) => ({ text, custom: false }))
    const addable = label && matches.length === 0 && !selected.has(label.toLowerCase())
    return addable ? [{ text: label, custom: true }] : matches
  }, [options, selected, label])

  const active = Math.max(0, Math.min(activeIndex, rows.length - 1))

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, listId])

  function add(text: string) {
    const next = cleanLabel(text).slice(0, MAX_LABEL_LENGTH)
    if (!next || full) return
    if (!selected.has(next.toLowerCase())) onChange([...value, next])
    setQuery('')
    setActiveIndex(0)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setOpen(true)
        setActiveIndex(Math.min(active + 1, rows.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex(Math.max(active - 1, 0))
        break
      case 'Enter':
        event.preventDefault()
        add(rows[active]?.text ?? label)
        break
      case ',':
        if (!options) {
          event.preventDefault()
          add(label)
        }
        break
      case 'Backspace':
        if (!query && value.length > 0) onChange(value.slice(0, -1))
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }

  function handleBlur() {
    if (!options) add(label)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="tag-field-wrap">
      <div
        className={`tag-field${open ? ' focused' : ''}${invalid ? ' has-error' : ''}`}
        onMouseDown={(event) => {
          if (event.target !== inputRef.current) event.preventDefault()
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((item, index) => (
          <span key={item} className="tag-chip">
            {item}
            <button
              type="button"
              className="tag-chip-remove"
              aria-label={`Bỏ ${item}`}
              onClick={(event) => {
                event.stopPropagation()
                onChange(value.filter((_, i) => i !== index))
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="tag-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && rows.length > 0 ? `${listId}-${active}` : undefined}
          value={query}
          maxLength={MAX_LABEL_LENGTH}
          disabled={full}
          placeholder={full ? `Tối đa ${maxItems} mục` : value.length > 0 ? 'Thêm...' : placeholder}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && (rows.length > 0 || Boolean(options)) && (
        <div className="tag-panel" onMouseDown={(event) => event.preventDefault()}>
          {rows.length > 0 ? (
            <ul className="tag-options" id={listId} role="listbox">
              {rows.map((row, index) => (
                <li
                  key={`${row.custom}-${row.text}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  className={`tag-option${index === active ? ' active' : ''}${row.custom ? ' custom' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => add(row.text)}
                >
                  {row.custom ? (
                    <>
                      <Plus size={14} /> Thêm “{row.text}”
                    </>
                  ) : (
                    row.text
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="tag-empty">Đã chọn hết các mục trong danh sách</div>
          )}
          {options && <div className="tag-panel-foot">Không có trong danh sách? Gõ tên rồi nhấn Enter để thêm.</div>}
        </div>
      )}
    </div>
  )
}
