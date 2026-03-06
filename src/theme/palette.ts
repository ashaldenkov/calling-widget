import { colors } from './colors';

export const paletteDark = {
  textColor: {
    primary: {
      default: colors.white95,
      hovered: colors.white,
      selected: colors.white,
      disabled: colors.white30,
    },
    secondary: {
      default: colors.white70,
      hovered: colors.white95,
      selected: colors.white95,
      disabled: colors.white30,
    },
    tertiary: {
      default: colors.white50,
      hovered: colors.white70,
      selected: colors.white70,
      disabled: colors.white30,
    },
    quaternary: {
      default: colors.gray400,
      hovered: colors.gray600,
      selected: colors.gray600,
      disabled: colors.gray200,
    },
  },
  background: {
    default: colors.gray050,
    paper: colors.white,
  },
  border: {
    default: colors.gray800_12,
    box: colors.gray100,
    textField: colors.teal500,
    error: colors.red400,
  },
  shadow: {
    default: colors.shadow100,
    messageBubble: colors.messageBubbleShadow,
    secondary: colors.shadow200,
  },
  button: {
    default: colors.gray800_12,
    hovered: colors.teal100,
    selected: colors.teal050,
    whatsapp: {
      trash: colors.red500,
      file: colors.green290,
    },
    telegram: {
      trash: colors.blue450,
      file: colors.blue450,
    },
  },
  main: {
    default: colors.teal500,
    hovered: colors.teal300,
    selected: colors.teal500,
    disabled: colors.teal100,
  },
  disabled: {
    default: colors.gray010,
  },
  chat: {
    lightGreen: colors.gray975,
    lightBeige: colors.gray980,
    overlayGray: colors.gray985,
    whatsapp: {
      background: colors.gray980,
      inputBackground: colors.gray990,
      inputText: colors.gray450,
      sendButton: colors.green250,
      border: colors.gray995,
      icon: colors.green290,
      reply: colors.blue450,
    },
    telegram: {
      icon: colors.blue450,
      reply: colors.blue450,
    },
  },
};

export const paletteLight = {
  textColor: {
    primary: {
      default: colors.gray800,
      hovered: colors.gray900,
      selected: colors.gray900,
      disabled: colors.gray300,
    },
    secondary: {
      default: colors.gray700,
      hovered: colors.gray800,
      selected: colors.gray800,
      disabled: colors.gray200,
    },
    tertiary: {
      default: colors.gray600,
      hovered: colors.gray700,
      selected: colors.gray700,
      disabled: colors.gray400,
    },
    quaternary: {
      default: colors.gray950,
      hovered: colors.gray600,
      selected: colors.gray600,
      disabled: colors.gray200,
    },
  },
  background: {
    default: colors.gray050,
    paper: colors.white,
  },
  border: {
    default: colors.gray800_12,
    box: colors.gray100,
    textField: colors.teal500,
    error: colors.red400,
  },
  shadow: {
    default: colors.shadow100,
    messageBubble: colors.messageBubbleShadow,
    secondary: colors.shadow200,
  },
  button: {
    default: colors.gray800_12,
    hovered: colors.teal100,
    selected: colors.teal050,
    whatsapp: {
      trash: colors.red500,
      file: colors.green290,
    },
    telegram: {
      trash: colors.blue450,
      file: colors.blue450,
    },
  },
  main: {
    default: colors.teal500,
    hovered: colors.teal300,
    selected: colors.teal500,
    disabled: colors.teal100,
  },
  disabled: {
    default: colors.gray010,
  },
  chat: {
    lightGreen: colors.gray975,
    lightBeige: colors.gray980,
    overlayGray: colors.gray985,
    whatsapp: {
      background: colors.gray980,
      inputBackground: colors.gray990,
      inputText: colors.gray450,
      sendButton: colors.green250,
      border: colors.gray995,
      icon: colors.green290,
      reply: colors.blue450,
    },
    telegram: {
      icon: colors.blue450,
      reply: colors.blue450,
    },
  },
};

export const semanticColors = {
  main: {
    default: colors.teal500,
    hovered: colors.teal500,
    selected: colors.teal300,
    disabled: colors.teal100,
  },
  success: {
    default: colors.green600,
    hovered: colors.green500,
    selected: colors.green400,
    disabled: colors.green100,
    light: colors.green150,
  },
  warning: {
    default: colors.blue400,
    hovered: colors.orange600,
    selected: colors.orange500,
    disabled: colors.blue100,
  },
  info: {
    default: colors.blue600,
    hovered: colors.blue500,
    selected: colors.blue450,
    disabled: colors.blue100,
    main: colors.blue600,
    dark: colors.blue450,
  },
  error: {
    default: colors.red400,
    hovered: colors.red300,
    selected: colors.red200,
    disabled: colors.red50,
  },
  misc: {
    default: colors.white,
  },
  disabled: {
    default: colors.gray010,
  },
};
export const gradients = {
  green: `linear-gradient(135deg, ${colors.teal300} 0%, ${colors.teal500} 100%)`,
  blue: `linear-gradient(135deg, ${colors.blue300} 0%, ${colors.blue500} 100%)`,
  darkBlue: `linear-gradient(128deg, ${colors.darkBlue700} 3.73%, ${colors.darkBlue600} 92.26%)`,
  yellowRed: `linear-gradient(135deg, ${colors.yellow500} 0%, ${colors.red300Alt} 100%)`,
  peachPink: `linear-gradient(135deg, ${colors.peach200} 0%, ${colors.pink400} 100%)`,
  skyPurple: `linear-gradient(135deg, ${colors.cyan300} 0%, ${colors.purple500} 100%)`,
  pinkPurple: `linear-gradient(135deg, ${colors.pink200} 0%, ${colors.magenta500} 100%)`,
  magentaViolet: `linear-gradient(135deg, ${colors.red400} 0%, ${colors.violet600} 100%)`,
  limeGreen: `linear-gradient(135deg, ${colors.lime300} 0%, ${colors.green300} 100%)`,
  grayBlack: `linear-gradient(101deg, ${colors.gray600Alt} 6.56%, ${colors.black} 93.57%)`,
};
