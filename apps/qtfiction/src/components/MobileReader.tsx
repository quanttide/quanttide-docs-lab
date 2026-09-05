import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Chapter } from '../data/series'
import { getProgress, saveProgress } from '../data/progress'

/**
 * 手机阅读器（沉浸式分页形态）
 *
 * 布局：100dvh 全屏（fixed 覆盖，脱离全局 Layout 外壳）
 *   ├─ 顶部细条：2px 进度条 + 单行标题（chrome 最小化）
 *   ├─ 正文区域：flex:1 占满剩余高度，段落级分页，overflow hidden
 *   └─ 底部细条：‹ 上一篇 ｜ 第 X / Y 页 ｜ 下一篇 ›
 *
 * 交互：
 *   - 点击：左 1/3 上一页，右 2/3 下一页（核心交互）
 *   - 滑动：左右滑动翻页（touch 手势，touch-action: none 防浏览器滚动）
 *
 * 分页：隐藏 measurer 与正文同宽同 padding，按段落 offsetTop 累加高度，
 *   超过容器高度即开新页——段落级分组，宁少放不截断；单段超长独立成页，
 *   页面内 overflow hidden 兜底。
 *
 * 进度：getProgress 恢复页码，翻页防抖 300ms saveProgress，章节切换/卸载兜底保存。
 */

interface MobileReaderProps {
  seriesId: string
  fileName: string
  paragraphs: ReactNode[]
  prev?: Chapter
  next?: Chapter
  title: string
}

/** 防抖 300ms 保存进度 */
function useDebouncedSave(seriesId: string, fileName: string) {
  const timerRef = useRef<number | null>(null)

  const flush = useCallback(
    (page: number) => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        saveProgress(seriesId, { file: fileName, page, updatedAt: Date.now() })
      }, 300)
    },
    [seriesId, fileName],
  )

  const flushNow = useCallback(
    (page: number) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      saveProgress(seriesId, { file: fileName, page, updatedAt: Date.now() })
    },
    [seriesId, fileName],
  )

  return { flush, flushNow }
}

export default function MobileReader({
  seriesId,
  fileName,
  paragraphs,
  prev,
  next,
  title,
}: MobileReaderProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const measurerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<number[][]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const pageCountRef = useRef(1)
  const lastPageRef = useRef(0)
  const prevFileRef = useRef(fileName)
  const restoredFileRef = useRef('')
  const swipedRef = useRef(false)
  const touchRef = useRef<{ x: number; y: number } | null>(null)

  const { flush, flushNow } = useDebouncedSave(seriesId, fileName)
  // flush 随 fileName 变化，用 ref 保证效果回调始终写当前章节
  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  }, [flush])
  const flushNowRef = useRef(flushNow)
  useEffect(() => {
    flushNowRef.current = flushNow
  }, [flushNow])

  // 分页：段落级分组。页高 = 正文区域高度；从页首段顶到当前段底
  // （offsetTop 差值含段间距）超过页高即开新页，保证段间不截断
  const paginate = useCallback(() => {
    const viewport = viewportRef.current
    const measurer = measurerRef.current
    if (!viewport || !measurer || measurer.childElementCount === 0) return
    const height = viewport.clientHeight
    if (height <= 0) return
    const children = measurer.children
    const n = children.length
    const groups: number[][] = []
    let start = 0
    for (let i = 0; i < n; i++) {
      const blockHeight =
        (children[i] as HTMLElement).offsetTop -
        (children[start] as HTMLElement).offsetTop +
        (children[i] as HTMLElement).offsetHeight
      if (blockHeight > height) {
        if (i > start) {
          // 当前页已有多段且放不下 → 开新页（[start, i-1] 完整段落）
          groups.push(Array.from({ length: i - start }, (_, k) => start + k))
          start = i
          i-- // 重新以本段为新页首段计算
        } else {
          // 单段超长：独立成页，页内 overflow hidden 兜底（宁少放不截断）
          groups.push([i])
          start = i + 1
        }
      }
    }
    if (start <= n - 1) {
      groups.push(Array.from({ length: n - start }, (_, k) => start + k))
    }
    setPages(groups)
  }, [])

  // 正文或尺寸变化时重新分页
  useEffect(() => {
    paginate()
  }, [paginate, paragraphs])

  // 章节切换：保存上一章节进度，重置页码并强制重新恢复
  useEffect(() => {
    if (prevFileRef.current !== fileName) {
      saveProgress(seriesId, {
        file: prevFileRef.current,
        page: lastPageRef.current,
        updatedAt: Date.now(),
      })
      prevFileRef.current = fileName
    }
    restoredFileRef.current = ''
    lastPageRef.current = 0
    setCurrentPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId, fileName])

  // 恢复进度：pages 就绪后，仅每个章节首次进入时恢复一次
  useEffect(() => {
    if (pages.length === 0 || restoredFileRef.current === fileName) return
    restoredFileRef.current = fileName
    const p = getProgress(seriesId)
    const target = p && p.file === fileName ? Math.min(p.page, pages.length - 1) : 0
    setCurrentPage(target)
  }, [pages, fileName, seriesId])

  // 当前页变化 → 记录 + 防抖保存
  useEffect(() => {
    lastPageRef.current = currentPage
    flushRef.current(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  // 页码越界（重分页后）收敛到最后一页
  useEffect(() => {
    pageCountRef.current = pages.length
    if (pages.length === 0) return
    const max = pages.length - 1
    if (currentPage > max) setCurrentPage(max)
  }, [pages, currentPage])

  // 旋转 / 窗口尺寸变化时重新分页
  useEffect(() => {
    const repaginate = () => paginate()
    window.addEventListener('resize', repaginate)
    window.addEventListener('orientationchange', repaginate)
    return () => {
      window.removeEventListener('resize', repaginate)
      window.removeEventListener('orientationchange', repaginate)
    }
  }, [paginate])

  // 卸载兜底保存
  useEffect(
    () => () => {
      saveProgress(seriesId, {
        file: prevFileRef.current,
        page: lastPageRef.current,
        updatedAt: Date.now(),
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // ---------- 翻页 ----------

  const goPrev = useCallback(() => {
    setCurrentPage(c => Math.max(0, c - 1))
  }, [])

  const goNext = useCallback(() => {
    setCurrentPage(c => Math.min(pageCountRef.current - 1, c + 1))
  }, [])

  // 点击翻页：左 1/3 上一页，右 2/3 下一页
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (swipedRef.current) {
      swipedRef.current = false
      return
    }
    const viewport = viewportRef.current
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    if (e.clientX - rect.left < rect.width / 3) goPrev()
    else goNext()
  }

  // 左右滑动翻页：水平位移足够且明显大于垂直位移才判定为翻页
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchRef.current
    touchRef.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    swipedRef.current = true
    // 滑动后浏览器仍会合成 click，用标志拦截；超时兜底重置
    window.setTimeout(() => {
      swipedRef.current = false
    }, 400)
    if (dx < 0) goNext()
    else goPrev()
  }

  const progressPercent =
    pages.length > 0 ? Math.round(((currentPage + 1) / pages.length) * 100) : 0

  return (
    <div className="mobile-reader">
      <div className="mr-top">
        <div className="mr-progress">
          <i style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mr-bar">
          <Link
            to={`/series/${encodeURIComponent(seriesId)}`}
            className="mr-back"
            aria-label="返回章节列表"
          >
            ‹
          </Link>
          <h1 className="mr-title">{title}</h1>
        </div>
      </div>

      <div
        className="mr-viewport"
        ref={viewportRef}
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 测量容器：与正文同宽同 padding，隐藏但保留布局，用于按高度分片 */}
        <div className="mr-measurer" ref={measurerRef} aria-hidden="true">
          {paragraphs}
        </div>
        {pages.length > 0 && currentPage < pages.length && (
          <div className="mr-page">{pages[currentPage].map(id => paragraphs[id])}</div>
        )}
      </div>

      <nav className="mr-bottom">
        {prev ? (
          <Link
            to={`/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(prev.file)}`}
            className="mr-ch-link"
          >
            ‹ 上一篇
          </Link>
        ) : (
          <span className="mr-ch-disabled">‹ 上一篇</span>
        )}
        <span className="mr-page-info">
          {pages.length > 0 ? `第 ${currentPage + 1} / ${pages.length} 页` : '0 页'}
        </span>
        {next ? (
          <Link
            to={`/read/${encodeURIComponent(seriesId)}/${encodeURIComponent(next.file)}`}
            className="mr-ch-link mr-ch-next"
          >
            下一篇 ›
          </Link>
        ) : (
          <span className="mr-ch-disabled">下一篇 ›</span>
        )}
      </nav>
    </div>
  )
}
