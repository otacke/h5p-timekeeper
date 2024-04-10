import Util from '@services/util.js';
import Dictionary from '@services/dictionary.js';
import TimeFormatter from '@services/timeformatter.js';
import Counter from '@components/counter.js';
import Toolbar from '@components/toolbar/toolbar.js';
import Laptracker from '@components/laptracker.js';
import '@styles/h5p-timekeeper.scss';

export default class Timekeeper extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    // Sanitize parameters
    this.params = Util.extend({
      mode: 'endtime',
      datetimeGroup: {
        endtime: new Date(Date.now() + 60)
      },
      startTimeGroup: {
        startTime: 60,
        autostart: true,
        canBePaused: false,
        canBeReset: false
      },
      timeFormat: 'verbose',
      granularity: 'seconds',
      l10n: {
        unitDays: 'd',
        unitHours: 'h',
        unitMinutes: 'm',
        unitSeconds: 's',
        lap: 'Lap',
        lapTime: 'Lap time',
        totalTime: 'Total time'
      },
      a11y: {
        play: 'Start timer',
        pause: 'Pause timer',
        resume: 'Resume timer',
        lap: 'Track a lap',
        reset: 'Reset timer',
        playStopwatch: 'Start stopwatch',
        resumeStopwatch: 'Resume stopwatch',
        pauseStopwatch: 'Pause stopwatch',
        resetStopwatch: 'Reset stopwatch',
        lapTable: 'Lap times',
        currentTime: 'Current time:',
        day: 'day',
        days: 'days',
        hour: 'hour',
        hours: 'hours',
        minute: 'minute',
        minutes: 'minutes',
        second: 'second',
        seconds: 'seconds',
        tenth: 'tenth of a second',
        tenths: 'tenths of a second',
        buttonFullscreenEnter: 'Enter fullscreen mode',
        buttonFullscreenExit: 'Exit fullscreen mode',
        buttonAudioActive: 'Mute audio. Currently unmuted.',
        buttonAudioInactive: 'Unmute audio. Currently muted.',
      }
    }, params);

    this.contentId = contentId;
    this.extras = extras;

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    // Should fullscreen be possible?
    this.noFullscreen = !this.isRoot() || !H5P.fullscreenSupported;

    this.state = Timekeeper.STATE_RESET;

    /*
     * Audio signal when finished
     * Using WebAudio API, because iOS doesn't preload on cellular connections
     */
    if (this.params?.signal?.[0]?.path || this.params?.music?.[0]?.path) {
      this.audioContext = new AudioContext();

      if (this.params.signal?.[0]?.path) {
        this.finishedSignal = document.createElement('audio');
        this.finishedSignal.src = H5P.getPath(
          this.params.signal[0].path, this.contentId
        );

        const track = this.audioContext
          .createMediaElementSource(this.finishedSignal);
        track.connect(this.audioContext.destination);
      }

      if (this.params.music?.[0]?.path) {
        this.backgroundMusic = document.createElement('audio');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.src = H5P.getPath(
          this.params.music[0].path, this.contentId
        );

        const track = this.audioContext
          .createMediaElementSource(this.backgroundMusic);
        track.connect(this.audioContext.destination);
      }
    }

    // Create counter, toolbar and laptracker as needed
    this.createComponents();

    this.dom = this.buildDOM();

    if (!this.noFullscreen) {
      this.on('enterFullScreen', () => {
        this.component.setFullscreen(true);
      });

      this.on('exitFullScreen', () => {
        this.component.setFullscreen(false);
      });
    }
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    this.container = $wrapper.get(0);
    this.container.classList.add('h5p-timekeeper');
    this.container.appendChild(this.dom);
  }

  /**
   * Build main DOM.
   * @returns {HTMLElement} Main DOM.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5p-timekeeper-main');

    // Optional introduction
    if (this.params.introduction) {
      this.introduction = document.createElement('div');
      this.introduction.classList.add('h5p-timekeeper-introduction');

      const content = document.createElement('div');
      content.classList.add('h5p-timekeeper-intro-content');
      content.innerHTML = this.params.introduction;
      this.introduction.appendChild(content);

      dom.appendChild(this.introduction);
    }

    dom.appendChild(this.component.getDOM());

    if (this.toolbar) {
      dom.appendChild(this.toolbar.getDOM());
    }

    if (this.laptracker) {
      dom.appendChild(this.laptracker.getDOM());
    }

    if (this.finishedSignal) {
      dom.appendChild(this.finishedSignal);
    }

    if (this.backgroundMusic) {
      dom.appendChild(this.backgroundMusic);
    }

    // iOS is behind ... Again ...
    const callback = window.requestIdleCallback ?
      window.requestIdleCallback :
      window.requestAnimationFrame;

    callback(() => {
      // Only start once visible to the user
      this.observer = new IntersectionObserver((entries) => {
        if (entries[0].intersectionRatio > 0) {
          this.observer.unobserve(dom); // Only need instantiate once.
          if (this.isRoot()) {
            // trigger xAPI attempted
            this.setActivityStarted();
          }

          if (this.autostart) {
            this.component.start();
          }

          this.trigger('resize');
        }
      }, {
        root: document.documentElement,
        threshold: 0
      });
      this.observer.observe(dom);
    });

    return dom;
  }

  /**
   * Set state.
   * @param {number} state State: STATE_ENDED|STATE_PLAYING|STATE_PAUSED.
   * @param {number} timeMs Time that the state was changed at.
   */
  triggerTimerState(state, timeMs) {
    if (state === Counter.STATE_RESET) {
      this.triggerXAPITimerEvent('reset', timeMs);
    }
    else if (state === Counter.STATE_PLAYED) {
      this.triggerXAPITimerEvent('started', timeMs);
    }
    else if (state === Counter.STATE_PAUSED) {
      this.triggerXAPITimerEvent('paused', timeMs);
    }
    else if (state === Counter.STATE_RESUMED) {
      this.triggerXAPITimerEvent('resumed', timeMs);
    }
    else if (state === Counter.STATE_EXPIRED) {
      this.triggerXAPITimerEvent('stopped', timeMs);
    }
  }

  /**
   * Handle timer state changed.
   * @param {number} state State: STATE_ENDED|STATE_PLAYING|STATE_PAUSED.
   * @param {number} timeMs Time that the state was changed at.
   */
  handleStateChanged(state, timeMs) {
    this.triggerTimerState(state, timeMs);

    if (!this.toolbar) {
      return; // No toolbar to update
    }

    if (
      state === Counter.STATE_PLAYED ||
      state === Counter.STATE_RESUMED
    ) {
      if (
        this.params.startTimeGroup.canBePaused ||
        this.params.mode === 'stopwatch'
      ) {
        this.toolbar.showButton('pause');
        if (this.toolbar.hasButtonFocus('play')) {
          this.toolbar.focus('pause');
        }
        this.toolbar.hideButton('play');
      }
      else {
        this.toolbar.disableButton('play');
      }

      if (this.params.mode === 'stopwatch') {
        this.toolbar.enableButton('lap');
      }
    }
    else if (
      state === Counter.STATE_PAUSED ||
      state === Counter.STATE_EXPIRED ||
      state === Counter.STATE_RESET
    ) {
      this.toolbar.showButton('play');
      if (this.toolbar.hasButtonFocus('pause')) {
        this.toolbar.focus('play');
      }
      this.toolbar.hideButton('pause');

      if (this.params.mode === 'stopwatch') {
        this.toolbar.disableButton('lap');
      }
    }
  }

  /**
   * Toggle background music.
   * @param {boolean} musicShouldPlay True to play, false to pause.
   */
  toggleMusic(musicShouldPlay) {
    if (!this.backgroundMusic) {
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    musicShouldPlay = typeof state === 'boolean' ?
      musicShouldPlay :
      !this.isMusicPlaying;

    if (!musicShouldPlay && this.isMusicPlaying) {
      this.backgroundMusic.pause();
      this.isMusicPlaying = false;
    }
    else if (musicShouldPlay && !this.isMusicPlaying) {
      const playPromise = this.backgroundMusic.play();
      // play() is asynchronous and may fail if user didn't interact
      playPromise?.then(() => {
        this.isMusicPlaying = true;
      }).catch(() => {
        this.isMusicPlaying = false;
      });
    }
  }

  /**
   * Handle timer finished
   */
  handleFinished() {
    if (this.finishedText) {
      this.component.setCounter(this.finishedText);
    }

    this.toolbar?.disableButton('play');
    this.toolbar?.forceButton('music', 0, false);
    this.backgroundMusic?.pause();
    this.toolbar?.disableButton('music');

    if (this.finishedSignal) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const playPromise = this.finishedSignal.play();
      // play() is asynchronous and may fail if user didn't interact
      playPromise?.then(() => {}).catch(() => {});
    }

    this.triggerXAPIEvent('completed');

    this.trigger('resize');
  }

  /**
   * Handle tick from timer.
   * @param {number} timeMs Time the timer is at in milliseconds.
   */
  handleTick(timeMs) {
    this.laptracker?.updateLap(timeMs);
  }

  /**
   * Handle user click on play.
   */
  handleClickPlay() {
    this.component.start();
  }

  /**
   * Handle user click on pause.
   */
  handleClickPause() {
    this.component.pause();
  }

  /**
   * Handle user click on lap.
   */
  handleClickLap() {
    if (!this.laptracker) {
      return;
    }

    const timeMs = this.component.getTime();

    this.triggerXAPITimerEvent('tracked', timeMs);
    this.laptracker.addLap(timeMs);
  }

  /**
   * Handle user click on reset.
   */
  handleClickReset() {
    this.toolbar.enableButton('play');
    this.toolbar?.enableButton('music');
    this.toolbar?.forceButton('music', 0, false);
    this.component.reset();

    this.laptracker?.reset();

    if (this.autostart) {
      this.component.start();
    }

    if (this.finishedSignal) {
      this.finishedSignal.pause();
      this.finishedSignal.currentTime = 0;
    }

    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }

  /**
   * Handle fullscreen button clicked.
   */
  handleFullscreenClicked() {
    setTimeout(() => {
      this.toggleFullscreen();
    }, 300); // Some devices don't register user gesture before call to to requestFullscreen
  }

  /**
   * Toggle fullscreen button.
   * @param {string|boolean} state enter|false for enter, exit|true for exit.
   */
  toggleFullscreen(state) {
    if (!this.container) {
      return;
    }

    if (typeof state === 'string') {
      if (state === 'enter') {
        state = false;
      }
      else if (state === 'exit') {
        state = true;
      }
    }

    if (typeof state !== 'boolean') {
      state = !H5P.isFullscreen;
    }

    if (state) {
      H5P.fullScreen(H5P.jQuery(this.container), this);
    }
    else {
      H5P.exitFullScreen();
    }
  }

  /**
   * Remove fullscreen button.
   */
  removeFullscreenButton() {
    if (this.component) { // Not yet instantiated
      this.noFullscreen = true;
      return;
    }

    this.component.removeFullscreenButton();
  }

  /**
   * Get task title.
   * @returns {string} Title.
   */
  getTitle() {
    return H5P.createTitle(
      this.extras?.metadata?.title || Timekeeper.DEFAULT_DESCRIPTION
    );
  }

  /**
   * Get description.
   * @returns {string} Description.
   */
  getDescription() {
    return Timekeeper.DEFAULT_DESCRIPTION;
  }

  /**
   * Trigger xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   */
  triggerXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEvent(verb);
    this.trigger(xAPIEvent);
  }

  /**
   * Trigger xAPI event with custom verb/extension URI
   * @param {string} verb Short id of the verb we want to trigger.
   * @param {number} timeMs Time in milliseconds.
   */
  triggerXAPITimerEvent(verb, timeMs) {
    const xAPIEvent = this.createXAPIEvent({});
    this.setXAPITimerVerb(xAPIEvent, verb);

    if (typeof timeMs === 'number') {
      this.setXAPITimeExtension(xAPIEvent, timeMs);
    }

    this.trigger(xAPIEvent);
  }

  /**
   * Create an xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   * @returns {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);

    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getXAPIDefinition());

    /* Score of 1 is stupid but workaround for task completion in moodle */
    if (verb === 'completed') {
      xAPIEvent.data.statement.result = Util.extend(
        {
          completion: true,
          score: {
            max: 1,
            min: 0,
            raw: 1,
            scaled: 1.0
          }
        },
        xAPIEvent.data.statement.result || {}
      );
    }

    return xAPIEvent;
  }

  /**
   * Add time extension to xAPI definition.
   * @param {H5P.XAPIEvent} xAPIEvent to set definition for.
   * @param {number} timeMs Time in milliseconds.
   */
  setXAPITimeExtension(xAPIEvent, timeMs) {
    if (timeMs < 0) {
      return; // Time not valid
    }

    const statement = xAPIEvent?.data?.statement;
    if (!statement) {
      return; // No statement found
    }

    statement.object = statement.object || {};
    statement.object.definition = statement.object.definition || {};
    statement.object.definition.extensions =
      statement.object.definition.extensions || {};

    statement.object.definition.extensions[
      'http://id.tincanapi.com/extension/time'
    ] = TimeFormatter.toISO8601TimePeriod(timeMs);
  }

  /**
   * Set verb for timer.
   * @param {H5P.XAPIEvent} xAPIEvent to set definition for.
   * @param {string} verb Verb to set.
   */
  setXAPITimerVerb(xAPIEvent, verb) {
    if (typeof verb !== 'string') {
      return; // No verb
    }

    const statement = xAPIEvent?.data?.statement;
    if (!statement) {
      return; // No statement found
    }
    statement.verb = {
      'id': `https://w3id.org/xapi/dod-isd/verbs/${verb}`,
      'display': { 'en-US': verb }
    };
  }

  /**
   * Get the xAPI definition for the xAPI object.
   * @returns {object} XAPI definition.
   */
  getXAPIDefinition() {
    const definition = {};

    definition.name = {};
    definition.name[this.languageTag] = this.getTitle();
    // Fallback for h5p-php-reporting, expects en-US
    definition.name['en-US'] = definition.name[this.languageTag];

    definition.description = {};
    definition.description[this.languageTag] = Util.stripHTML(this.getDescription());
    // Fallback for h5p-php-reporting, expects en-US
    definition.description['en-US'] = definition.description[this.languageTag];

    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'other';

    return definition;
  }

  /**
   * Create components
   */
  createComponents() {
    const buttons = this.buildButtons();

    // Create components
    if (this.params.mode === 'endtime') {
      this.autostart = true;
      this.finishedText = this.params.datetimeGroup.finishedText;

      this.component = new Counter(
        {
          dictionary: this.dictionary,
          canBePaused: false,
          canBeReset: false,
          timeToCount: (
            new Date(this.params.datetimeGroup.endtime) - new Date()
          ) / 1000,
          finishedText: this.params.datetimeGroup.finishedText,
          tooLateText: this.params.datetimeGroup.tooLateText,
          format: this.params.timeFormat,
          noFullscreen: this.noFullscreen,
          granularity: this.params.granularity
        },
        {
          onStateChanged: (state, timeMs) => {
            this.handleStateChanged(state, timeMs);
          },
          onExpired: () => {
            this.handleFinished();
          },
          onButtonFullscreenClicked: () => {
            this.handleFullscreenClicked();
          }
        }
      );

      const toolbarButtons = [];
      if (this.backgroundMusic) {
        toolbarButtons.push(buttons['music']);
      }

      this.toolbar = new Toolbar({
        buttons: toolbarButtons
      });
    }
    else if (this.params.mode === 'starttime') {
      this.autostart = this.params.startTimeGroup.autostart;
      this.finishedText = this.params.startTimeGroup.finishedText;

      this.component = new Counter(
        {
          dictionary: this.dictionary,
          canBePaused: this.params.startTimeGroup.canBePaused,
          canBeReset: this.params.startTimeGroup.canBeReset,
          timeToCount: this.params.startTimeGroup.startTime,
          finishedText: this.params.startTimeGroup.finishedText,
          format: this.params.timeFormat,
          noFullscreen: this.noFullscreen,
          granularity: this.params.granularity
        },
        {
          onStateChanged: (state, timeMs) => {
            this.handleStateChanged(state, timeMs);
          },
          onExpired: () => {
            this.handleFinished();
          },
          onButtonFullscreenClicked: () => {
            this.handleFullscreenClicked();
          }
        }
      );

      const toolbarButtons = [];
      if (!this.autostart || this.params.startTimeGroup.canBePaused) {
        toolbarButtons.push(buttons['play']);
      }
      if (this.params.startTimeGroup.canBePaused) {
        toolbarButtons.push(buttons['pause']);
      }
      if (this.params.startTimeGroup.canBeReset) {
        toolbarButtons.push(buttons['reset']);
      }
      if (this.backgroundMusic) {
        toolbarButtons.push(buttons['music']);
      }

      this.toolbar = new Toolbar({
        buttons: toolbarButtons
      });
    }
    else {
      this.component = new Counter(
        {
          dictionary: this.dictionary,
          canBePaused: true,
          canBeReset: true,
          mode: 'stopwatch',
          format: 'stopwatch',
          noFullscreen: this.noFullscreen,
          granularity: this.params.granularity
        },
        {
          onStateChanged: (state, timeMs) => {
            this.handleStateChanged(state, timeMs);
          },
          onTick: (time) => {
            this.handleTick(time);
          },
          onButtonFullscreenClicked: () => {
            this.handleFullscreenClicked();
          }
        }
      );

      // Toolbar
      this.toolbar = new Toolbar({
        buttons: [
          buttons['play'],
          buttons['pause'],
          buttons['lap'],
          buttons['reset']
        ]
      });

      // Laptracker
      this.laptracker = new Laptracker(
        {
          dictionary: this.dictionary
        },
        {
          onResize: () => {
            this.trigger('resize');
          }
        }
      );
    }
  }

  /**
   * Build buttons.
   * @returns {object} Buttons to choose from in toolbar
   */
  buildButtons() {
    // Possible buttons for toolbar.
    return ({
      play: {
        a11y: { disabled: this.dictionary.get('a11y.playDisabled') },
        id: 'play',
        type: 'pulse',
        pulseStates: [
          {
            id: 'normal',
            label: (this.params.mode === 'stopwatch') ?
              this.dictionary.get('a11y.playStopwatch') :
              this.dictionary.get('a11y.play')
          }
        ],
        onClick: () => {
          this.handleClickPlay();
        }
      },
      pause: {
        id: 'pause',
        type: 'pulse',
        pulseStates: [
          {
            id: 'normal',
            label: (this.params.mode === 'stopwatch') ?
              this.dictionary.get('a11y.pauseStopwatch') :
              this.dictionary.get('a11y.pause')
          }
        ],
        hidden: true,
        onClick: () => {
          this.handleClickPause();
        }
      },
      lap: {
        a11y: { disabled: this.dictionary.get('a11y.lapDisabled') },
        id: 'lap',
        type: 'pulse',
        pulseStates: [
          { id: 'normal', label: this.dictionary.get('a11y.lap') }
        ],
        disabled: true,
        onClick: () => {
          this.handleClickLap();
        }
      },
      reset: {
        id: 'reset',
        type: 'pulse',
        pulseStates: [
          {
            id: 'normal',
            label: (this.params.mode === 'stopwatch') ?
              this.dictionary.get('a11y.resetStopwatch') :
              this.dictionary.get('a11y.reset')
          }
        ],
        onClick: () => {
          this.handleClickReset();
        }
      },
      music: {
        id: 'music',
        type: 'pulse',
        pulseStates: [
          {
            id: 'muted',
            label: this.dictionary.get('a11y.buttonAudioInactive')
          },
          {
            id: 'playing',
            label: this.dictionary.get('a11y.buttonAudioActive')
          }
        ],
        onClick: () => {
          this.toggleMusic();
        }
      }
    });
  }
}

/** @constant {string} Default description */
Timekeeper.DEFAULT_DESCRIPTION = 'Timekeeper';

/** @constant {number} State reset */
Timekeeper.STATE_RESET = 0;

/** @constant {number} State played */
Timekeeper.STATE_PLAYED = 1;

/** @constant {number} State paused */
Timekeeper.STATE_PAUSED = 2;

/** @constant {number} State resumed */
Timekeeper.STATE_RESUMED = 3;

/** @constant {number} State completed */
Timekeeper.STATE_EXPIRED = 4;
