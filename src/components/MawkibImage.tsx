import { useSignedUrl } from "@/lib/mawkib-content";

export function MawkibImage({
  path,
  alt,
  className,
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  const url = useSignedUrl(path);
  if (!url) return <div className={`animate-pulse bg-secondary ${className ?? ""}`} />;
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}
