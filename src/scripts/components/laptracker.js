import TimeFormatter from '@services/timeformatter.js';
import Util from '@services/util.js';
import './laptracker.scss';

/** Class keeping track of laps */
export default class Laptracker {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onResize] Callback for resize needed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onResize: () => {}
    }, callbacks);

    this.laps = [];

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-timekeeper-laptracker');

    const table = document.createElement('table');
    table.classList.add('h5p-timekeeper-laptracker-table');

    const caption = document.createElement('caption');
    caption.classList.add('h5p-timekeeper-laptracker-table-caption');
    caption.innerText = this.params.dictionary.get('a11y.lapTable');
    table.appendChild(caption);

    this.tablehead = document.createElement('thead');
    this.tablehead.classList.add('h5p-timekeeper-laptracker-table-head');

    const th1 = document.createElement('th');
    th1.classList.add('h5p-timekeeper-laptracker-table-head-lap');
    th1.innerHTML = this.params.dictionary.get('l10n.lap');
    this.tablehead.appendChild(th1);

    const th2 = document.createElement('th');
    th2.classList.add('h5p-timekeeper-laptracker-table-head-time');
    th2.innerHTML = this.params.dictionary.get('l10n.lapTime');
    this.tablehead.appendChild(th2);

    const th3 = document.createElement('th');
    th3.classList.add('h5p-timekeeper-laptracker-table-head-total');
    th3.innerHTML = this.params.dictionary.get('l10n.totalTime');
    this.tablehead.appendChild(th3);

    table.appendChild(this.tablehead);

    this.dom.appendChild(table);

    this.hide();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Hide lap tracker.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Show lap tracker.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Reset lap tracker.
   */
  reset() {
    this.laps = [];

    this.hide();

    // Remove all entries in table
    while (this.tablehead.nextElementSibling) {
      this.tablehead.nextElementSibling.remove();
    }
  }

  /**
   * Add a lap to display.
   * @param {number} totalTime Total time in milliseconds.
   */
  addLap(totalTime) {
    const lapTime = (!this.laps.length) ?
      totalTime :
      totalTime - this.laps[this.laps.length - 1].lapTime;

    this.laps.push({ lapTime: lapTime, totalTime: totalTime });

    if (this.laps.length === 1) {
      this.previousEntry = this.buildLapEntry(this.laps.length, lapTime, totalTime);
      this.tablehead.after(this.previousEntry.row);
      this.show();
    }

    this.previousEntry.tdLapTimeText.removeAttribute('role');
    this.previousEntry.tdTotalTimeText.removeAttribute('role');

    this.currentLapEntry = this.buildLapEntry(this.laps.length + 1, lapTime, totalTime);
    this.tablehead.after(this.currentLapEntry.row);

    this.previousEntry = this.currentLapEntry;

    this.callbacks.onResize();
  }

  /**
   * Update current lap in progress.
   * @param {number} totalTime Total time in milliseconds.
   */
  updateLap(totalTime) {
    if (!this.laps.length) {
      return;
    }

    const lapTime = (!this.laps.length) ?
      totalTime :
      totalTime - this.laps[this.laps.length - 1].lapTime;

    this.currentLapEntry.tdLapTimeText.innerText =
      TimeFormatter.format(
        lapTime, 'stopwatch', this.params.dictionary, true
      ).text;

    this.currentLapEntry.tdTotalTimeText.innerText =
      TimeFormatter.format(
        totalTime, 'stopwatch', this.params.dictionary, true
      ).text;
  }

  /**
   * Build lap entry containing lap number, lap time and total time.
   * @param {number} lap Lap number.
   * @param {number} lapTime Lap time in milliseconds.
   * @param {number} totalTime Total time in milliseconds.
   * @returns {object} Multiple relevant DOM elements.
   */
  buildLapEntry(lap, lapTime, totalTime) {
    const row = document.createElement('tr');
    row.classList.add('h5p-timekeeper-laptracker-table-row');

    const tdLap = document.createElement('td');
    tdLap.classList.add('h5p-timekeeper-laptracker-table-column-lap');
    tdLap.innerText = lap;
    row.appendChild(tdLap);

    const tdLapTime = document.createElement('td');
    tdLapTime.classList.add('h5p-timekeeper-laptracker-table-column-time');
    row.appendChild(tdLapTime);

    const tdLapTimeText = document.createElement('span');
    tdLapTimeText.classList.add('h5p-timekeeper-laptracker-table-column-time-text');
    tdLapTimeText.setAttribute('role', 'timer');
    tdLapTimeText.innerText = TimeFormatter.format(
      lapTime, 'stopwatch', this.params.dictionary, true
    ).text;
    tdLapTime.appendChild(tdLapTimeText);

    const tdTotalTime = document.createElement('td');
    tdTotalTime.classList.add('h5p-timekeeper-laptracker-table-column-total');
    row.appendChild(tdTotalTime);

    const tdTotalTimeText = document.createElement('span');
    tdTotalTimeText.classList.add('h5p-timekeeper-laptracker-table-column-time-text');
    tdTotalTimeText.setAttribute('role', 'timer');
    tdTotalTimeText.innerText = TimeFormatter.format(
      totalTime, 'stopwatch', this.params.dictionary, true
    ).text;
    tdTotalTime.appendChild(tdTotalTimeText);

    return { row, tdLap, tdLapTime, tdTotalTime, tdLapTimeText, tdTotalTimeText };
  }
}
