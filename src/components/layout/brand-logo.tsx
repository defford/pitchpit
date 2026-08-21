import Image from "next/image";

import { cn } from "@/lib/utils";

const PITCH_PIT_LOGO = {
  src: "/brand/the-pitch-pit.png",
  width: 954,
  height: 767,
  alt: "The Pitch Pit",
} as const;

const SIZE_CLASS = {
  header: "h-12 w-auto sm:h-14",
  footer: "h-12 w-auto",
  login: "h-28 w-auto sm:h-36",
  hero: "h-52 w-auto sm:h-64 md:h-72 lg:h-80",
  slam: "h-36 w-auto sm:h-44",
} as const;

const SIZE_ATTR = {
  header: "56px",
  footer: "48px",
  login: "144px",
  hero: "(max-width: 640px) 208px, (max-width: 768px) 256px, (max-width: 1024px) 288px, 320px",
  slam: "(max-width: 640px) 144px, 176px",
} as const;

type BrandLogoProps = {
  size: keyof typeof SIZE_CLASS;
  className?: string;
  preload?: boolean;
};

export function BrandLogo({
  size,
  className,
  preload = false,
}: BrandLogoProps) {
  return (
    <Image
      src={PITCH_PIT_LOGO.src}
      alt={PITCH_PIT_LOGO.alt}
      width={PITCH_PIT_LOGO.width}
      height={PITCH_PIT_LOGO.height}
      sizes={SIZE_ATTR[size]}
      quality={90}
      preload={preload}
      className={cn("object-contain", SIZE_CLASS[size], className)}
    />
  );
}
