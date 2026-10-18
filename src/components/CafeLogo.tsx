import Image from 'next/image';

interface CafeLogoProps {
  size?: number;
  className?: string;
}

export default function CafeLogo({ size = 32, className = '' }: CafeLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Lara's Cafe Logo"
      width={size}
      height={size}
      priority
      className={`rounded-full shrink-0 object-contain shadow-sm ${className}`}
    />
  );
}