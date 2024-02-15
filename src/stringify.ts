/**
 * This file contains the functions stringify.
 *
 * @file stringify.ts
 * @author Luca Liguori
 * @date 2023-07-23
 * @version 1.4.1
 *
 * All rights reserved.
 *
*/

export function payloadStringify(payload: object): string {
  return stringify(payload, false, 0, 0, 0, 0, 0, 0, '"', '"');
}

export function colorStringify(payload: object): string {
  return stringify(payload, true, 255, 255, 35, 220, 159, 1);
}

export function historyStringify(payload: object): string {
  return stringify(payload, true, 0, 208, 247, 247, 247, 247);
}

export function mqttStringify(payload: object): string {
  return stringify(payload, true, 69, 247);
}

export function debugStringify(payload: object): string {
  return stringify(payload, true, 247, 247);
}

export function stringify(payload: object, enableColors = false, colorPayload = 255, colorKey = 255, colorString = 35, colorNumber = 220,
  colorBoolean = 159, colorUndefined = 1, keyQuote = '', stringQuote = '\''): string {
  const clr = (color: number) => {
    return enableColors ? `\x1b[38;5;${color}m` : '';
  };
  const reset = () => {
    return enableColors ? '\x1b[0m' : '';
  };
  const isArray = Array.isArray(payload);
  let string = `${reset()}${clr(colorPayload)}` + (isArray ? '[ ' : '{ ');
  Object.entries(payload).forEach(([key, value], index) => {
    if (index > 0) {
      string += ', ';
    }
    let newValue = '';
    newValue = value;
    //console.log(typeof newValue, key, value);
    if (value === null) {
      newValue = `${clr(colorUndefined)}null${reset()}`;
    } else if (typeof newValue === 'string') {
      newValue = `${clr(colorString)}${stringQuote}${newValue}${stringQuote}${reset()}`;
    } else if (typeof newValue === 'number') {
      newValue = `${clr(colorNumber)}${newValue}${reset()}`;
    } else if (typeof newValue === 'boolean') {
      newValue = `${clr(colorBoolean)}${newValue}${reset()}`;
    } else if (typeof newValue === 'undefined') {
      newValue = `${clr(colorUndefined)}undefined${reset()}`;
    } else if (typeof newValue === 'object') {
      if (Object.keys(newValue).length < 100) {
        newValue = stringify(newValue, enableColors, colorPayload, colorKey, colorString, colorNumber, colorBoolean, colorUndefined, keyQuote, stringQuote);
      } else {
        newValue = '{...}';
      }
    } else if (typeof newValue === 'bigint') {
      newValue = `${clr(colorNumber + 1)}${newValue}${reset()}`;
    } else {
      throw new Error('Stringify unknown type');
    }
    if (isArray) {
      string += `${newValue}`;
    } else {
      string += `${clr(colorKey)}${keyQuote}${key}${keyQuote}${reset()}: ${newValue}`;
    }
  });
  return string += ` ${clr(colorPayload)}` + (isArray ? ']' : '}') + `${reset()}`;
}

