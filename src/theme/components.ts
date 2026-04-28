import type { CssVarsThemeOptions, Theme } from '@mui/material';

import { fontWeight } from './typography';

export const componentsStyle = {
  MuiInputBase: {
    styleOverrides: {
      root: {
        lineHeight: '24px',
        letterSpacing: '0.15px',
      },
    },
  },
  MuiDialog: {
    defaultProps: {
      fullWidth: true,
      maxWidth: 'md',
    },
    styleOverrides: {
      paper: {
        maxHeight: 'calc(100dvh - 64px)',
        overflowY: 'auto',
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '16px 16px',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        borderRadius: '8px',
        fontWeight: 500,
      },
      sizeLarge: {
        padding: '12px 24px',
        fontSize: '16px',
        width: '100px',
        height: '40px',
      },
      sizeMedium: {
        padding: '6px 8px',
        fontSize: '14px',
        fontWeight: fontWeight.medium,
        height: '24px',
        letterSpacing: '0.4px',
        textTransform: 'uppercase',
      },
      sizeSmall: {
        padding: '6px 12px',
        fontSize: '14px',
        height: '32px',
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
        '&:disabled': {
          background: '#F6F8FB80',
        },
      },
      outlined: {
        borderWidth: '1px',
        '&:hover': {
          borderWidth: '1px',
        },
      },
      text: {
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
      },
    },
    variants: [
      {
        props: { color: 'error' },
        style: {
          '&.MuiButton-contained': {
            backgroundColor: (theme: Theme) => theme.palette.primary.main,
            '&:hover': {
              backgroundColor: (theme: Theme) => theme.palette.primary.dark,
            },
            '&:active': {
              backgroundColor: (theme: Theme) =>
                theme.palette.button.error.contained.active,
            },
          },
        },
      },
    ],
  },
} satisfies CssVarsThemeOptions['components'];
