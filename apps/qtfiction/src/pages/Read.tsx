import { useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { chaptersFor, getChapterContent, parseChapterTitle, seriesList } from '../data/series'
import { getProgress, saveProgress } from '../data/progress'
import { isTouch } from '../data/device'
import MobileReader from '../components/MobileReader'

// 设备检测（见 src/data/device.ts）：
//   触摸优先设备（手机/平板）→ 沉浸式分页阅读器 MobileReader
//   桌面 → 滚动模式 ScrollReader

/** markdown 正文 → 段落列表（每段 <p>，段内换行 → <br>） */
function renderParagraphs(raw: string): ReactNode[] {
  const body = raw.replace(/^# .+\n/, '').trim()
  return body.split('\n\n').map((para, i) => (
    <p key={i}>
      {para.split('\n').flatMap((line, j) =>
        j === 0 ? [line] : [<br key={`br-${i}-${j}`} />, line]
      )}
    </p>
  ))
}

/** 防抖 300ms 保存进度；卸载时立即兜底保存 */
function useDebouncedProgress(seriesId: string, fileName: string) {
  const debounceRef = useRef<number | null>(null)

  const flush = useCallback(
    (page: number) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        saveProgress(seriesId, { file: fileName, page, updatedAt: Date.now() })
      }, 300)
    },
    [seriesId, fileName],
  )

  const flushNow = useCallback(
    (page: number) => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      saveProgress(seriesId, { file: fileName, page, updatedAt: Date.now() })
    },
    [seriesId, fileName],
  )

  return { flush, flushNow }
}

// ---------- 滚动模式（桌面）：连续滚动 + 滚动百分比进度 ----------

function ScrollReader({
  seriesId,
  fileName,
  paragraphs,
}: {
  seriesId: string
  fileName: string
  paragraphs: ReactNode[]
}) {
  const lastPercentRef = useRef(0)
  const prevFileRef = useRef(fileName)
  const { flush, flushNow } = useDebouncedProgress(seriesId, fileName)
  // flush 随 fileName 变化，用 ref 保证 scroll 监听始终写入当前章节
  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  }, [flush])
  const flushNowRef = useRef(flushNow)
  useEffect(() => {
    flushNowRef.current = flushNow
  }, [flushNow])

  // 恢复滚动位置 / 切换章节时重置并保存上一章节
  useEffect(() => {
    if (prevFileRef.current !== fileName) {
      saveProgress(seriesId, { file: prevFileRef.current, page: lastPercentRef.current, updatedAt: Date.now() })
      prevFileRef.current = fileName
    }
    const p = getProgress(seriesId)
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    if (p && p.file === fileName && max > 0) {
      const target = (Math.min(p.page, 100) / 100) * max
      lastPercentRef.current = p.page
      window.scrollTo(0, target)
    } else {
      lastPercentRef.current = 0
      window.scrollTo(0, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId, fileName])

  // 滚动监听 → 记录百分比 + 防抖保存
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const percent = max > 0 ? Math.round((window.scrollY / max) * 100) : 0
      lastPercentRef.current = percent
      flushRef.current(percent)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 卸载兜底保存
  useEffect(
    () => () => {
      flushNowRef.current(lastPercentRef.current)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return <div className="read-content scroll-content">{paragraphs}</div>
}

// ---------- 阅读页 ----------

export default function Read() {
  const { id, file } = useParams<{ id: string; file: string }>()
  const seriesId = id ? decodeURIComponent(id) : ''
  const fileName = file ? decodeURIComponent(file) : ''
  const series = seriesList.find(s => s.id === seriesId)
  const chapters = chaptersFor(seriesId)
  const idx = chapters.findIndex(c => c.file === fileName)
  const chapter = idx >= 0 ? chapters[idx] : undefined
  const raw = getChapterContent(seriesId, fileName)

  if (!series || !chapter) {
    return (
      <div className="page">
        <Link to="/" className="back-link">&larr; 首页</Link>
        <p className="empty">章节不存在</p>
      </div>
    )
  }

  const prev = idx > 0 ? chapters[idx - 1] : undefined
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : undefined
  const { title } = parseChapterTitle(chapter.file)
  const paragraphs = raw ? renderParagraphs(raw) : []

  // 手机端：沉浸式全屏阅读器（fixed 覆盖全屏，章节导航在底部条内）
  if (isTouch && raw) {
    return (
      <MobileReader
        seriesId={seriesId}
        fileName={fileName}
        paragraphs={paragraphs}
        prev={prev}
        next={next}
        title={title}
      />
    )
  }

  return (
    <div className="page read-page">
      <Link to={`/series/${encodeURIComponent(seriesId)}`} className="back-link">
        &larr; {series.name}
      </Link>
      <header className="read-header">
        <h1>{title}</h1>
        <div className="read-meta">
          <span className="read-series">{series.name}</span>
          {chapter.number ? <span className="read-number">{chapter.number}</span> : null}
        </div>
      </header>

      {raw ? (
        <ScrollReader seriesId={seriesId} fileName={fileName} paragraphs={paragraphs} />
      ) : (
        <p className="empty">该章节正文未收录</p>
      )}

      {/* prev-next 导航仅桌面模式渲染；手机端在 MobileReader 底部条内 */}
      <nav className="prev-next">
        {prev ? (
          <Link
            to={`/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(prev.file)}`}
            className="pn-link"
          >
            <span className="pn-label">&larr; 上一篇</span>
            <span className="pn-title">{prev.number ? `${prev.number} ` : ''}{prev.title}</span>
          </Link>
        ) : (
          <span className="pn-empty" />
        )}
        {next ? (
          <Link
            to={`/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(next.file)}`}
            className="pn-link pn-next"
          >
            <span className="pn-label">下一篇 &rarr;</span>
            <span className="pn-title">{next.number ? `${next.number} ` : ''}{next.title}</span>
          </Link>
        ) : (
          <span className="pn-empty" />
        )}
      </nav>
    </div>
  )
}
