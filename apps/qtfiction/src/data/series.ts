// 小说系列数据模型
// 正文文件位于 data/series/<系列>/<编号_标题>.md
// 命名规则（源自 fiction 数据源）：
//   职场言情短篇：`1_1_咖啡厅重逢.md` → 编号 1.1，标题 咖啡厅重逢
//   校园/重生言情章节：`10_第十章.md` → 章节 第十章

export interface Series {
  id: string
  name: string
  description: string
}

export interface Chapter {
  /** 目录文件名（不含扩展名），用于定位正文 */
  file: string
  /** 标题（从文件名解析） */
  title: string
  /** 编号（如 1.1 / 10），无编号则为空 */
  number: string
}

export const seriesList: Series[] = [
  { id: '职场言情', name: '职场言情', description: '职场背景的短篇言情合集。' },
  { id: '校园言情', name: '校园言情', description: '校园时期的长篇言情。' },
  { id: '重生言情', name: '重生言情', description: '重生设定，回到过去重新开始的言情故事。' },
]

// 全部章节正文
const contentMap = import.meta.glob('/data/series/*/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** 从完整路径解析系列 id：/data/series/<系列>/<文件>.md */
export function seriesIdFromPath(path: string): string | null {
  const m = path.match(/\/data\/series\/([^/]+)\/([^/]+)\.md$/)
  return m ? m[1] : null
}

/** 从文件名解析标题与编号 */
export function parseChapterTitle(file: string): { title: string; number: string } {
  // 去掉前导编号：`1_1_咖啡厅重逢` → `咖啡厅重逢`，编号 `1.1`
  const m = file.match(/^(\d+)_(\d+)_(.+)$/)
  if (m) return { title: m[3], number: `${m[1]}.${m[2]}` }
  // `10_第十章` / `1_重生` → 章节
  const m2 = file.match(/^(\d+)_(.+)$/)
  if (m2) return { title: m2[2], number: m2[1] }
  // `番外1_创作动机`
  const m3 = file.match(/^(番外\d*)_(.+)$/)
  if (m3) return { title: m3[2], number: m3[1] }
  return { title: file, number: '' }
}

/** 某个系列的章节列表（按编号排序） */
export function chaptersFor(seriesId: string): Chapter[] {
  const list: Chapter[] = []
  for (const path of Object.keys(contentMap)) {
    if (seriesIdFromPath(path) !== seriesId) continue
    const file = path.match(/\/[^/]+\.md$/)![0].slice(1, -3) // 去掉路径与 .md
    const { title, number } = parseChapterTitle(file)
    list.push({ file, title, number })
  }
  // 按编号排序
  list.sort((a, b) => {
    const na = Number(a.number.split('.')[0]) || 0
    const nb = Number(b.number.split('.')[0]) || 0
    return na - nb
  })
  return list
}

/** 获取某系列某章节的正文，未收录返回 undefined */
export function getChapterContent(seriesId: string, file: string): string | undefined {
  const path = `/data/series/${seriesId}/${file}.md`
  return contentMap[path]
}
