import { Link } from 'react-router-dom'
import { seriesList, chaptersFor } from '../data/series'

export default function Home() {
  return (
    <div className="page home">
      <section className="hero">
        <h1 className="hero-tagline">
          量潮小说<br />
          网络文学 · 职场 / 校园 / 重生
        </h1>
        <p className="hero-anchor">三个系列，一个创作现场。</p>
      </section>

      <section className="section-series">
        <h2>系列</h2>
        <div className="series-grid">
          {seriesList.map(series => {
            const chapters = chaptersFor(series.id)
            return (
              <Link to={`/series/${encodeURIComponent(series.id)}`} className="series-card" key={series.id}>
                <h3>{series.name}</h3>
                <p className="series-desc">{series.description}</p>
                <p className="series-meta">{chapters.length} 篇</p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="about">
        <h2>关于</h2>
        <p>量潮小说是创始人的网络文学作品集，按系列组织，收录初稿与改稿正文。</p>
      </section>
    </div>
  )
}
