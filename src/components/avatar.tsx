import { contrastText, initials } from "@/lib/utils";

export function Avatar({
  name,
  color,
  size = 32,
  title,
}: {
  name: string;
  color: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      title={title ?? name}
      style={{
        backgroundColor: color,
        color: contrastText(color),
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none"
    >
      {initials(name)}
    </span>
  );
}
