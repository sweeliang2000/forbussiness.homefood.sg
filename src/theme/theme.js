'use client';

import { createTheme } from '@mui/material/styles';

/**
 * The app previously ran on MUI's stock theme, which meant every button,
 * switch and focus ring rendered in Material blue while the brand is
 * persimmon. This theme is the single place that reconciles the two.
 *
 * Values are deliberately kept in step with the tokens in globals.css —
 * MUI can't read CSS custom properties for things like shadows and
 * spacing maths, so the numbers are mirrored here rather than aliased.
 */

const brand = {
  50: '#FFF4ED',
  100: '#FFE6D5',
  200: '#FFC9AA',
  300: '#FDA474',
  400: '#FB7F45',
  500: '#F96A1B',
  600: '#E4550D',
  700: '#C2410C',
  800: '#9A340B',
};

const label = {
  primary: 'rgba(0, 0, 0, 0.88)',
  secondary: 'rgba(60, 60, 67, 0.6)',
  tertiary: 'rgba(60, 60, 67, 0.38)',
};

const separator = 'rgba(60, 60, 67, 0.13)';

const elevation = {
  1: '0 1px 2px rgba(16, 24, 40, 0.05), 0 0 0 0.5px rgba(16, 24, 40, 0.04)',
  2: '0 1px 2px rgba(16, 24, 40, 0.06), 0 4px 12px rgba(16, 24, 40, 0.05)',
  3: '0 2px 4px rgba(16, 24, 40, 0.05), 0 12px 28px rgba(16, 24, 40, 0.08)',
  4: '0 4px 8px rgba(16, 24, 40, 0.06), 0 24px 56px rgba(16, 24, 40, 0.12)',
  brand: '0 1px 2px rgba(154, 52, 11, 0.16), 0 8px 20px rgba(154, 52, 11, 0.18)',
};

const EASE_STANDARD = 'cubic-bezier(0.32, 0.72, 0, 1)';

const fontStack =
  "'Open Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
const displayStack = "'Raleway', 'Montserrat', 'Lato', 'Ubuntu', Arial, sans-serif";

/**
 * MUI's shadow array is 25 entries of Material-style umbra/penumbra.
 * Those read as printed drop shadows next to the softer, two-part
 * contact-plus-ambient shadows used everywhere else in the app, so the
 * whole ramp is replaced with the elevation scale.
 */
const shadows = [
  'none',
  elevation[1],
  elevation[1],
  elevation[2],
  elevation[2],
  elevation[2],
  elevation[3],
  elevation[3],
  elevation[3],
  elevation[3],
  elevation[3],
  elevation[3],
  elevation[4],
  elevation[4],
  elevation[4],
  elevation[4],
  elevation[4],
  elevation[4],
  elevation[4],
  elevation[4],
  elevation[4],
  elevation[4],
  elevation[4],
  elevation[4],
  elevation[4],
];

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      light: brand[400],
      main: brand[600],
      dark: brand[700],
      contrastText: '#FFFFFF',
    },
    secondary: {
      light: '#3F3F46',
      main: 'rgb(36, 36, 39)',
      dark: '#18181B',
      contrastText: '#FFFFFF',
    },
    error: { main: '#D42020', light: '#FDECEC', dark: '#A81818', contrastText: '#FFFFFF' },
    warning: { main: '#B25000', light: '#FFF6E9', dark: '#8A3E00', contrastText: '#FFFFFF' },
    success: { main: '#248A3D', light: '#E8F6EC', dark: '#1B6B2F', contrastText: '#FFFFFF' },
    info: { main: '#0A6CD8', light: '#EAF3FE', dark: '#0857AC', contrastText: '#FFFFFF' },
    text: {
      primary: label.primary,
      secondary: label.secondary,
      disabled: label.tertiary,
    },
    divider: separator,
    background: {
      default: '#F2F2F7',
      paper: '#FFFFFF',
    },
    action: {
      hover: 'rgba(120, 120, 128, 0.08)',
      selected: 'rgba(228, 85, 13, 0.10)',
      disabledBackground: 'rgba(120, 120, 128, 0.12)',
      disabled: label.tertiary,
      focus: 'rgba(228, 85, 13, 0.20)',
    },
  },

  shape: {
    borderRadius: 12,
  },

  shadows,

  /**
   * Tracking is size-specific throughout: display sizes get negative
   * tracking so the letters don't drift apart, small sizes get a touch
   * of positive tracking so they stay readable.
   */
  typography: {
    fontFamily: fontStack,
    h1: {
      fontFamily: displayStack,
      fontSize: '2.125rem',
      fontWeight: 700,
      letterSpacing: '-0.021em',
      lineHeight: 1.09,
    },
    h2: {
      fontFamily: displayStack,
      fontSize: '1.75rem',
      fontWeight: 700,
      letterSpacing: '-0.018em',
      lineHeight: 1.14,
    },
    h3: {
      fontFamily: displayStack,
      fontSize: '1.375rem',
      fontWeight: 600,
      letterSpacing: '-0.014em',
      lineHeight: 1.22,
    },
    h4: {
      fontFamily: displayStack,
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h5: {
      fontFamily: displayStack,
      fontSize: '1.0625rem',
      fontWeight: 600,
      letterSpacing: '-0.006em',
      lineHeight: 1.35,
    },
    h6: {
      fontFamily: displayStack,
      fontSize: '0.9375rem',
      fontWeight: 600,
      letterSpacing: '0em',
      lineHeight: 1.47,
    },
    subtitle1: {
      fontSize: '1.0625rem',
      fontWeight: 600,
      letterSpacing: '-0.006em',
      lineHeight: 1.35,
    },
    subtitle2: {
      fontSize: '0.9375rem',
      fontWeight: 600,
      letterSpacing: '0em',
      lineHeight: 1.47,
    },
    body1: {
      fontSize: '1rem',
      letterSpacing: '-0.002em',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.9375rem',
      letterSpacing: '0em',
      lineHeight: 1.47,
    },
    button: {
      fontSize: '0.9375rem',
      fontWeight: 600,
      letterSpacing: '0em',
      // Shouting at people in ALL CAPS is MUI's default, not a choice.
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      letterSpacing: '0.008em',
      lineHeight: 1.35,
    },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.06em',
      lineHeight: 1.3,
      textTransform: 'uppercase',
    },
  },

  components: {
    /* ---------------------------------------------------------------
       Buttons. Feedback lands on pointer-down, not on release — the
       moment a control waits for `click` to acknowledge you, it stops
       feeling direct.
       --------------------------------------------------------------- */
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 18,
          minHeight: 40,
          fontWeight: 600,
          transition: `transform 100ms ${EASE_STANDARD}, background-color 200ms ${EASE_STANDARD}, box-shadow 200ms ${EASE_STANDARD}, border-color 200ms ${EASE_STANDARD}`,
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          '&:active': {
            transform: 'scale(0.975)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'background-color 120ms linear',
            '&:active': { transform: 'none' },
          },
        },
        sizeSmall: {
          minHeight: 32,
          paddingInline: 14,
          fontSize: '0.875rem',
          borderRadius: 9,
        },
        sizeLarge: {
          minHeight: 48,
          paddingInline: 24,
          fontSize: '1rem',
          borderRadius: 12,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          backgroundColor: brand[600],
          '&:hover': { backgroundColor: brand[700] },
          '&:active': { backgroundColor: brand[800] },
        },
        outlined: {
          borderColor: 'rgba(60, 60, 67, 0.22)',
          color: label.primary,
          '&:hover': {
            borderColor: 'rgba(60, 60, 67, 0.34)',
            backgroundColor: 'rgba(120, 120, 128, 0.06)',
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(228, 85, 13, 0.35)',
          color: brand[700],
          '&:hover': {
            borderColor: brand[600],
            backgroundColor: 'rgba(228, 85, 13, 0.06)',
          },
        },
        /* The neutral `color` set on `outlined` above applies to every
           outlined button, so each semantic colour has to reclaim its
           own label — otherwise a destructive action reads as neutral. */
        outlinedError: {
          color: '#D42020',
          borderColor: 'rgba(212, 32, 32, 0.32)',
          '&:hover': {
            borderColor: '#D42020',
            backgroundColor: 'rgba(212, 32, 32, 0.06)',
          },
        },
        outlinedSuccess: {
          color: '#1B6B2F',
          borderColor: 'rgba(36, 138, 61, 0.32)',
          '&:hover': {
            borderColor: '#248A3D',
            backgroundColor: 'rgba(36, 138, 61, 0.06)',
          },
        },
        outlinedWarning: {
          color: '#8A3E00',
          borderColor: 'rgba(178, 80, 0, 0.32)',
          '&:hover': {
            borderColor: '#B25000',
            backgroundColor: 'rgba(178, 80, 0, 0.06)',
          },
        },
        outlinedInfo: {
          color: '#0857AC',
          borderColor: 'rgba(10, 108, 216, 0.32)',
          '&:hover': {
            borderColor: '#0A6CD8',
            backgroundColor: 'rgba(10, 108, 216, 0.06)',
          },
        },
        text: {
          '&:hover': { backgroundColor: 'rgba(120, 120, 128, 0.08)' },
        },
        textPrimary: {
          color: brand[700],
          '&:hover': { backgroundColor: 'rgba(228, 85, 13, 0.08)' },
        },
      },
    },

    MuiIconButton: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: `transform 100ms ${EASE_STANDARD}, background-color 200ms ${EASE_STANDARD}`,
          WebkitTapHighlightColor: 'transparent',
          '&:hover': { backgroundColor: 'rgba(120, 120, 128, 0.1)' },
          '&:active': { transform: 'scale(0.92)' },
          '@media (prefers-reduced-motion: reduce)': {
            '&:active': { transform: 'none' },
          },
        },
      },
    },

    MuiLoadingButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
    },

    /* ---------------------------------------------------------------
       Inputs. Rounded, quiet at rest, and unmistakable when focused —
       the focus state uses a thickened brand border rather than a
       colour swap so the field doesn't jump size.
       --------------------------------------------------------------- */
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          transition: `box-shadow 200ms ${EASE_STANDARD}`,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(60, 60, 67, 0.2)',
            transition: `border-color 200ms ${EASE_STANDARD}`,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(60, 60, 67, 0.34)',
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 4px rgba(228, 85, 13, 0.14)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 1.5,
            borderColor: brand[600],
          },
          '&.Mui-disabled': {
            backgroundColor: 'rgba(120, 120, 128, 0.06)',
          },
        },
        input: {
          fontSize: '1rem',
          '&::placeholder': { color: label.tertiary, opacity: 1 },
          /* A disabled field is reporting what's stored, not inviting
             input. An example like "Fresh Market Cafe" sitting in a
             greyed-out box reads as a real value the user isn't allowed
             to touch, so a field they can't edit shows nothing at all. */
          '&.Mui-disabled::placeholder': { opacity: 0 },
        },
      },
    },

    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: 'rgba(120, 120, 128, 0.1)',
          '&::before, &::after': { display: 'none' },
          '&:hover': { backgroundColor: 'rgba(120, 120, 128, 0.14)' },
          '&.Mui-focused': {
            backgroundColor: '#FFFFFF',
            boxShadow: `0 0 0 1.5px ${brand[600]}, 0 0 0 5px rgba(228, 85, 13, 0.14)`,
          },
        },
      },
    },

    MuiInput: {
      styleOverrides: {
        root: {
          '&::before': { borderBottomColor: 'rgba(60, 60, 67, 0.22)' },
          '&:hover:not(.Mui-disabled)::before': {
            borderBottomColor: 'rgba(60, 60, 67, 0.4)',
          },
          '&::after': { borderBottomColor: brand[600] },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: label.secondary,
          '&.Mui-focused': { color: brand[700] },
        },
      },
    },

    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          letterSpacing: '0.005em',
          marginLeft: 2,
        },
      },
    },

    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },

    /* ---------------------------------------------------------------
       Surfaces. Dialogs are modal tasks, so they get the deepest
       elevation plus a dimming scrim; menus are lighter, transient
       layers anchored to whatever opened them.
       --------------------------------------------------------------- */
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 16 },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: elevation[4],
        },
      },
    },

    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.32)',
          backdropFilter: 'blur(3px)',
          '@media (prefers-reduced-transparency: reduce)': {
            backdropFilter: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: displayStack,
          fontSize: '1.375rem',
          fontWeight: 700,
          letterSpacing: '-0.014em',
          lineHeight: 1.22,
          padding: '24px 24px 8px',
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: { root: { padding: '8px 24px' } },
    },

    MuiDialogActions: {
      styleOverrides: { root: { padding: '16px 24px 20px', gap: 8 } },
    },

    MuiMenu: {
      defaultProps: {
        // A menu should grow out of the control that opened it, not
        // materialise in the middle of nowhere.
        transformOrigin: { vertical: 'top', horizontal: 'left' },
      },
      styleOverrides: {
        paper: {
          borderRadius: 14,
          boxShadow: elevation[3],
          border: `0.5px solid ${separator}`,
          marginTop: 6,
        },
        list: { padding: 6 },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 38,
          fontSize: '0.9375rem',
          '&:hover': { backgroundColor: 'rgba(120, 120, 128, 0.1)' },
          '&.Mui-selected': {
            backgroundColor: 'rgba(228, 85, 13, 0.1)',
            '&:hover': { backgroundColor: 'rgba(228, 85, 13, 0.14)' },
          },
        },
      },
    },

    MuiPopover: {
      styleOverrides: {
        paper: { borderRadius: 14, boxShadow: elevation[3] },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(28, 28, 30, 0.92)',
          backdropFilter: 'blur(12px)',
          borderRadius: 8,
          fontSize: '0.8125rem',
          padding: '7px 10px',
          letterSpacing: '0.005em',
        },
        arrow: { color: 'rgba(28, 28, 30, 0.92)' },
      },
    },

    /* ---------------------------------------------------------------
       Feedback. Alerts are tinted rather than saturated so a page with
       several of them still has a clear focal point.
       --------------------------------------------------------------- */
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontSize: '0.9375rem',
          letterSpacing: '0em',
          alignItems: 'center',
          border: '1px solid transparent',
        },
        standardSuccess: {
          backgroundColor: '#E8F6EC',
          borderColor: '#B7E3C3',
          color: '#186B2C',
        },
        standardWarning: {
          backgroundColor: '#FFF6E9',
          borderColor: '#FBDBA7',
          color: '#8A3E00',
        },
        standardError: {
          backgroundColor: '#FDECEC',
          borderColor: '#F5C2C2',
          color: '#A81818',
        },
        standardInfo: {
          backgroundColor: '#EAF3FE',
          borderColor: '#BBD9F7',
          color: '#0857AC',
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.8125rem',
          height: 26,
        },
        outlined: { borderColor: 'rgba(60, 60, 67, 0.2)' },
      },
    },

    /* iOS-style switch: a physical track with a shadowed thumb that
       slides, rather than Material's floating puck. */
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 51,
          height: 31,
          padding: 0,
          overflow: 'visible',
        },
        switchBase: {
          padding: 2,
          transitionDuration: '260ms',
          '&.Mui-checked': {
            transform: 'translateX(20px)',
            color: '#FFFFFF',
            '& + .MuiSwitch-track': {
              backgroundColor: brand[600],
              opacity: 1,
            },
          },
          '&.Mui-disabled + .MuiSwitch-track': { opacity: 0.4 },
        },
        thumb: {
          width: 27,
          height: 27,
          boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.16)',
          backgroundColor: '#FFFFFF',
        },
        track: {
          borderRadius: 999,
          backgroundColor: 'rgba(120, 120, 128, 0.28)',
          opacity: 1,
          transition: `background-color 260ms ${EASE_STANDARD}`,
        },
        /*
          The root above pins an explicit 51x31, which silently killed
          `size="small"` everywhere it was used — the dense sold-out
          toggles in the terminal and menu builder were all rendering at
          full size. Small gets its own proportions back.
        */
        sizeSmall: {
          width: 40,
          height: 24,
          '& .MuiSwitch-switchBase': {
            padding: 2,
            '&.Mui-checked': { transform: 'translateX(16px)' },
          },
          '& .MuiSwitch-thumb': {
            width: 20,
            height: 20,
          },
        },
      },
    },

    /*
      MUI pulls this row 11px to the left to compensate for the padding
      its own controls carry, and leaves the gap between control and
      label to that padding too. The iOS-style switch above has no
      padding, so the label ended up flush against the track and the
      whole row hung outside the card's content edge. Setting the offset
      and the gap explicitly puts both back on the grid — checkboxes and
      radios keep a smaller gap because they still have inner padding.
    */
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          marginLeft: 0,
          marginRight: 16,
          gap: 12,
          '&:has(.MuiCheckbox-root), &:has(.MuiRadio-root)': {
            gap: 2,
            marginLeft: -9,
          },
        },
        label: {
          fontSize: '0.9375rem',
          letterSpacing: '0em',
          lineHeight: 1.47,
        },
      },
    },

    MuiCheckbox: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: { color: 'rgba(60, 60, 67, 0.38)' },
      },
    },

    MuiRadio: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: { color: 'rgba(60, 60, 67, 0.38)' },
      },
    },

    /*
      Segmented control: a recessed grey track with the selected segment
      raised out of it as a white pill. Tinting the selected segment
      instead reads as "highlighted", not as "this one is on top" — the
      lift is what makes the choice obvious at a glance.
    */
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 9,
          border: 'none',
          paddingInline: 16,
          color: label.secondary,
          transition: `background-color 200ms ${EASE_STANDARD}, color 200ms ${EASE_STANDARD}, box-shadow 200ms ${EASE_STANDARD}`,
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.5)' },
          '&.Mui-selected': {
            backgroundColor: '#FFFFFF',
            color: brand[700],
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.12), 0 0 0 0.5px rgba(16, 24, 40, 0.04)',
            '&:hover': { backgroundColor: '#FFFFFF' },
          },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        },
      },
    },

    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(120, 120, 128, 0.1)',
          borderRadius: 11,
          padding: 2,
          gap: 2,
        },
        grouped: {
          border: 'none !important',
          borderRadius: '9px !important',
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 42 },
        indicator: {
          height: 2.5,
          borderRadius: 2,
          backgroundColor: brand[600],
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9375rem',
          minHeight: 42,
          color: label.secondary,
          '&.Mui-selected': { color: brand[700] },
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 6,
          backgroundColor: 'rgba(120, 120, 128, 0.16)',
        },
        bar: { borderRadius: 999 },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: separator,
          fontSize: '0.9375rem',
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          fontSize: '0.8125rem',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          color: label.secondary,
          backgroundColor: 'rgba(120, 120, 128, 0.05)',
        },
      },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: separator } },
    },

    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(120, 120, 128, 0.12)' },
      },
    },

    MuiCircularProgress: {
      styleOverrides: { root: { color: brand[600] } },
    },

    MuiSlider: {
      styleOverrides: {
        thumb: {
          width: 22,
          height: 22,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 2px 6px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.06)',
          '&:hover, &.Mui-focusVisible': {
            boxShadow: '0 2px 6px rgba(0,0,0,0.18), 0 0 0 8px rgba(228, 85, 13, 0.14)',
          },
        },
        rail: { backgroundColor: 'rgba(120, 120, 128, 0.26)', opacity: 1 },
      },
    },

    MuiBreadcrumbs: {
      styleOverrides: {
        separator: { marginInline: 6, color: label.tertiary },
      },
    },
  },
});

export default theme;
