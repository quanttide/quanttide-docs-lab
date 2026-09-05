// 设备检测：移动端 = 触摸 + 窄屏 → 分页模式；否则桌面 → 滚动模式
// 注意：pointer:coarse 在触屏笔记本也匹配——必须同时窄屏（<768）才算移动端
// 无 matchMedia 的旧环境按宽度 <768 兜底

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  const narrow = window.innerWidth < 768
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(pointer: coarse)').matches && narrow
  }
  return narrow
}

export const isTouch = isTouchDevice()
