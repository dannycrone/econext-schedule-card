import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { EconextScheduleCardConfig, HomeAssistant } from './types';

type FormValueChangedEvent = CustomEvent<{ value: Partial<EconextScheduleCardConfig> }>;

/**
 * Home Assistant's graphical card editor.
 *
 * Keeping the schema here (rather than maintaining a second set of controls)
 * means every supported card option is available from the visual editor as
 * well as YAML mode.
 */
@customElement('econext-schedule-card-editor')
export class EconextScheduleCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config: Partial<EconextScheduleCardConfig> = {};

  public setConfig(config: EconextScheduleCardConfig): void {
    // Mirror the card defaults so an omitted YAML property does not look
    // switched off in the visual editor (and accidentally get saved as off).
    this._config = {
      layout: 'tabs',
      editable: true,
      show_time_labels: true,
      highlight_current_day: true,
      highlight_current_slot: true,
      weekly_time_label_mode: 'hour',
      weekly_cell_label_mode: 'none',
      ...config,
    };
  }

  protected render(): TemplateResult {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${EDITOR_SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <div class="colour-pickers">
        ${this._renderColourPicker('active_color', 'Active cell colour', '#00bcd4')}
        ${this._renderColourPicker('inactive_color', 'Inactive cell colour', '#e0e0e0')}
        ${this._config.layout === 'weekly'
          ? this._renderColourPicker('grid_line_color', 'Grid-line colour', '#e0e0e0')
          : ''}
        ${['state', 'state_icon'].includes(this._config.weekly_cell_label_mode ?? 'none')
          ? html`
              ${this._renderColourPicker('active_text_color', 'Active text colour', '#ffffff')}
              ${this._renderColourPicker('inactive_text_color', 'Inactive text colour', '#000000')}
            `
          : ''}
      </div>
    `;
  }

  static override styles = css`
    .colour-pickers {
      display: grid;
      gap: 16px;
      margin-top: 16px;
    }
  `;

  private _computeLabel = (schema: { name: string }): string => EDITOR_LABELS[schema.name] ?? schema.name;

  private _valueChanged(event: FormValueChangedEvent): void {
    event.stopPropagation();
    this._config = { ...event.detail.value };
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderColourPicker(
    key: keyof EconextScheduleCardConfig,
    label: string,
    fallback: string
  ): TemplateResult {
    return html`
      <ha-selector
        .hass=${this.hass}
        .label=${label}
        .selector=${{ color_rgb: {} }}
        .value=${this._colourToRgb(this._config[key] as string | undefined, fallback)}
        @value-changed=${(event: CustomEvent<{ value: number[] }>) => this._colourChanged(key, event)}
      ></ha-selector>
    `;
  }

  private _colourChanged(
    key: keyof EconextScheduleCardConfig,
    event: CustomEvent<{ value: number[] }>
  ): void {
    const [red, green, blue] = event.detail.value;
    if (![red, green, blue].every(Number.isFinite)) return;
    this._config = {
      ...this._config,
      [key]: `#${[red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('')}`,
    };
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _colourToRgb(value: string | undefined, fallback: string): number[] {
    const hex = (value ?? fallback).trim().replace(/^#/, '');
    if (!/^[0-9a-f]{6}$/i.test(hex)) return this._colourToRgb(fallback, '#000000');
    return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
  }
}

const EDITOR_SCHEMA = [
  { name: 'schedule_entity_prefix', required: true, selector: { text: {} } },
  { name: 'title', selector: { text: {} } },
  {
    name: 'layout',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'tabs', label: 'One day at a time' },
          { value: 'weekly', label: 'Weekly grid' },
        ],
      },
    },
  },
  { name: 'editable', selector: { boolean: {} } },
  {
    name: 'show_copy_controls',
    selector: { boolean: {} },
    visible: { field: 'editable', value: true },
  },
  { name: 'show_time_labels', selector: { boolean: {} }, visible: { field: 'layout', value: 'tabs' } },
  {
    name: 'weekly_time_label_mode',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'hour', label: 'Hour labels' },
          { value: 'all', label: 'All slot labels' },
        ],
      },
    },
    visible: { field: 'layout', value: 'weekly' },
  },
  {
    name: 'weekly_cell_label_mode',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'none', label: 'No cell labels' },
          { value: 'state', label: 'Show state labels' },
          { value: 'icon', label: 'Show state icons' },
          { value: 'state_icon', label: 'Show state labels and icons' },
        ],
      },
    },
    visible: { field: 'layout', value: 'weekly' },
  },
  {
    name: 'active_label',
    selector: { text: {} },
  },
  {
    name: 'inactive_label',
    selector: { text: {} },
  },
  {
    name: 'active_icon',
    selector: { icon: {} },
  },
  {
    name: 'inactive_icon',
    selector: { icon: {} },
  },
  { name: 'highlight_current_day', selector: { boolean: {} } },
  { name: 'highlight_current_slot', selector: { boolean: {} } },
];

const EDITOR_LABELS: Record<string, string> = {
  schedule_entity_prefix: 'Schedule entity prefix',
  title: 'Title',
  layout: 'Layout',
  editable: 'Allow editing',
  show_copy_controls: 'Show copy controls',
  show_time_labels: 'Show time labels',
  weekly_time_label_mode: 'Time-label mode',
  weekly_cell_label_mode: 'Cell-label mode',
  active_label: 'Active label',
  inactive_label: 'Inactive label',
  active_icon: 'Active icon',
  inactive_icon: 'Inactive icon',
  highlight_current_day: 'Highlight current day',
  highlight_current_slot: 'Highlight current time slot',
};
