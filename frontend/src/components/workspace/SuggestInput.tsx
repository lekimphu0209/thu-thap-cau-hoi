import { Plus } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { cleanLabel, foldText } from '../../lib/text'

const MAX_SUGGESTIONS = 8
const NO_SELECTION = -1

interface SuggestInputProps {
  value: string
  onChange: (value: string) => void
  suggestions: readonly string[]
  fallbackSuggestions: readonly string[]
  placeholder: string
  invalid?: boolean
}

interface OptionRow {
  text: string
  custom: boolean
}

export default function SuggestInput({
  value,
  onChange,
  suggestions,
  fallbackSuggestions,
  placeholder,
  invalid = false,
}: SuggestInputProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(NO_SELECTION)
  const listId = useId()

  const rows = useMemo<OptionRow[]>(() => {
    const label = cleanLabel(value)
    const needle = foldText(label)
    const pick = (pool: readonly string[]) => pool.filter((item) => foldText(item).includes(needle))
    const primary = pick(suggestions)
    const matches = primary.length > 0 || !needle ? primary : pick(fallbackSuggestions)
    const rows: OptionRow[] = matches.slice(0, MAX_SUGGESTIONS).map((text) => ({ text, custom: false }))
    const exact = matches.some((item) => foldText(item) === needle)
    return label && !exact ? [...rows, { text: label, custom: true }] : rows
  }, [value, suggestions, fallbackSuggestions])

  const active = Math.min(activeIndex, rows.length - 1)

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, listId])

  function choose(text: string) {
    onChange(text)
    setOpen(false)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(Math.min(active + 1, rows.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(Math.max(active - 1, NO_SELECTION))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (open && rows[active]) choose(rows[active].text)
      else setOpen(false)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="tag-field-wrap">
      <input
        type="text"
        className={`form-input${invalid ? ' has-error' : ''}`}
        role="combobox"
        aria-expanded={open && rows.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value)
          setActiveIndex(NO_SELECTION)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {open && rows.length > 0 && (
        <div className="tag-panel" onMouseDown={(event) => event.preventDefault()}>
          <ul className="tag-options" id={listId} role="listbox">
            {rows.map((row, index) => (
              <li
                key={`${row.custom}-${row.text}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={`tag-option${index === active ? ' active' : ''}${row.custom ? ' custom' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(row.text)}
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
        </div>
      )}
    </div>
  )
}
