import { useEffect, useId, useMemo, useState } from 'react'
import { foldText } from '../../lib/text'

const MAX_SUGGESTIONS = 8

interface SuggestInputProps {
  value: string
  onChange: (value: string) => void
  suggestions: readonly string[]
  fallbackSuggestions: readonly string[]
  placeholder: string
  invalid?: boolean
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
  const [activeIndex, setActiveIndex] = useState(0)
  const listId = useId()

  const matches = useMemo(() => {
    const needle = foldText(value.trim())
    const pick = (pool: readonly string[]) =>
      pool.filter((item) => foldText(item).includes(needle) && foldText(item) !== needle)
    const primary = pick(suggestions)
    return (primary.length > 0 || !needle ? primary : pick(fallbackSuggestions)).slice(0, MAX_SUGGESTIONS)
  }, [value, suggestions, fallbackSuggestions])

  const active = Math.max(0, Math.min(activeIndex, matches.length - 1))

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, listId])

  function choose(text: string) {
    onChange(text)
    setOpen(false)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(Math.min(active + 1, matches.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(Math.max(active - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (open && matches[active]) choose(matches[active])
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
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {open && matches.length > 0 && (
        <div className="tag-panel" onMouseDown={(event) => event.preventDefault()}>
          <ul className="tag-options" id={listId} role="listbox">
            {matches.map((item, index) => (
              <li
                key={item}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={`tag-option${index === active ? ' active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(item)}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
