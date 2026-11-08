// Weaving loader: five warp threads rise in turn, like ikat threads being dyed. Pure CSS (see globals.css).
export function IkatLoader({ size = 28, label }: { size?: number; label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex flex-col items-center gap-3">
      <span className="ikat-loader" style={{ ["--size" as string]: `${size}px` }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} style={{ ["--i" as string]: i }} />
        ))}
      </span>
      {label ? <span className="text-sm text-muted">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}
