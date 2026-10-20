import { css } from 'lit';

export const cardStyles = css`
  :host {
    --cell-height: 40px;
    --cell-gap: 1px;
    --active-color: var(--schedule-active-color, #00bcd4);
    --inactive-color: var(--schedule-inactive-color, #e0e0e0);
    --current-day-color: var(--primary-color, #03a9f4);
    --current-slot-outline: rgba(0, 188, 212, 0.8);
    --border-radius: 3px;
    display: block;
  }

  ha-card {
    padding: 16px;
    height: 100%;
    box-sizing: border-box;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
  }

  .card-header .title {
    font-size: 1.1em;
    font-weight: 500;
    color: var(--primary-text-color);
  }

  /* Day tabs */
  .day-tabs {
    display: flex;
    gap: 2px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    padding-bottom: 8px;
  }

  .day-tab {
    flex: 1;
    padding: 8px 4px;
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    color: var(--secondary-text-color);
    background: none;
    border: none;
    border-radius: var(--border-radius) var(--border-radius) 0 0;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: capitalize;
  }

  .day-tab:hover {
    background-color: var(--secondary-background-color, #f5f5f5);
    color: var(--primary-text-color);
  }

  .day-tab.active {
    color: var(--current-day-color);
    border-bottom: 2px solid var(--current-day-color);
    font-weight: 600;
  }

  .day-tab.current-day {
    color: var(--current-day-color);
  }

  .day-tab.current-day::after {
    content: '';
    display: block;
    width: 4px;
    height: 4px;
    background-color: var(--current-day-color);
    border-radius: 50%;
    margin: 4px auto 0;
  }

  .day-tab.active.current-day::after {
    display: none;
  }

  /* Copy controls */
  .copy-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px;
  }

  .copy-label {
    color: var(--secondary-text-color);
    font-size: 13px;
    margin-right: 2px;
  }

  .copy-source {
    min-height: 32px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font: inherit;
    font-size: 13px;
    padding: 0 8px;
  }

  .copy-button {
    appearance: none;
    border: 0;
    border-radius: 8px;
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    line-height: 32px;
    min-height: 32px;
    padding: 0 12px;
  }

  .copy-button:hover {
    filter: brightness(1.08);
  }

  .copy-button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  /* Schedule row container */
  .schedule-container {
    width: 100%;
  }

  /* Weekly layout */
  .weekly-grid-wrapper {
    max-height: 520px;
    overflow: auto;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: var(--border-radius);
  }

  .weekly-grid {
    display: grid;
    grid-template-columns: 54px repeat(7, minmax(40px, 1fr));
    min-width: 520px;
  }

  .weekly-time-header,
  .weekly-day-header,
  .weekly-time-label,
  .weekly-cell {
    box-sizing: border-box;
    border-right: 1px solid var(--weekly-grid-line-color);
    border-bottom: 1px solid var(--weekly-grid-line-color);
  }

  .weekly-time-header,
  .weekly-day-header {
    position: sticky;
    top: 0;
    z-index: 2;
    min-height: 36px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font-size: 11px;
    font-weight: 600;
    text-align: center;
  }

  .weekly-time-header {
    display: grid;
    place-items: center;
    color: var(--secondary-text-color);
  }

  .weekly-day-header {
    border-top: 0;
    border-left: 0;
    border-radius: 0;
    cursor: pointer;
  }

  .weekly-day-header.copy-source {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.22);
  }

  .weekly-day-header.current-day:not(.copy-source) {
    background: color-mix(in srgb, var(--primary-color) 18%, var(--card-background-color));
    color: var(--primary-color);
  }

  .weekly-time-label {
    min-height: 18px;
    padding-right: 6px;
    color: var(--secondary-text-color);
    font-size: 9px;
    line-height: 18px;
    text-align: right;
  }

  .weekly-cell {
    min-height: 22px;
    appearance: none;
    border-top: 0;
    border-left: 0;
    cursor: pointer;
    font: inherit;
    font-size: 9px;
    font-weight: 600;
    line-height: 20px;
    overflow: hidden;
    padding: 0 2px;
    text-align: center;
    text-transform: uppercase;
  }

  .weekly-cell ha-icon {
    --mdc-icon-size: 14px;
    display: inline-block;
    height: 14px;
    vertical-align: middle;
    width: 14px;
  }

  .weekly-cell-content {
    align-items: center;
    display: inline-flex;
    gap: 3px;
    justify-content: center;
    max-width: 100%;
    white-space: nowrap;
  }

  .weekly-cell-content ha-icon {
    flex: 0 0 auto;
  }

  .weekly-cell:hover:not(:disabled) {
    filter: brightness(0.9);
  }

  .weekly-cell:disabled {
    cursor: default;
  }

  .weekly-cell.current-slot {
    outline: 2px solid var(--current-slot-outline);
    outline-offset: -2px;
    position: relative;
    z-index: 1;
  }

  .schedule-row-wrapper {
    width: 100%;
  }

  /* Schedule cells row */
  .schedule-row {
    display: flex;
    gap: var(--cell-gap);
    width: 100%;
  }

  .schedule-cell {
    flex: 1;
    min-width: 0;
    height: var(--cell-height);
    border-radius: var(--border-radius);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    cursor: pointer;
  }

  .schedule-cell.active {
    background-color: var(--active-color);
  }

  .schedule-cell.inactive {
    background-color: var(--inactive-color);
  }

  .schedule-cell:hover {
    transform: scaleY(1.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 10;
    position: relative;
  }

  .schedule-cell.current-slot {
    outline: 2px solid var(--current-slot-outline);
    outline-offset: -1px;
  }

  .schedule-cell.readonly {
    cursor: default;
  }

  .schedule-cell.readonly:hover {
    transform: none;
    box-shadow: none;
  }

  /* Time labels below schedule */
  .time-labels {
    display: flex;
    gap: var(--cell-gap);
    margin-top: 6px;
    width: 100%;
  }

  .time-label {
    flex: 1;
    min-width: 0;
    font-size: 10px;
    color: var(--secondary-text-color);
    text-align: center;
    overflow: hidden;
  }

  /* Hide labels when cells are too narrow */
  @container (max-width: 500px) {
    .time-label:nth-child(odd) {
      visibility: hidden;
    }
  }

  /* Warning/error states */
  .warning {
    padding: 16px;
    color: var(--error-color, #db4437);
    text-align: center;
  }

  .error-banner {
    padding: 8px 12px;
    margin-bottom: 12px;
    background-color: var(--error-color, #db4437);
    color: #fff;
    border-radius: var(--border-radius);
    font-size: 13px;
    text-align: center;
    animation: fade-in 0.2s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .day-tab.error {
    color: var(--error-color, #db4437);
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    :host {
      --cell-height: 32px;
    }

    .day-tab {
      font-size: 11px;
      padding: 6px 2px;
    }

    .copy-controls {
      gap: 6px;
    }

    .copy-label {
      margin-left: 0;
    }

    .copy-source {
      flex: 1 1 auto;
    }

    .copy-button {
      flex: 1 1 30%;
      padding: 0 8px;
    }

    .weekly-grid {
      grid-template-columns: 48px repeat(7, minmax(36px, 1fr));
      min-width: 470px;
    }

    .weekly-time-label,
    .weekly-cell {
      min-height: 20px;
    }

    .weekly-time-label {
      line-height: 20px;
      font-size: 8px;
    }

    .time-label {
      font-size: 9px;
    }

    ha-card {
      padding: 12px;
    }
  }

  @media (max-width: 400px) {
    :host {
      --cell-height: 28px;
    }

    .day-tab {
      font-size: 10px;
    }

    .time-label {
      font-size: 8px;
    }
  }
`;
