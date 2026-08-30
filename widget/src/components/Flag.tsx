import { useState } from 'preact/hooks';

// Flags are loaded on demand from the country-flag-icons CDN, so the flag set is
// not bundled into the widget.
const FLAG_CDN_BASE =
  'https://purecatamphetamine.github.io/country-flag-icons/3x2';

interface FlagProps {
  country: string;
  width?: number;
  height?: number;
  title?: string;
}

const Flag = ({ country, width = 22, height = 16, title }: FlagProps) => {
  const [failed, setFailed] = useState(false);
  const code = country?.toUpperCase();
  if (!code || failed) return null;
  return (
    <img
      class='cw-flag'
      src={`${FLAG_CDN_BASE}/${code}.svg`}
      alt={code}
      title={title ?? code}
      width={width}
      height={height}
      onError={() => setFailed(true)}
    />
  );
};

export default Flag;
