import { createTheme, type PaletteOptions } from '@mui/material/styles';

import { componentsStyle } from './components';
import { paletteLight, semanticColors } from './palette';
import { typography } from './typography';

export const createMuiTheme = (mode: 'light' = 'light') => {
  const palette: PaletteOptions = {
    mode,
    primary: {
      main: semanticColors.main.default,
      dark: semanticColors.main.hovered,
      light: semanticColors.main.disabled,
      contrastText: semanticColors.misc.default,
    },
    ...paletteLight,
  };

  return createTheme({
    palette,
    typography,
    components: componentsStyle,
  });
};
