export const fontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const typography = {
  fontFamily: 'Roboto',
  h6: {
    fontSize: 'clamp(1.125rem, 1.25vw + 0.75rem, 1.25rem)', // 18px → 20px
    fontWeight: fontWeight.medium,
    letterSpacing: '0.15px',
    lineHeight: 1.6,
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
};
