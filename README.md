# ecoNEXT Schedule Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

A Home Assistant Lovelace card for displaying and editing weekly schedules from the [ecoNEXT integration](https://github.com/LeeNuss/econext).

## Features

- Tabbed day selection or an optional seven-day weekly grid
- 48 half-hour time slots per day
- Click to toggle schedule slots
- Optional copy controls for the currently selected day (all days, weekdays, or weekend)
- Current day highlighting
- Responsive design

## Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Click the three dots in the top right corner
3. Select "Custom repositories"
4. Add this repository URL and select "Lovelace" as the category
5. Install "ecoNEXT Schedule Card"
6. Restart Home Assistant

### Manual Installation

1. Download `econext-schedule-card.js` from the [latest release](https://github.com/LeeNuss/econext-schedule-card/releases)
2. Copy it to `/config/www/econext-schedule-card.js`
3. Add the resource in Settings > Dashboards > Resources:
   - URL: `/local/econext-schedule-card.js`
   - Type: JavaScript Module

## Usage

```yaml
type: custom:econext-schedule-card
schedule_entity_prefix: number.econext_dhw_schedule
title: "DHW Schedule"
```

The card automatically discovers entities based on the prefix pattern:
- `{prefix}_sunday_am`, `{prefix}_sunday_pm`
- `{prefix}_monday_am`, `{prefix}_monday_pm`
- etc.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `schedule_entity_prefix` | string | *required* | Entity prefix (e.g., `number.econext_dhw_schedule`) |
| `title` | string | none | Card title |
| `layout` | string | `tabs` | `tabs` for one selected day, or `weekly` for a seven-day grid |
| `weekly_time_label_mode` | string | `hour` | In weekly layout, show `hour` labels or `all` half-hour labels |
| `weekly_cell_label_mode` | string | `none` | Use `state` for text, `icon` for an icon, or `state_icon` for both in every grid cell |
| `editable` | boolean | `true` | Allow clicking cells to toggle slots |
| `show_time_labels` | boolean | `true` | Show hour labels below the schedule |
| `highlight_current_day` | boolean | `true` | Highlight today's tab |
| `highlight_current_slot` | boolean | `true` | Highlight current 30-min slot |
| `active_color` | string | `#00bcd4` | Color for active slots |
| `inactive_color` | string | `#e0e0e0` | Color for inactive slots |
| `grid_line_color` | string | theme divider | Colour for weekly-grid lines |
| `active_label` / `inactive_label` | string | `On` / `Off` | State text used when `weekly_cell_label_mode: state` |
| `active_icon` / `inactive_icon` | string | sun / moon | MDI icons used when `weekly_cell_label_mode: icon` |
| `active_text_color` / `inactive_text_color` | string | white / theme text | Text colours for labelled cells |
| `show_copy_controls` | boolean | `false` | Show controls to copy the selected day's schedule |

All options are also available in Home Assistant's visual card editor. Colour
fields accept any CSS colour, such as a hex value (`#14b8a6`) or a theme CSS
variable (`var(--primary-color)`).

## Examples

### DHW Schedule
```yaml
type: custom:econext-schedule-card
schedule_entity_prefix: number.dhw_dhw_schedule
title: "Hot Water Schedule"
```

### Heating Circuit Schedule
```yaml
type: custom:econext-schedule-card
schedule_entity_prefix: number.ufh_schedule
title: "Underfloor Heating"
active_color: "#ff9800"
show_copy_controls: true
```

### Copy Controls

Set `show_copy_controls: true` to show a small toolbar above the schedule.
The selected day tab is the source day. **All days**, **Weekdays**, and
**Weekend** copy actions automatically exclude that source day and only write
AM/PM entities whose value would change. Writes use the card's existing serial
queue so the ecoNEXT gateway is not sent concurrent requests.

### Weekly Layout

Use the weekly layout when you want to see the whole programme at once. Click
a day heading to make it the copy source, or choose it from the **Copy from**
menu. The grid remains horizontally scrollable on small screens.

```yaml
type: custom:econext-schedule-card
schedule_entity_prefix: number.ufh_schedule
title: "Underfloor Heating"
layout: weekly
show_copy_controls: true
weekly_time_label_mode: hour
weekly_cell_label_mode: state_icon
active_label: Day
inactive_label: Night
active_icon: mdi:weather-sunny
inactive_icon: mdi:weather-night
active_color: "#00bcd4"
inactive_color: "#4b5563"
grid_line_color: "#6b7280"
```

Set `weekly_time_label_mode: all` when every half-hour slot needs its own
time label; `hour` keeps the grid more compact by labelling whole hours only.
Set `weekly_cell_label_mode` to `none`, `state`, `icon`, or `state_icon` to
choose the cell content. Labels, icons, colours, and text colours are all
independently configurable.

### Read-only Weekly Grid

Use `editable: false` to make the weekly grid a display-only programme. Copy
controls are also hidden whenever the card is read-only.

```yaml
type: custom:econext-schedule-card
schedule_entity_prefix: number.heatpump_heatpump_schedule
title: "Heat Pump"
layout: weekly
editable: false
weekly_time_label_mode: all
weekly_cell_label_mode: icon
active_icon: mdi:power
inactive_icon: mdi:power-off
active_color: "#f59e0b"
inactive_color: "#64748b"
```

### Heat Pump Schedule (Read-only)
```yaml
type: custom:econext-schedule-card
schedule_entity_prefix: number.heatpump_heatpump_schedule
title: "Heat Pump"
editable: false
```

## Schedule Data Format

The ecoNEXT integration exposes schedules as bitfield number entities:

- Each entity stores a uint32 value (0 to 4,294,967,295)
- Each bit represents one 30-minute time slot
- AM entities cover 00:00-11:30 (24 slots)
- PM entities cover 12:00-23:30 (24 slots)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch for changes
npm run watch
```

## License

MIT
