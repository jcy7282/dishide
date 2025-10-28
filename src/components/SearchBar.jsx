import { useState } from 'react'

const MIN_TERM_LENGTH = 2

export default function SearchBar({ onSearch, loading }) {
  const [term, setTerm] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedTerm = term.trim()
    const trimmedLocation = location.trim()

    if (trimmedTerm.length < MIN_TERM_LENGTH) {
      setMessage('Enter a restaurant name to search Yelp')
      return
    }

    if (trimmedLocation.length === 0) {
      setMessage('Enter a city or neighborhood to search Yelp')
      return
    }

    setMessage('')
    onSearch({ term: trimmedTerm, location: trimmedLocation })
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="term">Restaurant name</label>
        <input
          id="term"
          type="text"
          placeholder="Try “Din Tai Fung” or “Shake Shack”"
          value={term}
          maxLength={60}
          onChange={(event) => setTerm(event.target.value)}
          disabled={loading}
        />
      </div>

      <div className="field-group">
        <label htmlFor="location">Location</label>
        <div className="location-row">
          <input
            id="location"
            type="text"
            placeholder="City or neighborhood"
            value={location}
            onChange={(event) => {
              setLocation(event.target.value)
            }}
            disabled={loading}
          />
        </div>
      </div>

      <button type="submit" className="primary" disabled={loading}>
        {loading ? 'Searching Yelp...' : 'Find restaurant'}
      </button>

      {message && <p className="form-error">{message}</p>}
    </form>
  )
}
