import { ITheme } from 'xterm';

/**
 * VSCode doesn't expose the raw string for specific theme color.
 * this is awkward. have to hard-code.
 */
const theme: ITheme = {
  foreground: '#b9bfca',
  background: '#272c33',
  cursor: '#c7c7c7',
  cursorAccent: '#feffff',
  selection: '#6f7683',
  black: '#272c33',
  red: '#e78287',
  green: '#a7cb8b',
  yellow: '#daaa78',
  blue: '#71bdf2',
  magenta: '#d190e3',
  cyan: '#65c1cd',
  white: '#b9bfca',
  brightBlack: '#6f7683',
  brightRed: '#e78287',
  brightGreen: '#a7cb8b',
  brightYellow: '#daaa78',
  brightBlue: '#71bdf2',
  brightMagenta: '#d190e3',
  brightCyan: '#65c1cd',
  brightWhite: '#fefefe',
};

export default theme;
