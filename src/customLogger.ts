/**
 * This file contains the class CustomLogger.
 *
 * @file customLogger.ts
 * @author Luca Liguori
 * @date 2023-06-01
 * @version 1.8.8
 *
 * All rights reserved.
 *
 */

/*
    \x1b[0m - Reset (clear color)
    \x1b[1m - Bold
    \x1b[3m - Italic
    \x1b[4m - Underline
    \x1b[K  - Erase the line from cursor

    \x1b[30m - Black
    \x1b[31m - Red
    \x1b[32m - Green
    \x1b[33m - Yellow
    \x1b[34m - Blue
    \x1b[35m - Magenta
    \x1b[36m - Cyan
    \x1b[37m - White

    \x1b[90-97m - Bright

    \x1b[40m - Black background
    \x1b[41m - Red background
    \x1b[42m - Green background
    \x1b[43m - Yellow background
    \x1b[44m - Blue background
    \x1b[45m - Magenta background
    \x1b[46m - Cyan background
    \x1b[47m - White background

    \x1b[100-107m - Bright background

    \x1b[38;2;255;105;50m // Orange

    RGB foreground
    \x1b[38;2;<R>;<G>;<B>m

    RGB background
    \x1b[48;2;<R>;<G>;<B>m

    256 colors foreground
    \x1b[38;5;<FG COLOR>m

    256 colors background
    \x1b[48;5;<BG COLOR>m
*/
export const RESET = '\x1b[0m';
export const BRIGHT = '\x1b[1m';
export const DIM = '\x1b[2m';
export const UNDERSCORE = '\x1b[4m';
export const BLINK = '\x1b[5m';
export const REVERSE = '\x1b[7m';
export const HIDDEN = '\x1b[8m';

export const BLACK = '\x1b[30m';
export const RED = '\x1b[31m';
export const GREEN = '\x1b[32m';
export const YELLOW = '\x1b[33m';
export const BLUE = '\x1b[34m';
export const MAGENTA = '\x1b[35m';
export const CYAN = '\x1b[36m';
export const LIGHT_GREY = '\x1b[37m';
export const GREY = '\x1b[90m';
export const WHITE = '\x1b[97m';

export const ts = '\x1b[38;5;249m';                 // TimeStamp  White medium
export const ln = '\x1b[38;5;31m';                  // LogName    Cyan
export const s1ln = '\x1b[38;5;255;48;5;31m';       // Highlight  LogName White on Cyan
export const s2ln = '\x1b[38;5;255;48;5;255m';      // Highlight  LogName White on White
export const s3ln = '\x1b[38;5;255;48;5;220m';      // Highlight  LogName White on Yellow
export const s4ln = '\x1b[38;5;255;48;5;9m';        // Highlight  LogName White on Red

export const db = '\x1b[38;5;247m';                 // Debug
export const nf = '\x1b[38;5;255m';                 // Info
export const wr = '\x1b[38;5;220m';                 // Warn
export const er = '\x1b[38;5;9m';                   // Error

export const rs = '\x1b[40;0m';                     // Reset black background
export const rk = '\x1b[K';                         // Erase from cursor

export const dn = '\x1b[38;5;33m';                  // Display name device
export const gn = '\x1b[38;5;35m';                  // Display name group
export const idn = '\x1b[48;5;21m\x1b[38;5;255m';   // Inverted display name device
export const ign = '\x1b[48;5;22m\x1b[38;5;255m';   // Inverted display name group

export const zb = '\x1b[38;5;207m';                 // Zigbee

export const hk = '\x1b[38;5;79m';                  // Homekit

export const pl = '\x1b[32m';                       // payload
export const id = '\x1b[37;44m';                    // id or ieee_address or UUID
export const or = '\x1b[38;2;255;126;00m';          // history

export const enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug'
}

export interface Logger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...data: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (...data: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...data: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...data: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: (level: LogLevel, message: string, ...parameters: any[]) => void;
}

export const enum TimestampFormat {
  ISO,
  LOCAL_DATE,
  LOCAL_TIME,
  LOCAL_DATE_TIME,
  TIME_MILLIS,
  HOMEBRIDGE,
  CUSTOM,
}

export class CustomLogger {
  private logName: string;
  private logTimestampFormat: TimestampFormat;
  private logCustomTimestampFormat: string;
  private hbLog: Logger | undefined;
  private logStartTime: number;
  private logWithColors: boolean;
  private logDebug: boolean;

  constructor(hbLog: Logger | undefined, logName = 'CustomLog', logDebug = true, logWithColors = true,
    logTimestampFormat = TimestampFormat.LOCAL_DATE_TIME, logCustomTimestampFormat = 'yyyy-MM-dd HH:mm:ss') {
    this.hbLog = hbLog;
    this.logName = logName;
    this.logStartTime = 0;
    this.logTimestampFormat = logTimestampFormat;
    this.logCustomTimestampFormat = logCustomTimestampFormat;
    this.logWithColors = logWithColors;
    this.logDebug = logDebug;
  }

  public setLogDebug(logDebug: boolean): void {
    this.logDebug = logDebug;
  }

  public setLogName(name: string): void {
    this.logName = name;
  }

  public setLogTimestampFormat(format: TimestampFormat): void {
    this.logTimestampFormat = format;
  }

  public setLogCustomTimestampFormat(format: string): void {
    this.logCustomTimestampFormat = format;
  }

  public startTimer(message: string): void {
    this.logStartTime = Date.now();
    this.info(`Timer started ${message}`);
  }

  public stopTimer(message: string): void {
    if (this.logStartTime !== 0) {
      const timePassed = Date.now() - this.logStartTime;
      this.info(`Timer stoppped at ${timePassed} ms ${message}`);
    }
    this.logStartTime = 0;
  }

  private getTimestamp(): string {
    if (this.logStartTime !== 0) {
      const timePassed = Date.now() - this.logStartTime;
      return `Timer:    ${timePassed.toString().padStart(7, ' ')} ms`;
    } else {
      let timestamp: string;
      switch (this.logTimestampFormat) {
        case TimestampFormat.LOCAL_DATE:
          timestamp = new Date().toLocaleDateString();
          break;
        case TimestampFormat.LOCAL_TIME:
          timestamp = new Date().toLocaleTimeString();
          break;
        case TimestampFormat.HOMEBRIDGE:
        case TimestampFormat.LOCAL_DATE_TIME:
          timestamp = new Date().toLocaleString();
          break;
        case TimestampFormat.ISO:
          timestamp = new Date().toISOString();
          break;
        case TimestampFormat.TIME_MILLIS:
          // eslint-disable-next-line max-len
          timestamp = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}:${new Date().getSeconds().toString().padStart(2, '0')}.${new Date().getMilliseconds().toString().padStart(3, '0')}`;
          break;
        case TimestampFormat.CUSTOM:
          // timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss'); //TODO
          timestamp = new Date().toLocaleString();
          break;
      }
      return timestamp;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public log(level: LogLevel, message: string, ...parameters: any[]): void {
    if (this.hbLog !== undefined) {
      this.hbLog[level](message, ...parameters);
    } else {
      if (this.logWithColors) {
        let logNameColor = ln;
        if (typeof message !== 'string' || message.startsWith === undefined) {
          logNameColor = ln;
        } else if (message.startsWith('****')) {
          logNameColor = s4ln;
          message = message.slice(4);
        } else if (message.startsWith('***')) {
          logNameColor = s3ln;
          message = message.slice(3);
        } else if (message.startsWith('**')) {
          logNameColor = s2ln;
          message = message.slice(2);
        } else if (message.startsWith('*')) {
          logNameColor = s1ln;
          message = message.slice(1);
        }
        switch (level) {
          case LogLevel.DEBUG:
            if (this.logDebug) {
              // eslint-disable-next-line no-console
              console.log(`${rs}${ts}[${this.getTimestamp()}] ${logNameColor}[${this.logName}]${rs}${db}`, message, ...parameters, rs + rk);
            }
            break;
          case LogLevel.INFO:
            // eslint-disable-next-line no-console
            console.log(`${rs}${ts}[${this.getTimestamp()}] ${logNameColor}[${this.logName}]${rs}${nf}`, message, ...parameters, rs + rk);
            break;
          case LogLevel.WARN:
            // eslint-disable-next-line no-console
            console.log(`${rs}${ts}[${this.getTimestamp()}] ${logNameColor}[${this.logName}]${rs}${wr}`, message, ...parameters, rs + rk);
            break;
          case LogLevel.ERROR:
            // eslint-disable-next-line no-console
            console.log(`${rs}${ts}[${this.getTimestamp()}] ${logNameColor}[${this.logName}]${rs}${er}`, message, ...parameters, rs + rk);
            break;
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(`${rs}[${this.getTimestamp()}] [${this.logName}] [${level}] ${message}`, ...parameters);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public info(message: string, ...parameters: any[]): void {
    this.log(LogLevel.INFO, message, ...parameters);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public warn(message: string, ...parameters: any[]): void {
    this.log(LogLevel.WARN, message, ...parameters);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public error(message: string, ...parameters: any[]): void {
    this.log(LogLevel.ERROR, message, ...parameters);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public debug(message: string, ...parameters: any[]): void {
    if (this.logDebug) {
      this.log(LogLevel.DEBUG, message, ...parameters);
    }
  }
}
