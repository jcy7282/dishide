import { useState } from 'react'
import { NOTE_MAX_LENGTH, sanitizeNote } from '../constants.js'

export default function RestaurantCard({ business, onAddPick, disabled, alreadyPicked }) {
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [helper, setHelper] = useState('')

  const categories = business.categories?.filter(Boolean) ?? []
  const remainingCharacters = Math.max(0, NOTE_MAX_LENGTH - note.length)

  const handleNoteChange = (event) => {
    const value = event.target.value.slice(0, NOTE_MAX_LENGTH)
    setNote(value)
  }

  const handleConfirm = () => {
    const safeNote = sanitizeNote(note)
    onAddPick(business, safeNote)
    setNote('')
    setExpanded(false)
    setHelper('Added to the room!')
    setTimeout(() => setHelper(''), 2000)
  }

  return (
    <article className="restaurant-card">
      {business.image_url && (
        <img src={business.image_url} alt={business.name} loading="lazy" />
      )}
      <div className="card-body">
        <header>
          <h3>{business.name}</h3>
          <div className="tags">
            {typeof business.rating === 'number' && (
              <span>⭐ {business.rating.toFixed(1)}</span>
            )}
            {business.price && <span>{business.price}</span>}
          </div>
        </header>

        {categories.length > 0 && (
          <ul className="categories">
            {categories.map((category) => (
              <li key={category}>{category}</li>
            ))}
          </ul>
        )}

        {business.address && <p className="address">{business.address}</p>}

        <div className="card-actions">
          <a href={business.url} target="_blank" rel="noreferrer">
            Yelp page ↗
          </a>
          <button
            type="button"
            className="primary"
            disabled={disabled || alreadyPicked}
            onClick={() => setExpanded((state) => !state)}
          >
            {alreadyPicked ? 'Already picked' : expanded ? 'Cancel' : 'Add Pick'}
          </button>
        </div>

        {expanded && !alreadyPicked && (
          <div className="note-editor">
            <label htmlFor={`note-${business.id}`}>Add a note (optional)</label>
            <textarea
              id={`note-${business.id}`}
              rows={2}
              maxLength={NOTE_MAX_LENGTH}
              placeholder="e.g., Great for big groups"
              value={note}
              onChange={handleNoteChange}
            />
            <small className="hint">{remainingCharacters} characters left</small>
            <button type="button" className="secondary" onClick={handleConfirm}>
              Save pick
            </button>
          </div>
        )}

        {helper && <small className="hint">{helper}</small>}
      </div>
    </article>
  )
}
