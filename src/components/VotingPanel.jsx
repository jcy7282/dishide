import ConfettiBurst from './ConfettiBurst.jsx'

const SLOTS_PER_ROW = 5

export default function VotingPanel({
  picks,
  onVote,
  onReset,
  votesLocked = false,
  onLockVotes,
  resultDetails = null,
}) {
  const hasPicks = picks.length > 0
  const canReset = hasPicks && typeof onReset === 'function'
  const canLock = hasPicks && typeof onLockVotes === 'function'

  const {
    showWinner = false,
    winnerPick = null,
    showCelebration = false,
    confettiSeed = 0,
    showTie = false,
    tiePicks = [],
    showNoVotes = false,
  } = resultDetails ?? {}

  const ordered = hasPicks
    ? [...picks].sort((a, b) => {
        if (b.votes === a.votes) {
          return a.name.localeCompare(b.name)
        }
        return b.votes - a.votes
      })
    : []

  const remainder = ordered.length % SLOTS_PER_ROW
  const placeholderCount = hasPicks
    ? remainder === 0
      ? 0
      : SLOTS_PER_ROW - remainder
    : 0
  const placeholders = Array.from({ length: placeholderCount })

  return (
    <section className="panel">
      <header>
        <div className="panel__title">
          <h2>Vote for your champion</h2>
          <p>
            {hasPicks
              ? ordered.length === 1
                ? '1 contender enters the showdown'
                : `${ordered.length} contenders enter the showdown`
              : 'No contenders yet—nominate your first pick!'}
          </p>
        </div>
        {canReset && (
          <button type="button" className="ghost panel__reset" onClick={onReset}>
            Clear all picks
          </button>
        )}
      </header>

      <ul className="pick-list" role="list">
        {ordered.map((pick) => {
          const categories = pick.yelp?.categories ?? []
          const categoryLabel = categories.slice(0, 3).join(', ')
          const photoUrl = pick.yelp?.image_url

          return (
            <li key={pick.id} className="pick-card">
              {photoUrl ? (
                <div className="pick-card__media">
                  <img
                    src={photoUrl}
                    alt={`Food or atmosphere at ${pick.name}`}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="pick-card__media pick-card__media--empty">
                  <span>No photo yet</span>
                </div>
              )}

              <div className="pick-card__body">
                <div className="pick-card__head">
                  <h3>{pick.name}</h3>
                  {pick.yelp?.price && (
                    <span className="pill">{pick.yelp.price}</span>
                  )}
                </div>

                {pick.note && <p className="pick-card__note">“{pick.note}”</p>}

                <div className="pick-card__summary">
                  {typeof pick.yelp?.rating === 'number' && (
                    <span className="pill">⭐ {pick.yelp.rating.toFixed(1)}</span>
                  )}
                  {categoryLabel && <span className="pill">{categoryLabel}</span>}
                </div>

                {pick.yelp?.address && (
                  <p className="pick-card__address">{pick.yelp.address}</p>
                )}

                <div className="pick-card__footer">
                  <div className="pick-card__votes">
                    <span className="pick-card__count">{pick.votes}</span>
                    <span>votes</span>
                  </div>
                  <button
                    type="button"
                    className="pick-card__button"
                    onClick={() => onVote(pick.id)}
                    disabled={votesLocked}
                  >
                    {votesLocked ? 'Locked' : 'Vote'}
                  </button>
                </div>
              </div>
            </li>
          )
        })}

        {placeholders.map((_, index) => (
          <li
            key={`placeholder-${index}`}
            className="pick-card pick-card--placeholder"
            aria-hidden="true"
          />
        ))}
      </ul>

      {canLock && (
        <div className="panel__actions">
          <button
            type="button"
            className="panel__done"
            onClick={onLockVotes}
            disabled={votesLocked}
          >
            {votesLocked ? 'Votes locked' : 'Done'}
          </button>
        </div>
      )}

      {(showWinner || showTie || showNoVotes) && (
        <div className="vote-result" aria-live="polite">
          {showWinner && winnerPick && (
            <div className={`vote-result__card${showCelebration ? ' is-celebrating' : ''}`}>
              <p>Winner</p>
              <strong>{winnerPick.name}</strong>
              {winnerPick.note && <span>“{winnerPick.note}”</span>}
            </div>
          )}
          {showTie && tiePicks.length > 0 && (
            <div className="vote-result__card is-tie">
              <p>Votes locked—tie between:</p>
              <ul>
                {tiePicks.map((pick) => (
                  <li key={pick.id}>{pick.name}</li>
                ))}
              </ul>
              <span>Spin the wheel to break it.</span>
            </div>
          )}
          {showNoVotes && (
            <div className="vote-result__card is-muted">
              <p>Votes locked, but no votes were cast yet.</p>
            </div>
          )}
        </div>
      )}

      {showCelebration && <ConfettiBurst seed={confettiSeed} />}

      {!hasPicks && <p className="empty">Add a restaurant pick to get the hype rolling.</p>}
    </section>
  )
}
