import { colors } from './colors';

export const paletteLight = {
  textColor: {
    primary: { default: colors.gray800 },
    secondary: { default: colors.gray700 },
  },
  background: {
    default: colors.gray050,
    paper: colors.white,
  },
  button: {
    error: { contained: { active: colors.red300 } },
  },
};

export const semanticColors = {
  main: {
    default: colors.teal500,
    hovered: colors.teal500,
    disabled: colors.teal100,
  },
  misc: {
    default: colors.white,
  },
};
