import Timer from '@services/timer.js';
import TimeFormatter from '@services/timeformatter.js';
import Util from '@services/util.js';

import './counter.scss';

/** Class representing the content */
export default class Counter {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onStateChanged] Called when state changed.
   * @param {function} [callbacks.onExpired] Called when timer finished.
   * @param {function} [callbacks.onTick] Called on Timer tick.
   * @param {function} [callbacks.onButtonFullscreenClicked] FS button clicked.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      mode: 'timer',
      timeToCount: 0
    }, params);

    this.callbacks = Util.extend({
      onStateChanged: () => {},
      onExpired: () => {},
      onTick: () => {},
      onButtonFullscreenClicked: () => {}
    }, callbacks);

    this.state = Counter.STATE_RESET;

    const timerCallbacks = {
      onTick: (timeMs) => {
        this.handleTick(timeMs);
      },
      onExpired: () => {
        this.callbacks.onExpired();
      },
      onStateChanged: (state, timeMs) => {
        this.handleStateChanged(state, timeMs);
      }
    };

    if (this.params.mode === 'stopwatch') {
      this.timer = new Timer(
        { interval: 100, mode: 'stopwatch' }, timerCallbacks
      );
    }
    else {
      this.timer = new Timer(
        { interval: 250 }, timerCallbacks
      );
    }

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-timekeeper-counter');

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('h5p-timekeeper-counter-content-wrapper');

    this.content = document.createElement('div');
    this.content.classList.add('h5p-timekeeper-counter-content');
    this.content.setAttribute('role', 'timer');

    const ariaTimer = document.createElement('div');
    ariaTimer.classList.add('h5p-timekeeper-counter-aria-timer');
    ariaTimer.innerText = this.params.dictionary.get('a11y.currentTime');
    this.content.appendChild(ariaTimer);

    this.timerText = document.createElement('div');
    this.timerText.classList.add('h5p-timekeeper-counter-timer-text');
    this.timerText.setAttribute('aria-hidden', true);
    this.content.appendChild(this.timerText);

    contentWrapper.appendChild(this.content);

    if (!this.params.noFullscreen) {
      this.buttonFullscreen = document.createElement('button');
      this.buttonFullscreen.classList.add('h5p-timekeeper-button-fullscreen');
      this.buttonFullscreen.addEventListener('click', () => {
        this.callbacks.onButtonFullscreenClicked();
      });
      this.setFullscreen(false);
      contentWrapper.appendChild(this.buttonFullscreen);
    }

    this.dom.appendChild(contentWrapper);

    if (this.params.timeToCount <= 0 && this.params.mode !== 'stopwatch') {
      this.setCounter(this.params.tooLateText || '0');
    }
    else {
      this.setCounter(TimeFormatter.format(
        this.params.timeToCount * 1000,
        this.params.format,
        this.params.dictionary,
        this.params.mode === 'stopwatch',
        this.params.granularity
      ));
    }
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get current time.
   * @returns {number} Current time.
   */
  getTime() {
    return this.timer.getTime();
  }

  /**
   * Start.
   * @param {number} timeMs Time to count in milliseconds.
   */
  start(timeMs = this.params.timeToCount * 1000) {
    // Adding + 1000, because 'done' is triggered one second too late
    if (timeMs < 0) {
      return;
    }

    if (this.state === Counter.STATE_PAUSED) {
      this.resume();
      return;
    }
    else if (
      this.state === Counter.STATE_RESET ||
      this.state === Counter.STATE_EXPIRED
    ) {
      if (this.params.mode === 'timer') {
        this.timer.start(timeMs);
      }
      else {
        this.timer.start(0);
      }
    }
  }

  /**
   * Stop.
   */
  stop() {
    if (
      this.state === Counter.STATE_RESET ||
      this.state === Counter.STATE_EXPIRED
    ) {
      return;
    }

    this.timer.stop();
  }

  /**
   * Pause.
   */
  pause() {
    if (!this.params.canBePaused ||
      (
        this.state !== Counter.STATE_PLAYED &&
        this.state !== Counter.STATE_RESUMED
      )
    ) {
      return;
    }

    this.timer.pause();
  }

  /**
   * Resume.
   */
  resume() {
    if (this.state !== Counter.STATE_PAUSED) {
      return;
    }
    this.timer.resume();
  }

  /**
   * Reset.
   */
  reset() {
    if (!this.params.canBeReset) {
      return;
    }

    this.isResetting = true;
    this.timer.reset();
    this.isResetting = false;

    this.timeToCount = this.params.timeToCount * 1000;
    this.setCounter(TimeFormatter.format(
      this.params.timeToCount * 1000,
      this.params.format,
      this.params.dictionary,
      this.params.mode === 'stopwatch',
      this.params.granularity
    ));
  }

  /**
   * Set counter.
   * @param {string|object} params Parameters: Plain text or multiple formats.
   * @param {string} params.html HTML to display.
   * @param {string} params.aria ARIA label to use for display.
   */
  setCounter(params) {
    if (typeof params !== 'string' && typeof params !== 'object') {
      return; // Not valid
    }

    if (typeof params === 'string') {
      this.timerText.innerText = params;
      this.content.setAttribute('aria-label', params);
    }
    else {
      if (!params?.html || !params?.aria) {
        return;
      }

      this.timerText.innerHTML = params.html;
      this.content.setAttribute('aria-label', params.aria);
    }
  }

  /**
   * Remove fullscreen button.
   */
  removeFullscreenButton() {
    if (!this.buttonFullscreen) {
      return;
    }

    this.buttonFullscreen.parentNode.removeChild(this.buttonFullscreen);
  }

  /**
   * Set fullscreen title.
   * @param {boolean} state If true, fullscreen entered, else exited.
   */
  setFullscreen(state) {
    if (!this.buttonFullscreen || typeof state !== 'boolean') {
      return;
    }

    const title = state ?
      this.params.dictionary.get('a11y.buttonFullscreenExit') :
      this.params.dictionary.get('a11y.buttonFullscreenEnter');
    this.buttonFullscreen.setAttribute('aria-label', title);
  }

  /**
   * Handle tick of timer.
   * @param {number} timeMs Timer time of change.
   */
  handleTick(timeMs) {
    this.callbacks.onTick(timeMs);

    if (this.params.mode === 'timer') {
      timeMs += 999; // Counting downwards, would update too early
    }

    this.setCounter(TimeFormatter.format(
      timeMs,
      this.params.format,
      this.params.dictionary,
      this.params.mode === 'stopwatch',
      this.params.granularity
    ));
  }

  /**
   * Handle state of timer changed.
   * @param {number} state New state.
   * @param {number} timeMs Timer time of change.
   */
  handleStateChanged(state, timeMs) {
    const oldState = this.state;

    if (state === Timer.STATE_PLAYING) {
      this.state = (this.state === Counter.STATE_RESET) ?
        Counter.STATE_PLAYED :
        Counter.STATE_RESUMED;
    }
    else if (state === Timer.STATE_PAUSED) {
      this.state = Counter.STATE_PAUSED;
    }
    else if (state === Timer.STATE_ENDED) {
      this.state = (!this.isResetting) ?
        Counter.STATE_EXPIRED :
        Counter.STATE_RESET;
    }

    if (this.state !== oldState) {
      this.callbacks.onStateChanged(this.state, timeMs);
    }
  }
}

/** @constant {number} State reset */
Counter.STATE_RESET = 0;

/** @constant {number} State played */
Counter.STATE_PLAYED = 1;

/** @constant {number} State paused */
Counter.STATE_PAUSED = 2;

/** @constant {number} State resumed */
Counter.STATE_RESUMED = 3;

/** @constant {number} State completed */
Counter.STATE_EXPIRED = 4;
