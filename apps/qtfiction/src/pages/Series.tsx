import { Link, useParams } from 'react-router-dom'
import { seriesList, chaptersFor } from '../data/series'
import { getProgress } from '../data/progress'
import { isTouch } from '../data/device'

export default function Series() {
  const { id } = useParams<{ id: string }>()
  const decoded = id ? decodeURIComponent(id) : ''
  const series = seriesList.find(s => s.id === decoded)
  const chapters = chaptersFor(decoded)

  if (!series) {
    return (
      <div className="page">
        <Link to="/" className="back-link">&larr; 首页</Link>
        <p className="empty">系列不存在</p>
      </div>
    )
  }

  // 有阅读进度时显示"继续阅读"入口（优先于第一章）
  const progress = getProgress(decoded)
  const continueChapter = progress ? chapters.find(c => c.file === progress.file) : undefined

  return (
    <div className="page series-page">
      <Link to="/" className="back-link">&larr; 首页</Link>
      <h1>{series.name}</h1>
      <p className="series-desc">{series.description}</p>

      {progress && continueChapter ? (
        <Link
          to={`/read/${encodeURIComponent(decoded)}/${encodeURIComponent(continueChapter.file)}`}
          className="continue-reading"
        >
          <span className="continue-label">继续阅读</span>
          <span className="continue-title">
            {continueChapter.number ? `${continueChapter.number} ` : ''}
            {continueChapter.title}
          </span>
          <span className="continue-pos">
            {isTouch ? `第 ${progress.page + 1} 页` : `${progress.page}%`}
          </span>
        </Link>
      ) : null}

      <div className="chapter-list">
        {chapters.map(ch => (
          <Link
            to={`/read/${encodeURIComponent(decoded)}/${encodeURIComponent(ch.file)}`}
            className="chapter-item"
            key={ch.file}
          >
            {ch.number ? <span className="chapter-number">{ch.number}</span> : null}
            <span className="chapter-title">{ch.title}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
