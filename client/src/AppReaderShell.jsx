import AppReader from './AppReader.jsx'
import ReaderNavigation from './ReaderNavigation.jsx'

const layoutStyles = `
  .tarteel-reader-shell > div > header,
  .tarteel-reader-shell > div > main,
  .tarteel-reader-shell > div > footer {
    transition: margin-left 180ms ease, width 180ms ease;
  }

  @media (min-width: 1024px) {
    .tarteel-reader-shell > div > header,
    .tarteel-reader-shell > div > main,
    .tarteel-reader-shell > div > footer {
      margin-left: 272px;
    }

    .tarteel-reader-shell > div > header nav,
    .tarteel-reader-shell > div > header button[aria-label="Open navigation"] {
      display: none !important;
    }

    .tarteel-reader-shell > div > header button[aria-label="Tarteel home"] {
      display: none !important;
    }
  }

  @media (max-width: 1023px) {
    .tarteel-reader-shell > div > header nav,
    .tarteel-reader-shell > div > header button[aria-label="Open navigation"] {
      display: none !important;
    }

    .tarteel-reader-shell > div > header button[aria-label="Tarteel home"] {
      visibility: hidden;
    }
  }

  @media (max-width: 640px) {
    .tarteel-reader-shell > div > header > div {
      padding-left: 4.5rem;
    }

    .tarteel-reader-shell > div > main {
      padding-top: 1.5rem;
    }
  }
`

export default function AppReaderShell() {
  return (
    <div className="tarteel-reader-shell">
      <style>{layoutStyles}</style>
      <ReaderNavigation />
      <AppReader />
    </div>
  )
}
