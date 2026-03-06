export const fontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const typography = {
  fontFamily: 'Roboto',
  h1: {
    fontSize: 'clamp(2.5rem, 4vw + 1.5rem, 3.5rem)', // 40px → 56px
    lineHeight: 1.14,
    fontWeight: fontWeight.regular,
  },
  h2: {
    fontSize: 'clamp(2.25rem, 3vw + 1.25rem, 3rem)', // 36px → 48px
    lineHeight: 1.125,
    fontWeight: fontWeight.regular,
  },
  h3: {
    fontSize: 'clamp(2rem, 2.5vw + 1rem, 2.25rem)', // 32px → 36px
    lineHeight: 1.22,
    fontWeight: fontWeight.regular,
  },
  h4: {
    fontSize: 'clamp(1.75rem, 2vw + 1rem, 2.25rem)', // 28px → 36px
    lineHeight: 1.1,
    fontWeight: fontWeight.medium,
  },
  h5: {
    fontSize: 'clamp(1.25rem, 1.5vw + 0.75rem, 1.75rem)', // 20px → 28px
    lineHeight: 1.2,
    fontWeight: fontWeight.regular,
  },
  h6: {
    fontSize: 'clamp(1.125rem, 1.25vw + 0.75rem, 1.5rem)', // 18px → 24px
    lineHeight: 1.17,
    fontWeight: fontWeight.medium,
  },
  bodyLargeRegular: {
    fontSize: 'clamp(0.875rem, 0.5vw + 0.75rem, 1rem)', // 14px → 16px
    lineHeight: 1.5,
    letterSpacing: '0.15px',
    fontWeight: fontWeight.regular,
  },
  bodyMediumRegular: {
    fontSize: 'clamp(0.875rem, 0.5vw + 0.75rem, 1rem)', // 14px → 16px
    lineHeight: 0.75,
    letterSpacing: '0.25px',
    fontWeight: fontWeight.regular,
  },
  bodyMediumSemi: {
    fontSize: 'clamp(0.8125rem, 0.25vw + 0.75rem, 0.875rem)', // 13px → 14px
    lineHeight: 0.86,
    letterSpacing: '0.25px',
    fontWeight: fontWeight.regular,
  },
  bodySmallRegular: {
    fontSize: 'clamp(0.75rem, 0.25vw + 0.7rem, 0.75rem)', // 12px → 12px (minimal scaling)
    lineHeight: 1.33,
    letterSpacing: '0.4px',
    fontWeight: fontWeight.regular,
  },
  bodySmallMedium: {
    fontSize: 'clamp(0.75rem, 0.25vw + 0.7rem, 0.75rem)', // 12px → 12px (minimal scaling)
    lineHeight: 1.33,
    letterSpacing: '0.4px',
    fontWeight: fontWeight.medium,
  },
  overline: {
    fontSize: 'clamp(0.75rem, 0.25vw + 0.7rem, 0.75rem)', // 12px → 12px (minimal scaling)
    lineHeight: 1.67,
    letterSpacing: '0.4px',
    fontWeight: fontWeight.regular,
  },
  subtitle: {
    fontSize: 'clamp(0.8125rem, 0.25vw + 0.75rem, 0.875rem)', // 13px → 14px
    lineHeight: 1.14,
    fontWeight: fontWeight.regular,
  },
  subtitleRegular: {
    fontSize: 'clamp(1.125rem, 1vw + 0.625rem, 1.25rem)', // 18px → 20px
    lineHeight: 1.4,
    fontWeight: fontWeight.regular,
  },
  subtitleMedium: {
    fontSize: 'clamp(1.125rem, 1vw + 0.625rem, 1.25rem)', // 18px → 20px
    lineHeight: 1.4,
    fontWeight: fontWeight.medium,
  },
  caption: {
    fontSize: 'clamp(0.75rem, 0.25vw + 0.7rem, 0.75rem)', // 12px → 12px (minimal scaling)
    lineHeight: 1.17,
    fontWeight: fontWeight.regular,
  },
  button: {
    fontSize: 'clamp(0.8125rem, 0.25vw + 0.75rem, 0.875rem)', // 13px → 14px
    lineHeight: 1.69,
    letterSpacing: '0.46px',
    fontWeight: fontWeight.medium,
  },
  body2: {
    fontSize: 'clamp(0.875rem, 0.5vw + 0.75rem, 1rem)', // 14px → 16px
    lineHeight: 1.5,
    letterSpacing: '0.25px',
    fontWeight: fontWeight.medium,
  },
  body3: {
    fontSize: 'clamp(0.8125rem, 0.25vw + 0.75rem, 0.875rem)', // 13px → 14px
    lineHeight: 1.43,
    letterSpacing: '0.25px',
    fontWeight: fontWeight.regular,
  },
  body4: {
    fontSize: 'clamp(0.75rem, 0.25vw + 0.7rem, 0.875rem)', // 12px → 14px
    fontWeight: fontWeight.medium,
    color: '#768194',
    letterSpacing: '0.4px',
  },
};
