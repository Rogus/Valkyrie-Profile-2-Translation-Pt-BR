import { Link } from 'react-router-dom'

type ChangeType = 'added' | 'changed' | 'fixed'

interface ChangelogItem {
  type: ChangeType
  text: string
}

interface ChangelogEntry {
  version: string
  date: string
  items: ChangelogItem[]
}

const entries: ChangelogEntry[] = [
  {
    version: '0.3.0',
    date: '2026-08-15',
    items: [
      { type: 'added', text: 'First cutscene English dub (proof of concept).' },
      { type: 'changed', text: 'Reworked glyph atlas clustering.' },
      { type: 'fixed', text: 'Line breaks in long NPC dialog.' }
    ]
  },
  {
    version: '0.2.0',
    date: '2026-06-02',
    items: [
      { type: 'added', text: 'Menu and system message translations.' },
      { type: 'added', text: 'Character background scenes.' },
      { type: 'fixed', text: 'Cutscene text overflowing the dialog box.' }
    ]
  },
  {
    version: '0.1.0',
    date: '2026-04-10',
    items: [
      { type: 'added', text: 'Initial English translation patch.' },
      { type: 'added', text: 'Title and first cutscene translated.' }
    ]
  }
]

const tagLabel: Record<ChangeType, string> = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed'
}

function Changelog() {
  return (
    <section className="changelog">
      <h1>Changelog</h1>
      <p className="changelog-sub">Release notes for the translation patch.</p>

      <ol className="changelog-list">
        {entries.map((entry) => (
          <li key={entry.version} className="changelog-entry">
            <header className="changelog-header">
              <span className="changelog-version">v{entry.version}</span>
              <time className="changelog-date" dateTime={entry.date}>
                {entry.date}
              </time>
            </header>

            <ul className="changelog-items">
              {entry.items.map((item, index) => (
                <li key={index} className="changelog-item">
                  <span
                    className={`changelog-tag changelog-tag-${item.type}`}
                    aria-label={tagLabel[item.type]}
                  >
                    {tagLabel[item.type]}
                  </span>
                  <span className="changelog-text">{item.text}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <p className="row">
        <Link to="/" className="btn accent">
          Back home
        </Link>
      </p>
    </section>
  )
}

export default Changelog