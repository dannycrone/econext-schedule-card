import { LitElement, html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import type {
  HomeAssistant,
  EconextScheduleCardConfig,
  DayKey,
  DaySchedule,
} from './types';
import { combineAmPm, toggleBit } from './bitfield';
import {
  DAYS_ORDER,
  DAY_LABELS,
  SLOTS_PER_DAY,
  getCurrentSlotIndex,
  getCurrentDay,
  slotToTime,
  isAmSlot,
  slotToBitIndex,
  DEFAULT_ACTIVE_COLOR,
  DEFAULT_INACTIVE_COLOR,
} from './constants';

import { cardStyles } from './styles';

@customElement('econext-schedule-card')
export class EconextScheduleCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EconextScheduleCardConfig;
  @state() private _selectedDay: DayKey = getCurrentDay();
  @state() private _pendingValues: Map<string, number> = new Map();
  @state() private _errorEntityIds: Set<string> = new Set();

  private _debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private _sendQueue: string[] = [];
  private _queueProcessing = false;

  private static readonly DEBOUNCE_MS = 500;
  private static readonly MAX_RETRIES = 2;
  private static readonly RETRY_BASE_MS = 1000;
  private static readonly INTER_CALL_DELAY_MS = 3000;

  static get styles(): CSSResultGroup {
    return cardStyles;
  }

  public setConfig(config: EconextScheduleCardConfig): void {
    if (!config.schedule_entity_prefix) {
      throw new Error('Please define schedule_entity_prefix');
    }

    this._config = {
      editable: true,
      show_time_labels: true,
      highlight_current_day: true,
      highlight_current_slot: true,
      active_color: DEFAULT_ACTIVE_COLOR,
      inactive_color: DEFAULT_INACTIVE_COLOR,
      ...config,
    };
  }

  public getCardSize(): number {
    // Title + tabs + schedule row + time labels + padding
    return this._config?.title ? 4 : 3;
  }

  public getLayoutOptions() {
    return {
      grid_rows: this._config?.title ? 4 : 3,
      grid_min_rows: this._config?.title ? 4 : 3,
    };
  }

  public static getStubConfig(): Partial<EconextScheduleCardConfig> {
    return {
      schedule_entity_prefix: 'number.econext_dhw_schedule',
      title: 'Schedule',
    };
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('econext-schedule-card-editor');
  }

  private _getEntityId(day: DayKey, period: 'am' | 'pm'): string {
    return `${this._config!.schedule_entity_prefix}_${day}_${period}`;
  }

  private _getEntityValue(entityId: string): number | null {
    const entity = this.hass?.states[entityId];
    if (!entity) return null;
    const value = parseFloat(entity.state);
    return isNaN(value) ? null : value;
  }

  private _getEffectiveValue(entityId: string): number | null {
    const pending = this._pendingValues.get(entityId);
    if (pending !== undefined) return pending;
    return this._getEntityValue(entityId);
  }

  private _buildDaySchedule(day: DayKey): DaySchedule | null {
    const amEntityId = this._getEntityId(day, 'am');
    const pmEntityId = this._getEntityId(day, 'pm');
    const amValue = this._getEffectiveValue(amEntityId);
    const pmValue = this._getEffectiveValue(pmEntityId);

    if (amValue === null || pmValue === null) {
      return null;
    }

    return {
      day,
      amEntityId,
      pmEntityId,
      amValue,
      pmValue,
      slots: combineAmPm(amValue, pmValue),
    };
  }

  private _handleCellClick(day: DayKey, slotIndex: number): void {
    if (!this._config?.editable || !this.hass) return;

    const isAm = isAmSlot(slotIndex);
    const bitIndex = slotToBitIndex(slotIndex);
    const entityId = this._getEntityId(day, isAm ? 'am' : 'pm');

    const currentBitfield = this._pendingValues.get(entityId) ?? this._getEntityValue(entityId);
    if (currentBitfield === null) return;

    const newValue = toggleBit(currentBitfield, bitIndex);

    this._pendingValues = new Map(this._pendingValues);
    this._pendingValues.set(entityId, newValue);

    this._scheduleSend(entityId);
  }

  private _copySelectedDayTo(targetDays: DayKey[]): void {
    if (!this._config?.editable || !this.hass) return;

    const sourceDay = this._buildDaySchedule(this._selectedDay);
    if (!sourceDay) return;

    const pending = new Map(this._pendingValues);
    const entityIdsToSend: string[] = [];

    for (const day of targetDays) {
      if (day === this._selectedDay) continue;

      const amEntityId = this._getEntityId(day, 'am');
      const pmEntityId = this._getEntityId(day, 'pm');

      // Avoid unnecessary writes when the target already matches the source.
      if (this._getEffectiveValue(amEntityId) !== sourceDay.amValue) {
        pending.set(amEntityId, sourceDay.amValue);
        entityIdsToSend.push(amEntityId);
      }
      if (this._getEffectiveValue(pmEntityId) !== sourceDay.pmValue) {
        pending.set(pmEntityId, sourceDay.pmValue);
        entityIdsToSend.push(pmEntityId);
      }
    }

    if (entityIdsToSend.length === 0) return;

    this._pendingValues = pending;
    for (const entityId of entityIdsToSend) {
      this._enqueueFlush(entityId);
    }
  }

  private _scheduleSend(entityId: string): void {
    const existing = this._debounceTimers.get(entityId);
    if (existing !== undefined) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this._enqueueFlush(entityId);
    }, EconextScheduleCard.DEBOUNCE_MS);

    this._debounceTimers.set(entityId, timer);
  }

  private _enqueueFlush(entityId: string): void {
    this._debounceTimers.delete(entityId);

    const value = this._pendingValues.get(entityId);
    if (value === undefined) return;

    if (!this._sendQueue.includes(entityId)) {
      this._sendQueue.push(entityId);
    }

    this._processQueue();
  }

  private async _processQueue(): Promise<void> {
    if (this._queueProcessing) return;
    this._queueProcessing = true;

    try {
      while (this._sendQueue.length > 0) {
        const entityId = this._sendQueue[0];
        const value = this._pendingValues.get(entityId);

        if (value === undefined) {
          this._sendQueue.shift();
          continue;
        }

        const success = await this._executeServiceCall(entityId, value);

        if (!success) {
          const updated = new Map(this._pendingValues);
          updated.delete(entityId);
          this._pendingValues = updated;
          this._showError(entityId);
        }

        this._sendQueue.shift();

        // Wait between calls to let the controller finish processing
        if (success && this._sendQueue.length > 0) {
          await new Promise<void>(resolve =>
            setTimeout(resolve, EconextScheduleCard.INTER_CALL_DELAY_MS)
          );
        }
      }
    } finally {
      this._queueProcessing = false;
    }
  }

  private async _executeServiceCall(entityId: string, value: number): Promise<boolean> {
    for (let attempt = 0; attempt <= EconextScheduleCard.MAX_RETRIES; attempt++) {
      try {
        await this.hass.callService('number', 'set_value', {
          entity_id: entityId,
          value,
        });
        return true;
      } catch (error) {
        console.error(
          `Failed to update ${entityId} (attempt ${attempt + 1}/${EconextScheduleCard.MAX_RETRIES + 1}):`,
          error
        );

        if (attempt < EconextScheduleCard.MAX_RETRIES) {
          const delay = EconextScheduleCard.RETRY_BASE_MS * Math.pow(2, attempt);
          await new Promise<void>(resolve => setTimeout(resolve, delay));

          const latestValue = this._pendingValues.get(entityId);
          if (latestValue === undefined) return true;
          value = latestValue;
        }
      }
    }
    return false;
  }

  private _showError(entityId: string): void {
    this._errorEntityIds = new Set([...this._errorEntityIds, entityId]);

    setTimeout(() => {
      const updated = new Set(this._errorEntityIds);
      updated.delete(entityId);
      this._errorEntityIds = updated;
    }, 5000);
  }

  private _hasErrorForDay(day: DayKey): boolean {
    const amId = this._getEntityId(day, 'am');
    const pmId = this._getEntityId(day, 'pm');
    return this._errorEntityIds.has(amId) || this._errorEntityIds.has(pmId);
  }

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    // When hass state updates, clear pending values that HA has confirmed
    if (changedProperties.has('hass') && this._pendingValues.size > 0) {
      const toRemove: string[] = [];
      for (const [entityId, pendingValue] of this._pendingValues) {
        if (!this._debounceTimers.has(entityId)) {
          const haValue = this._getEntityValue(entityId);
          if (haValue === pendingValue) {
            toRemove.push(entityId);
          }
        }
      }
      if (toRemove.length > 0) {
        const updated = new Map(this._pendingValues);
        for (const id of toRemove) {
          updated.delete(id);
        }
        this._pendingValues = updated;
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const timer of this._debounceTimers.values()) {
      clearTimeout(timer);
    }
    this._debounceTimers.clear();
    this._sendQueue = [];
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const currentDay = getCurrentDay();
    const currentSlot = getCurrentSlotIndex();
    const selectedDaySchedule = this._buildDaySchedule(this._selectedDay);

    // Check if entities exist
    if (!selectedDaySchedule) {
      // Try to find any valid day
      const anyValidDay = DAYS_ORDER.find(day => this._buildDaySchedule(day) !== null);
      if (!anyValidDay) {
        return html`
          <ha-card>
            <div class="warning">
              No schedule entities found for prefix:
              ${this._config.schedule_entity_prefix}
            </div>
          </ha-card>
        `;
      }
    }

    const activeColor = this._config.active_color || DEFAULT_ACTIVE_COLOR;
    const inactiveColor = this._config.inactive_color || DEFAULT_INACTIVE_COLOR;

    return html`
      <ha-card>
        ${this._config.title
          ? html`
              <div class="card-header">
                <div class="title">${this._config.title}</div>
              </div>
            `
          : nothing}

        ${this._config.layout !== 'weekly'
          ? html`
              <div class="day-tabs">
                ${DAYS_ORDER.map(day => html`
                  <button
                    class="day-tab ${classMap({
                      active: day === this._selectedDay,
                      'current-day': this._config!.highlight_current_day !== false && day === currentDay,
                      error: this._hasErrorForDay(day),
                    })}"
                    @click=${() => { this._selectedDay = day; }}
                  >
                    ${DAY_LABELS[day]}
                  </button>
                `)}
              </div>
            `
          : nothing}

        ${this._hasErrorForDay(this._selectedDay)
          ? html`
              <div class="error-banner">
                Failed to save schedule. Changes were reverted.
              </div>
            `
          : nothing}

        ${this._config.show_copy_controls && this._config.editable !== false
          ? this._renderCopyControls()
          : nothing}

        ${this._config.layout === 'weekly'
          ? this._renderWeeklyGrid(currentDay, currentSlot, activeColor, inactiveColor)
          : html`
              <div class="schedule-container">
                <div class="schedule-row-wrapper">
                  ${selectedDaySchedule
                    ? this._renderScheduleRow(
                        selectedDaySchedule,
                        this._selectedDay === currentDay,
                        currentSlot,
                        activeColor,
                        inactiveColor
                      )
                    : this._renderEmptyRow()}

                  ${this._config.show_time_labels !== false
                    ? this._renderTimeLabels()
                    : nothing}
                </div>
              </div>
            `}
      </ha-card>
    `;
  }

  private _renderCopyControls(): TemplateResult {
    const sourceLabel = DAY_LABELS[this._selectedDay];
    const weekdays: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekend: DayKey[] = ['saturday', 'sunday'];

    return html`
      <div class="copy-controls" role="group" aria-label="Copy ${sourceLabel} schedule">
        <label class="copy-label" for="copy-source">Copy from</label>
        <select
          id="copy-source"
          class="copy-source"
          @change=${(event: Event) => {
            this._selectedDay = (event.target as HTMLSelectElement).value as DayKey;
          }}
        >
          ${DAYS_ORDER.map(day => html`
            <option value=${day} ?selected=${day === this._selectedDay}>${DAY_LABELS[day]}</option>
          `)}
        </select>
        <button class="copy-button" @click=${() => this._copySelectedDayTo(DAYS_ORDER)}>
          Copy to all
        </button>
        <button class="copy-button" @click=${() => this._copySelectedDayTo(weekdays)}>
          Copy to weekdays
        </button>
        <button class="copy-button" @click=${() => this._copySelectedDayTo(weekend)}>
          Copy to weekend
        </button>
      </div>
    `;
  }

  private _renderWeeklyGrid(
    currentDay: DayKey,
    currentSlot: number,
    activeColor: string,
    inactiveColor: string
  ): TemplateResult {
    const editable = this._config?.editable !== false;
    const timeLabelMode = this._config?.weekly_time_label_mode ?? 'hour';
    const labelMode = this._config?.weekly_cell_label_mode;
    const showCellLabels = labelMode === 'state' || labelMode === 'state_icon';
    const showCellIcons = labelMode === 'icon' || labelMode === 'state_icon';
    const gridStyle = styleMap({
      '--weekly-grid-line-color': this._config?.grid_line_color ?? 'var(--divider-color, #e0e0e0)',
    });

    return html`
      <div class="weekly-grid-wrapper">
        <div class="weekly-grid" role="grid" aria-label="Weekly schedule" style=${gridStyle}>
          <div class="weekly-time-header">Time</div>
          ${DAYS_ORDER.map(day => html`
            <button
              class="weekly-day-header ${classMap({
                'current-day': this._config!.highlight_current_day !== false && day === currentDay,
                'copy-source': day === this._selectedDay,
              })}"
              aria-pressed=${day === this._selectedDay ? 'true' : 'false'}
              @click=${() => { this._selectedDay = day; }}
            >
              ${DAY_LABELS[day]}
            </button>
          `)}

          ${Array.from({ length: SLOTS_PER_DAY }, (_, slotIndex) => html`
            <div class="weekly-time-label">
              ${timeLabelMode === 'all' || slotIndex % 2 === 0 ? slotToTime(slotIndex) : ''}
            </div>
            ${DAYS_ORDER.map(day => {
              const schedule = this._buildDaySchedule(day);
              const active = schedule?.slots[slotIndex] ?? false;
              const isCurrentSlotHighlight =
                this._config?.highlight_current_slot !== false &&
                day === currentDay &&
                slotIndex === currentSlot;
              const label = active
                ? this._config?.active_label ?? 'On'
                : this._config?.inactive_label ?? 'Off';
              const textColor = active
                ? this._config?.active_text_color ?? '#ffffff'
                : this._config?.inactive_text_color ?? 'var(--primary-text-color)';
              const icon = active
                ? this._config?.active_icon ?? 'mdi:weather-sunny'
                : this._config?.inactive_icon ?? 'mdi:weather-night';

              return html`
                <button
                  class="weekly-cell ${classMap({
                    active,
                    inactive: !active,
                    'current-slot': isCurrentSlotHighlight,
                    readonly: !editable || !schedule,
                  })}"
                  style=${styleMap({
                    backgroundColor: active ? activeColor : inactiveColor,
                    color: textColor,
                  })}
                  title="${DAY_LABELS[day]} ${slotToTime(slotIndex)} - ${active ? 'Active' : 'Inactive'}"
                  ?disabled=${!editable || !schedule}
                  @click=${() => schedule && this._handleCellClick(day, slotIndex)}
                >${showCellLabels || showCellIcons
                  ? html`<span class="weekly-cell-content">
                      ${showCellIcons ? html`<ha-icon .icon=${icon}></ha-icon>` : nothing}
                      ${showCellLabels ? html`<span>${label}</span>` : nothing}
                    </span>`
                  : nothing}</button>
              `;
            })}
          `)}
        </div>
      </div>
    `;
  }

  private _renderTimeLabels(): TemplateResult {
    return html`
      <div class="time-labels">
        ${Array.from({ length: SLOTS_PER_DAY }, (_, i) => {
          const hour = Math.floor(i / 2);
          const isHalfHour = i % 2 !== 0;

          return html`
            <div class="time-label">
              ${isHalfHour ? '' : hour}
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderScheduleRow(
    daySchedule: DaySchedule,
    isCurrentDay: boolean,
    currentSlot: number,
    activeColor: string,
    inactiveColor: string
  ): TemplateResult {
    const editable = this._config?.editable !== false;

    return html`
      <div class="schedule-row">
        ${daySchedule.slots.map((active, slotIndex) => {
          const isCurrentSlotHighlight =
            this._config?.highlight_current_slot !== false &&
            isCurrentDay &&
            slotIndex === currentSlot;

          return html`
            <div
              class="schedule-cell ${classMap({
                active,
                inactive: !active,
                'current-slot': isCurrentSlotHighlight,
                readonly: !editable,
              })}"
              style=${styleMap({
                backgroundColor: active ? activeColor : inactiveColor,
              })}
              title="${slotToTime(slotIndex)} - ${active ? 'Active' : 'Inactive'}"
              @click=${() =>
                this._handleCellClick(daySchedule.day, slotIndex)}
            ></div>
          `;
        })}
      </div>
    `;
  }

  private _renderEmptyRow(): TemplateResult {
    return html`
      <div class="schedule-row">
        ${Array.from({ length: SLOTS_PER_DAY }, () => html`
          <div
            class="schedule-cell inactive readonly"
            style="opacity: 0.3"
            title="No data"
          ></div>
        `)}
      </div>
    `;
  }
}

// Register with custom card picker
declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
  interface HTMLElementTagNameMap {
    'econext-schedule-card': EconextScheduleCard;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'econext-schedule-card',
  name: 'ecoNEXT Schedule Card',
  description: 'Display and edit weekly schedules from ecoNEXT integration',
  preview: true,
});
