import { createTheme, type PaletteOptions } from '@mui/material/styles';

import { componentsStyle } from './components';
import {
  gradients,
  paletteDark,
  paletteLight,
  semanticColors,
} from './palette';
import { typography } from './typography';

export const createMuiTheme = (mode: 'light' | 'dark' = 'light') => {
  const themeOption = mode === 'dark' ? paletteDark : paletteLight;

  const palette: PaletteOptions = {
    mode,
    primary: {
      main: semanticColors.main.default,
      dark: semanticColors.main.hovered,
      light: semanticColors.main.disabled,
      contrastText: semanticColors.misc.default,
    },
    secondary: {
      main: semanticColors.info.default,
      dark: semanticColors.info.hovered,
      light: semanticColors.info.disabled,
      contrastText: semanticColors.misc.default,
    },
    success: {
      main: semanticColors.success.default,
      dark: semanticColors.success.hovered,
      light: semanticColors.success.light,
      contrastText: semanticColors.misc.default,
    },
    warning: {
      main: semanticColors.warning.default,
      dark: semanticColors.warning.hovered,
      light: semanticColors.warning.disabled,
      contrastText: semanticColors.misc.default,
    },
    error: {
      main: semanticColors.error.default,
      dark: semanticColors.error.hovered,
      light: semanticColors.error.disabled,
      contrastText: semanticColors.misc.default,
    },
    info: {
      main: semanticColors.info.default,
      dark: semanticColors.info.hovered,
      light: semanticColors.info.disabled,
      contrastText: semanticColors.misc.default,
    },
    ...themeOption,
    gradients,
  };

  return createTheme({
    palette,
    typography,
    components: componentsStyle,
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1440,
        xxl: 1680,
        xxxl: 1920,
      },
    },
  });
};
