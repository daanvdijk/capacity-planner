export interface Project {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string | null;
  factorial_id: string | null;
  location_id: string | null;
  created_at: string;
}

export interface Allocation {
  id: string;
  member_id: string;
  project_id: string;
  week_start: string;
  percentage: number;
  project_name: string;
  project_color: string;
}

export interface WeekData {
  week: string;
  /** Day indices (0=Mon … 4=Fri) that are personal time off */
  leave_days: number[];
  /** Day indices (0=Mon … 4=Fri) that are national/public holidays */
  holiday_days: { day: number; name: string }[];
  allocated_percentage: number;
  available_percentage: number;
  allocations: Allocation[];
}

export interface MemberCapacity {
  member: TeamMember;
  weeks: WeekData[];
}
