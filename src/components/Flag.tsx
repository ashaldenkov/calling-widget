import * as flags from 'country-flag-icons/string/3x2';

interface FlagProps {
  country: string;
  width?: number;
  height?: number;
  title?: string;
}

const Flag = ({ country, width = 22, height = 16, title }: FlagProps) => {
  const svg = flags[country.toUpperCase() as keyof typeof flags];
  if (!svg) return null;
  return (
    <span
      class='cw-flag'
      style={{ width, height }}
      title={title}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default Flag;
