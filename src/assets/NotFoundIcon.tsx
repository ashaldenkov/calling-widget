import type { SvgIconProps } from '@mui/material';
import { SvgIcon } from '@mui/material';

export const NotFoundIcon = (props: SvgIconProps) => (
  <SvgIcon
    {...props}
    width='124'
    height='124'
    viewBox='0 0 124 124'
    fill='none'
  >
    <rect width='124' height='124' fill='white' />
    <circle cx='62' cy='64' r='48' fill='#F6F8FB' />
    <path
      d='M35 40C35 35.5817 38.5817 32 43 32H65.5L77 44V78C77 82.4183 73.4183 86 69 86H43C38.5817 86 35 82.4183 35 78V40Z'
      fill='#EDEFF2'
    />
    <path d='M65.5 44V32L77 44H65.5Z' fill='#E9EAEB' />
    <path
      d='M46 48C46 43.5817 49.5817 40 54 40H76.5L88 52V86C88 90.4183 84.4183 94 80 94H54C49.5817 94 46 90.4183 46 86V48Z'
      fill='white'
    />
    <path d='M76.5 52V40L88 52H76.5Z' fill='#E8EAED' />
    <circle cx='75.5' cy='81.5' r='15.5' fill='white' />
    <path
      d='M63.1261 69.1253C69.9602 62.2916 81.0401 62.2915 87.8742 69.1253C94.3511 75.6023 94.6887 85.8923 88.8888 92.7679L102.501 106.38C103.087 106.966 103.087 107.916 102.501 108.501C101.915 109.087 100.966 109.087 100.38 108.501L86.7677 94.889C79.8921 100.688 69.603 100.351 63.1261 93.8744C56.2919 87.0402 56.2919 75.9595 63.1261 69.1253ZM85.7531 71.2464C80.0906 65.5842 70.9098 65.5842 65.2472 71.2464C59.5846 76.909 59.5846 86.0907 65.2472 91.7533C70.9098 97.4156 80.0905 97.4156 85.7531 91.7533C91.4157 86.0907 91.4157 76.909 85.7531 71.2464Z'
      fill='#768194'
    />
    <path
      d='M82 76L70 88M70 76L82 88'
      stroke='#22224B'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </SvgIcon>
);

export default NotFoundIcon;
