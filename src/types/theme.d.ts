import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    textColor: {
      primary: { default: string };
      secondary: { default: string };
    };
    button: {
      error: { contained: { active: string } };
    };
  }

  export interface PaletteOptions {
    textColor?: {
      primary?: { default?: string };
      secondary?: { default?: string };
    };
  }

  interface BreakpointOverrides {
    xs: true;
    sm: true;
    md: true;
    lg: true;
    xl: true;
    xxl: true;
    xxxl: true;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    body2: true;
    body3: true;
  }
}
