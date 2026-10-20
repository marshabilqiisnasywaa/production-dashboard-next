import Image from "next/image";

type Variant = "green" | "white";

const SRC: Record<Variant, string> = {
  green: "/brand/oppo-green.png",
  white: "/brand/oppo-white.png",
};

interface Props {
  variant?: Variant;
  /** Displayed height in px; the width follows the image's own ratio */
  height?: number;
  className?: string;
}

export function OppoLogo({ variant = "green", height = 28, className }: Props) {
  return (
    <Image
      src={SRC[variant]}
      alt="OPPO"
      width={height * 3} // only a size hint for Next; the real width follows the image ratio
      height={height}
      style={{ height, width: "auto" }}
      className={className}
      priority
    />
  );
}