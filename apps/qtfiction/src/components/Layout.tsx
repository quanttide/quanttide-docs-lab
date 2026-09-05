import { Link } from 'react-router-dom'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="header-brand">量潮小说</Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <span>&copy; 2026 · Quanttide</span>
      </footer>
    </div>
  )
}
