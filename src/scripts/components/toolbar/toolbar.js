import './toolbar.scss';
import ToolbarButton from './toolbar-button.js';
import Util from '@services/util.js';

/** Class representing the button bar */
export default class Toolbar {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {boolean} [params.hidden] If true, hide toolbar.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClickButtonPreview] Callback preview button.
   * @param {function} [callbacks.onClickButtonExport] Callback export button.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      buttons: [],
      hidden: false,
      searchbox: true
    }, params);

    this.callbacks = Util.extend({
      onSearchChanged: () => {}
    }, callbacks);

    this.buttons = {};

    // Build DOM
    this.toolBar = document.createElement('div');
    this.toolBar.classList.add('toolbar-tool-bar');
    if (this.params.hidden) {
      this.hide();
    }

    this.buttonsContainer = document.createElement('div');
    this.buttonsContainer.classList.add('toolbar-buttons');
    this.toolBar.appendChild(this.buttonsContainer);

    if (!this.params.buttons.length) {
      this.hide();
      return;
    }

    this.params.buttons.forEach((button) => {
      this.addButton(button);
    });
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.toolBar;
  }

  /**
   * Add button.
   * @param {object} [button] Button parameters.
   */
  addButton(button = {}) {
    if (typeof button.id !== 'string') {
      return; // We need an id at least
    }

    this.buttons[button.id] = new ToolbarButton(
      {
        ...(button.a11y && { a11y: button.a11y }),
        classes: ['toolbar-button', `toolbar-button-${button.id}`],
        ...(typeof button.disabled === 'boolean' && {
          disabled: button.disabled
        }),
        ...(button.active && { active: button.active }),
        ...(button.hidden && { hidden: button.hidden }),
        ...(button.type && { type: button.type }),
        ...(button.pulseStates && { pulseStates: button.pulseStates }),
        ...(button.pulseIndex && { pulseIndex: button.pulseIndex })
      },
      {
        ...(typeof button.onClick === 'function' && {
          onClick: (event, params) => {
            button.onClick(event, params);
          }
        })
      }
    );
    this.buttonsContainer.appendChild(this.buttons[button.id].getDOM());
  }

  /**
   * Set button attributes.
   * @param {string} id Button id.
   * @param {object} attributes HTML attributes to set.
   */
  setButtonAttributes(id = '', attributes = {}) {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    for (let attribute in attributes) {
      this.buttons[id].setAttribute(attribute, attributes[attribute]);
    }
  }

  /**
   * Force button state.
   * @param {string} id Button id.
   * @param {boolean|number} active If true, toggle active, else inactive.
   * @param {boolean} [triggerClick] If false, no button click trigger.
   */
  forceButton(id = '', active, triggerClick = true) {
    if (
      !this.buttons[id] ||
      typeof active !== 'boolean' && typeof active !== 'number'
    ) {
      return; // Button not available or no state set
    }

    this.buttons[id].force(active, triggerClick);
  }

  /**
   * Enable button.
   * @param {string} id Button id.
   */
  enableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].enable();
  }

  /**
   * Disable button.
   * @param {string} id Button id.
   */
  disableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].disable();
  }

  /**
   * Show button.
   * @param {string} id Button id.
   */
  showButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].show();
  }

  /**
   * Hide button.
   * @param {string} id Button id.
   */
  hideButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].hide();
  }

  /**
   * Decloak button.
   * @param {string} id Button id.
   */
  decloakButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].decloak();
  }

  /**
   * Cloak button.
   * @param {string} id Button id.
   */
  cloakButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].cloak();
  }

  /**
   * Determine whether button has focus.
   * @param {string} id Button id.
   * @returns {boolean|undefined} True, if button has focus.
   */
  hasButtonFocus(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    return this.buttons[id].hasFocus();
  }

  /**
   * Focus a button.
   * @param {string} id Button id.
   */
  focus(id = '') {
    if (!this.buttons[id] || this.buttons[id].isCloaked()) {
      return; // Button not available
    }

    this.buttons[id].focus();
  }

  /**
   * Show.
   */
  show() {
    this.toolBar.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.toolBar.classList.add('display-none');
  }
}
