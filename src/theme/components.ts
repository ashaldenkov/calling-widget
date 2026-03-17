import type { CssVarsThemeOptions, Theme } from '@mui/material';

import { fontWeight } from './typography';

export const componentsStyle = {
  MuiCssBaseline: {
    styleOverrides: {
      html: {
        height: '100%',
        overflow: 'hidden',
      },
      body: {
        height: '100%',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
      },
      '#root': {
        height: '100%',
        overflow: 'hidden',
      },
      main: {
        height: '100%',
        overflow: 'hidden',
      },
      '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0, 0, 0, 0.3) transparent',
      },
      '::-webkit-scrollbar': {
        width: '7px',
        height: '7px',
      },
      '::-webkit-scrollbar-thumb': {
        background: '#BDBDBD',
        borderRadius: '100px',
      },
      '@keyframes progressGlow': {
        '0%': { left: '-100%' },
        '100%': { left: '100%' },
      },
    },
  },
  MuiAppBar: {
    defaultProps: {
      position: 'fixed',
      elevation: 0,
    },
    styleOverrides: {
      positionFixed: ({ theme }) => ({
        backgroundColor: theme.palette.gradients.green,
      }),
    },
  },
  MuiAutocomplete: {
    styleOverrides: {
      root: ({ theme }) => ({
        '& .MuiOutlinedInput-root': { padding: '0.5px' },
        '& .MuiFormLabel-root': {
          top: '-8px',
          color: theme.palette.text.primary,
        },
      }),
      paper: {
        maxHeight: 'min(56vh, 560px)',
        overflowY: 'auto',
      },
    },
  },
  MuiListItemText: {
    styleOverrides: {
      primary: ({ theme }) => theme.typography.body2,
    },
  },
  MuiList: {
    styleOverrides: {
      root: {
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '7px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#BDBDBD',
          borderRadius: '100px',
        },
      },
    },
  },
  MuiToolbar: {
    defaultProps: {
      disableGutters: true,
      variant: 'dense',
    },
    styleOverrides: {
      root: {
        minHeight: 64,
      },
    },
  },
  MuiInputBase: {
    styleOverrides: {
      root: {
        lineHeight: '24px',
        letterSpacing: '0.15px',
      },
    },
  },
  MuiTypography: {
    styleOverrides: {
      button: {
        fontSize: '13px',
        lineHeight: '22px',
        letterSpacing: '0.46px',
        fontWeight: fontWeight.medium,
        textTransform: 'none',
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      head: ({ theme }) => ({
        backgroundColor: theme.palette.background?.default || '#FBFCFD',
        lineHeight: '20px',
        letterSpacing: '0.25px',
        color: theme.palette.textColor?.secondary?.default || '#768194',
        fontWeight: fontWeight.regular,
        fontSize: '14px',
        padding: '16px',
      }),
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
  MuiDialogContent: {
    styleOverrides: {
      root: {
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
        padding: '16px 24px',
        '.MuiDialogTitle-root + &': {
          paddingTop: '16px',
        },
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
  MuiMenu: {
    styleOverrides: {
      paper: {
        maxHeight: 'min(56vh, 560px)',
        overflowY: 'auto',
      },
      list: {
        maxHeight: 'min(56vh, 560px)',
        overflowY: 'auto',
      },
    },
  },
  MuiPopover: {
    styleOverrides: {
      paper: {
        maxHeight: 'min(56vh, 560px)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
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
      {
        props: { color: 'secondary' },
        style: {
          '&.MuiButton-text': {
            color: '#768194',
            backgroundColor: (theme: Theme) => theme.palette.text.secondary,
          },
          '&.MuiButton-contained': {
            color: '#22224B',
            background: '#F6F8FB',
          },
        },
      },
    ],
  },
} satisfies CssVarsThemeOptions['components'];
