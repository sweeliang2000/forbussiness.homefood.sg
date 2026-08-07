'use client';

import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';

/**
 * Client boundary for the MUI theme. Everything below this renders with
 * the HomeFood palette and typography instead of MUI's stock Material
 * blue, so the brand doesn't stop at the edge of hand-written CSS.
 */
export default function ThemeRegistry({ children }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
