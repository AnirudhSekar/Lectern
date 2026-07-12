import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-mark-64.png"
      alt="Lectern"
      width={28}
      height={28}
      className={className}
      priority
    />
  );
}