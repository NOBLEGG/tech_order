/**
 * TechOrder의 데이터 타입 정의
 */

/** 레퍼런스 리소스 타입 */
export type ReferenceType = 'url' | 'file'

/** 유저가 매니지먼트하고자 하는 오브젝트 */
export interface AppObject {
  id: string
  user_id: string
  title: string
  ref_url: string | null       // 레퍼런스: URL 또는 파일 패스
  ref_type: ReferenceType | null
  sort_order: number
  created_at: string
}

/** 스케줄 인터벌 */
export type Interval = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

/** 어떤 AppObject에 대한 스케줄 */
export interface Schedule {
  id: string
  obj_id: string               // 소속 AppObject ID
  parent_id: string | null     // 하위 스케줄일 경우 부모 Schedule ID
  title: string
  intvl: Interval
  start_date: string
  end_date: string | null
  weekdays: number[] | null    // weekly 반복 시 요일 (0=일 ~ 6=토)
  monthdays: number[] | null   // monthly 반복 시 날짜 (1~31)
  sort_order: number
  created_at: string
}

/** 어떤 스케줄에 대하여, 하나의 due_date에 관한 완료 히스토리 */
export interface Completion {
  id: string
  schedule_id: string
  due_date: string
  user_id: string
  created_at: string
}
