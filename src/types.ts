/**
 * Type definitions for ecoNEXT Schedule Card
 */

// Home Assistant types (subset needed for the card)
export interface HomeAssistant {
  states: Record<string, HassEntity>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>
  ): Promise<void>;
  locale: {
    language: string;
  };
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

// Day types
export type DayKey =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

// Card configuration
export interface EconextScheduleCardConfig {
  type: string;
  /** Entity prefix, e.g., "number.econext_dhw_schedule" */
  schedule_entity_prefix: string;
  /** Optional card title */
  title?: string;
  /** Display one selected day or all seven days in a weekly grid (default: tabs) */
  layout?: 'tabs' | 'weekly';
  /** In weekly layout, show every half-hour label or only whole-hour labels (default: hour) */
  weekly_time_label_mode?: 'all' | 'hour';
  /** In weekly layout, show no cell content, state text, or active/inactive icons (default: none) */
  weekly_cell_label_mode?: 'none' | 'state' | 'icon' | 'state_icon';
  /** Allow editing by clicking cells (default: true) */
  editable?: boolean;
  /** Show time labels on the left (default: true) */
  show_time_labels?: boolean;
  /** Highlight the current day column (default: true) */
  highlight_current_day?: boolean;
  /** Highlight the current time slot (default: true) */
  highlight_current_slot?: boolean;
  /** Color for active slots (default: #00bcd4) */
  active_color?: string;
  /** Color for inactive slots (default: #e0e0e0) */
  inactive_color?: string;
  /** Optional colour for weekly-grid lines */
  grid_line_color?: string;
  /** Text used for active cells when weekly_cell_label_mode is state (default: On) */
  active_label?: string;
  /** Text used for inactive cells when weekly_cell_label_mode is state (default: Off) */
  inactive_label?: string;
  /** MDI icon used for active cells when weekly_cell_label_mode is icon */
  active_icon?: string;
  /** MDI icon used for inactive cells when weekly_cell_label_mode is icon */
  inactive_icon?: string;
  /** Optional text colour for active labelled cells */
  active_text_color?: string;
  /** Optional text colour for inactive labelled cells */
  inactive_text_color?: string;
  /** Show controls to copy the currently selected day to other days (default: false) */
  show_copy_controls?: boolean;
}

// Internal schedule data structure
export interface DaySchedule {
  day: DayKey;
  amEntityId: string;
  pmEntityId: string;
  amValue: number;
  pmValue: number;
  slots: boolean[]; // 48 slots for full day
}

export interface WeekSchedule {
  days: DaySchedule[];
}

// Cell click event detail
export interface CellClickDetail {
  day: DayKey;
  slotIndex: number; // 0-47
  isAm: boolean;
  bitIndex: number; // 0-23 within AM or PM
  currentValue: boolean;
  entityId: string;
}
