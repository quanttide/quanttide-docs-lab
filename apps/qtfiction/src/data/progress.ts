// 阅读进度缓存封装（localStorage）
// key：qtfiction.progress.v1
// 结构：{ [seriesId]: { file, page, updatedAt } }
//   - 手机分页模式：page = 页码（0 起）
//   - 桌面滚动模式：page = 滚动百分比（0-100）
// 读写均 try/catch 容错（隐私模式 / 存储满等场景静默失败）

export interface ProgressEntry {
  /** 章节文件名（不含扩展名），用于定位正文 */
  file: string
  /** 位置：手机 = 页码，桌面 = 滚动百分比 */
  page: number
  /** 更新时间戳 */
  updatedAt: number
}

export type ProgressMap = Record<string, ProgressEntry>

const STORAGE_KEY = 'qtfiction.progress.v1'

function readAll(): ProgressMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return parsed as ProgressMap
  } catch {
    return {}
  }
}

function writeAll(map: ProgressMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // 存储不可用（隐私模式/容量满）时静默忽略
  }
}

/** 读取某系列的进度，无记录或出错返回 undefined */
export function getProgress(seriesId: string): ProgressEntry | undefined {
  try {
    return readAll()[seriesId]
  } catch {
    return undefined
  }
}

/** 写入某系列的进度 */
export function saveProgress(seriesId: string, entry: ProgressEntry): void {
  try {
    const map = readAll()
    map[seriesId] = entry
    writeAll(map)
  } catch {
    // 同上，忽略
  }
}
