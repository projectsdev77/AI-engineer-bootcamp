import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Positioned {
  id: string
  position: number
}

/**
 * Generic admin CRUD + reorder for any `(parent_id, position)`-scoped table
 * (weeks, lessons, resources, assignments, quiz_questions, quiz_options).
 *
 * Reordering swaps two rows' positions in three sequential updates (temp
 * value, then each row into the other's old slot) rather than two, because
 * every one of these tables has a `unique(parent_id, position)` constraint
 * with default (immediate, non-deferred) checking — two direct updates
 * would collide mid-swap.
 */
export function useAdminCollection<T extends Positioned>(
  table: string,
  parentColumn: string,
  parentId: string | undefined,
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!parentId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(parentColumn, parentId)
      .order('position')
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setItems((data ?? []) as T[])
    }
    setLoading(false)
  }, [table, parentColumn, parentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function create(fields: Record<string, unknown>): Promise<T | null> {
    if (!parentId) return null
    const nextPosition = items.length ? Math.max(...items.map((i) => i.position)) + 1 : 1
    const { data, error } = await supabase
      .from(table)
      .insert({ ...fields, [parentColumn]: parentId, position: nextPosition })
      .select()
      .single()
    if (error) {
      setError(error.message)
      return null
    }
    await refresh()
    return data as T
  }

  async function update(id: string, fields: Record<string, unknown>): Promise<boolean> {
    const { error } = await supabase.from(table).update(fields).eq('id', id)
    if (error) {
      setError(error.message)
      return false
    }
    await refresh()
    return true
  }

  async function remove(id: string): Promise<boolean> {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      setError(error.message)
      return false
    }
    await refresh()
    return true
  }

  async function swap(a: Positioned, b: Positioned) {
    const TEMP_POSITION = -1
    const steps = [
      supabase.from(table).update({ position: TEMP_POSITION }).eq('id', a.id),
      supabase.from(table).update({ position: a.position }).eq('id', b.id),
      supabase.from(table).update({ position: b.position }).eq('id', a.id),
    ]
    for (const step of steps) {
      const { error } = await step
      if (error) {
        setError(error.message)
        return
      }
    }
    await refresh()
  }

  async function moveUp(id: string) {
    const idx = items.findIndex((i) => i.id === id)
    if (idx <= 0) return
    await swap(items[idx], items[idx - 1])
  }

  async function moveDown(id: string) {
    const idx = items.findIndex((i) => i.id === id)
    if (idx < 0 || idx >= items.length - 1) return
    await swap(items[idx], items[idx + 1])
  }

  return { items, loading, error, refresh, create, update, remove, moveUp, moveDown }
}
