interface LoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export const substackLoader = ({ src, width }: LoaderProps) => {
  const baseUrl = src.split('?')[0];
  return `${baseUrl}?w=${width}&auto=format`;
}; 