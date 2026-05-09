import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePromptQueue } from '@renderer/hooks/usePromptQueue'

describe('usePromptQueue', () => {
  it('starts with empty queue', () => {
    const { result } = renderHook(() => usePromptQueue())
    expect(result.current.queue).toEqual([])
  })

  it('enqueue adds items to end in order', () => {
    const { result } = renderHook(() => usePromptQueue())
    act(() => { result.current.enqueue('hello') })
    act(() => { result.current.enqueue('world') })
    expect(result.current.queue).toEqual(['hello', 'world'])
  })

  it('remove removes item by index, leaving others intact', () => {
    const { result } = renderHook(() => usePromptQueue())
    act(() => { result.current.enqueue('a') })
    act(() => { result.current.enqueue('b') })
    act(() => { result.current.enqueue('c') })
    act(() => { result.current.remove(1) })
    expect(result.current.queue).toEqual(['a', 'c'])
  })

  it('clear empties the queue', () => {
    const { result } = renderHook(() => usePromptQueue())
    act(() => { result.current.enqueue('x') })
    act(() => { result.current.enqueue('y') })
    act(() => { result.current.clear() })
    expect(result.current.queue).toEqual([])
  })

  it('remove with out-of-bounds index does not throw', () => {
    const { result } = renderHook(() => usePromptQueue())
    act(() => { result.current.enqueue('a') })
    act(() => { result.current.remove(99) })
    expect(result.current.queue).toEqual(['a'])
  })
})
