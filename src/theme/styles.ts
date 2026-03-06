export const flexCenter = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

export const flexBetweenCenter = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
} as const;

export const flexRowCenter = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
} as const;

export const truncateText = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

export const dialogActions = {
  pt: 0,
  px: '24px',
  pb: '24px',
  gap: '8px',
  fontSize: '14px',
  fontWeight: 500,
} as const;

export const dialogTitle = {
  fontSize: '20px',
  lineHeight: 1.5,
  fontWeight: 500,
} as const;

export const dialogTitlePadding = {
  padding: '16px 24px',
} as const;

const formButton = {
  width: '100px',
  height: '40px',
  borderRadius: 2,
} as const;

export const formButtonPrimary = {
  ...formButton,
  textTransform: 'none',
  fontSize: '14px',
  fontWeight: 400,
  backgroundColor: 'primary.main',
  color: 'white',
  '&:hover': {
    backgroundColor: 'primary.main',
    opacity: 0.9,
  },
  '&:disabled': {
    opacity: 0.5,
  },
} as const;

export const elevatedPaperShadow = {
  boxShadow: '0px 8px 24px 0px #2233541F',
  borderRadius: 2,
} as const;

export const chipBase = {
  fontWeight: 400,
  fontSize: 14,
  height: 28,
} as const;
