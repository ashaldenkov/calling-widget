interface SpinnerProps {
  size?: number;
}

export const Spinner = ({ size = 24 }: SpinnerProps) => (
  <span
    class='cw-spinner'
    style={{ width: size, height: size }}
    role='status'
    aria-label='Loading'
  >
    <svg viewBox='22 22 44 44' aria-hidden='true'>
      <circle class='cw-spinner__circle' cx='44' cy='44' r='20.2' />
    </svg>
  </span>
);
