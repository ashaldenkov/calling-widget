import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    gradients: {
      green: string;
      blue: string;
      darkBlue: string;
      yellowRed: string;
      peachPink: string;
      skyPurple: string;
      pinkPurple: string;
      magentaViolet: string;
      limeGreen: string;
      grayBlack: string;
    };
    background: {
      primary: {
        default: string;
      };
    };
    textColor: {
      primary: {
        default: string;
        hovered: string;
        selected: string;
        disabled: string;
      };
      secondary: {
        default: string;
        hovered: string;
        selected: string;
        disabled: string;
      };
      tertiary: {
        default: string;
        hovered: string;
        selected: string;
        disabled: string;
      };
      quaternary: {
        default: string;
        hovered: string;
        selected: string;
        disabled: string;
      };
    };
    border: {
      default: string;
      box: string;
      textField: string;
      error: string;
    };
    shadow: {
      default: string;
      messageBubble: string;
    };
    disabled: {
      default: string;
    };
    button: {
      error: {
        contained: {
          active: string;
        };
      };
      warning: {
        contained: {
          active: string;
        };
      };
      info: {
        contained: {
          active: string;
        };
      };
      success: {
        contained: {
          active: string;
        };
      };
      primary: {
        contained: {
          active: string;
        };
      };
      secondary: {
        contained: {
          active: string;
        };
      };
      default: string;
      hovered: string;
      selected: string;
      whatsapp: {
        trash: string;
        file: string;
      };
      telegram: {
        trash: string;
        file: string;
      };
    };
    main: {
      default: string;
      hovered: string;
      selected: string;
      disabled: string;
    };
    chat: {
      lightGreen: string;
      lightBeige: string;
      overlayGray: string;
      whatsapp: {
        background: string;
        inputBackground: string;
        inputText: string;
        sendButton: string;
        border: string;
        icon: string;
        reply: string;
      };
      telegram: {
        icon: string;
        reply: string;
      };
    };
  }

  export interface PaletteOptions {
    textColor?: {
      primary?: {
        default?: string;
        hovered?: string;
        selected?: string;
        disabled?: string;
      };
      secondary?: {
        default?: string;
        hovered?: string;
        selected?: string;
        disabled?: string;
      };
      tertiary?: {
        default?: string;
        hovered?: string;
        selected?: string;
        disabled?: string;
      };
    };
    gradients?: {
      green?: string;
      blue?: string;
      darkBlue?: string;
      yellowRed?: string;
      peachPink?: string;
      skyPurple?: string;
      pinkPurple?: string;
      magentaViolet?: string;
      limeGreen?: string;
      grayBlack?: string;
    };
    border: {
      default: string;
      textField: string;
      error: string;
    };
    shadow?: {
      default?: string;
      messageBubble?: string;
    };
    disabled: {
      default: string;
    };
    main?: {
      default?: string;
      hovered?: string;
      selected?: string;
      disabled?: string;
    };
    chat?: {
      lightGreen?: string;
      lightBeige?: string;
      overlayGray?: string;
      whatsapp?: {
        background?: string;
        inputBackground?: string;
        inputText?: string;
        sendButton?: string;
        border?: string;
        icon?: string;
        reply?: string;
      };
      telegram: {
        icon?: string;
        reply?: string;
      };
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
    bodyLargeRegular: true;
    bodyMediumRegular: true;
    bodyMediumSemi: true;
    bodySmallRegular: true;
    bodySmallMedium: true;
    overline: true;
    subtitle: true;
    subtitleRegular: true;
    subtitleMedium: true;
    button: true;
    body2: true;
    body3: true;
    body4: true;
  }
}
