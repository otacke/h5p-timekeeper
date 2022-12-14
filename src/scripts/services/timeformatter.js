import Dictionary from './dictionary';
import Util from './util';

export default class TimeFormatter {
  /**
   * Convert milliseconds to other time units.
   *
   * @param {number} milliSeconds Milliseconds.
   * @returns {object} The milliseconds in other time units.
   */
  static convert(milliSeconds) {
    const tenthsTotal = Math.floor(milliSeconds / 100);
    const secondsTotal = Math.floor(milliSeconds / 1000);
    const minutesTotal = Math.floor(secondsTotal / 60);
    const hoursTotal = Math.floor(minutesTotal / 60);

    const tenths = tenthsTotal % 10;
    const seconds = secondsTotal % 60;
    const minutes = minutesTotal % 60;
    const hours = hoursTotal % 24;
    const days = Math.floor(hoursTotal / 24);

    const daysAsHours = days * 24 + hours;

    return {
      d: days, h: hours, m: minutes, s: seconds, t: tenths,
      ht: hoursTotal, mt: minutesTotal, st: secondsTotal, tt: tenthsTotal,
      dh: daysAsHours
    };
  }

  /**
   * Format a time to an (HTML) string.
   *
   * At some point, having a general formatter might be nice ... For now, three
   * hardcoded formats are enough.
   *
   * @param {number} timeMs Time in milliseconds.
   * @param {string} format Name of the format requested.
   * @param {boolean} [ariaWithTenths=false] If true, add tenths to aria text.
   * @returns {object} Time as (HTML) string and plain verbose aria string.
   */
  static format(timeMs, format, ariaWithTenths = false) {
    const elements = TimeFormatter.convert(timeMs);

    let segments = [];
    if (format === 'stopwatch') {
      segments = [
        '<span class="h5p-timekeeper-format-element h5p-timekeeper-format-stopwatch">',
        `<span class="h5p-timekeeper-format-value">${elements.dh}</span>`,
        '<span class="h5p-timekeeper-format-delimiter">:</span>',
        '</span>',
        '<span class="h5p-timekeeper-format-element h5p-timekeeper-format-stopwatch">',
        `<span class="h5p-timekeeper-format-value">${elements.m.toString().padStart(2, '0')}</span>`,
        '<span class="h5p-timekeeper-format-delimiter">:</span>',
        '</span>',
        '<span class="h5p-timekeeper-format-element h5p-timekeeper-format-stopwatch">',
        `<span class="h5p-timekeeper-format-value">${elements.s.toString().padStart(2, '0')}</span>`,
        '<span class="h5p-timekeeper-format-delimiter">.</span>',
        '</span>',
        '<span class="h5p-timekeeper-format-element h5p-timekeeper-format-stopwatch">',
        `<span class="h5p-timekeeper-format-value">${elements.t}</span>`,
        '</span>'
      ];
    }
    else if (format === 'timecode') {
      if (elements.h !== 0) {
        segments.push('<span class="h5p-timekeeper-format-element h5p-timekeeper-format-timecode">');
        segments.push(`<span class="h5p-timekeeper-format-value">${elements.dh}</span>`);
        segments.push('<span class="h5p-timekeeper-format-delimiter">:</span>');
        segments.push('</span>');
      }

      if (elements.m !== 0 || segments.length > 0) {
        segments.push('<span class="h5p-timekeeper-format-element h5p-timekeeper-format-timecode">');
        segments.push(`<span class="h5p-timekeeper-format-value">${elements.m.toString().padStart(2, '0')}</span>`);
        segments.push('<span class="h5p-timekeeper-format-delimiter">:</span>');
        segments.push('</span>');
      }

      if (elements.length === 0) {
        segments.push('<span class="h5p-timekeeper-format-element h5p-timekeeper-format-timecode">');
        segments.push(`<span class="h5p-timekeeper-format-value">${elements.s}</span>`);
        segments.push('</span>');
      }
      else {
        segments.push('<span class="h5p-timekeeper-format-element h5p-timekeeper-format-timecode">');
        segments.push(`<span class="h5p-timekeeper-format-value">${elements.s.toString().padStart(2, '0')}</span>`);
        segments.push('</span>');
      }
    }
    else if (format === 'verbose') {
      if (elements.d !== 0) {
        segments.push('<div class="h5p-timekeeper-format-element h5p-timekeeper-format-verbose">');
        segments.push(`<span class="h5p-timekeeper-format-value">${elements.d}</span>`);
        segments.push(`<span class="h5p-timekeeper-format-unit">${Dictionary.get('l10n.unitDays')}</span>`);
        segments.push('</div>');
      }

      if (elements.h !== 0 || segments.length > 0) {
        segments.push('<div class="h5p-timekeeper-format-element h5p-timekeeper-format-verbose">');
        segments.push(`<span class="h5p-timekeeper-format-value">${elements.h}</span>`);
        segments.push(`<span class="h5p-timekeeper-format-unit">${Dictionary.get('l10n.unitHours')}</span>`);
        segments.push('</div>');
      }

      if (elements.m !== 0 || segments.length > 0) {
        segments.push('<div class="h5p-timekeeper-format-element h5p-timekeeper-format-verbose">');
        segments.push(`<span class="h5p-timekeeper-format-value">${elements.m}</span>`);
        segments.push(`<span class="h5p-timekeeper-format-unit">${Dictionary.get('l10n.unitMinutes')}</span>`);
        segments.push('</div>');
      }

      segments.push('<div class="h5p-timekeeper-format-element h5p-timekeeper-format-verbose">');
      segments.push(`<span class="h5p-timekeeper-format-value">${elements.s}</span>`);
      segments.push(`<span class="h5p-timekeeper-format-unit">${Dictionary.get('l10n.unitSeconds')}</span>`);
      segments.push('</div>');
    }

    const ariaSegments = [];
    if (elements.d !== 0) {
      const unit = (elements.d === 1) ?
        Dictionary.get('a11y.day') :
        Dictionary.get('a11y.days');
      ariaSegments.push(`${elements.d} ${unit}`);
    }
    if (elements.h !== 0) {
      const unit = (elements.h === 1) ?
        Dictionary.get('a11y.hour') :
        Dictionary.get('a11y.hours');
      ariaSegments.push(`${elements.h} ${unit}`);
    }
    if (elements.m !== 0) {
      const unit = (elements.m === 1) ?
        Dictionary.get('a11y.minute') :
        Dictionary.get('a11y.minutes');
      ariaSegments.push(`${elements.m} ${unit}`);
    }
    const unit = (elements.s === 1) ?
      Dictionary.get('a11y.second') :
      Dictionary.get('a11y.seconds');
    ariaSegments.push(`${elements.s} ${unit}`);

    if (ariaWithTenths) {
      const unit = (elements.t === 1) ?
        Dictionary.get('a11y.tenth') :
        Dictionary.get('a11y.tenths');
      ariaSegments.push(`${elements.t} ${unit}`);
    }

    const html = segments.join('');

    return {
      html: html,
      text: Util.stripHTML(html),
      aria: ariaSegments.join(', ')
    };
  }

  /**
   * Convert seconds to ISO 8601 time period.
   *
   * @param {number} timeMs Time in milliseconds >= 0.
   * @returns {string|null} ISO 8601 time period or null.
   */
  static toISO8601TimePeriod(timeMs) {
    if (typeof timeMs !== 'number' || timeMs < 0) {
      return null;
    }

    const segments = [];

    let hours = Math.floor(timeMs / 3600000);
    let minutes = Math.floor((timeMs - hours * 3600000) / 60000);
    let seconds = Math.floor((timeMs - hours * 3600000 - minutes * 60000) / 1000);
    let milliseconds = timeMs - hours * 3600000 - minutes * 60000 - seconds * 1000;

    if (hours > 0) {
      if (hours < 10) {
        hours = `0${hours}`;
      }
      segments.push(`${hours}H`);
    }

    if (minutes > 0 || minutes === 0 && hours > 0) {
      if (minutes < 10) {
        minutes = `0${minutes}`;
      }
      segments.push(`${minutes}M`);
    }

    if (seconds < 10) {
      seconds = `0${seconds}`;
    }
    segments.push(`${seconds}.${milliseconds}S`);

    return `PT${segments.join('')}`;
  }
}
