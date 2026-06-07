export type Interval = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

export type ReferenceType = 'url' | 'file'

export interface AppObject {
  id: string
  user_id: string
  title: string
  ref_url: string | null
  ref_type: ReferenceType | null
  sort_order: number
  created_at: string
}

export interface Schedule {
  id: string
  obj_id: string
  parent_id: string | null
  title: string
  intvl: Interval
  start_date: string
  weekdays: number[] | null
  monthdays: number[] | null
  sort_order: number
  created_at: string
}

export interface Completion {
  id: string
  schedule_id: string
  due_date: string
  user_id: string
  created_at: string
}
