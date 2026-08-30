import { useRef } from "react";
import { Camera, FolderOpen, RotateCcw, X } from "lucide-react";
import { fileToJpeg } from "@/lib/image";

export function CardPhotos({
  front,
  back,
  onFront,
  onBack,
}: {
  front: string;
  back: string;
  onFront: (src: string) => void;
  onBack: (src: string) => void;
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3">
      <Side label="Front" src={front} onChange={onFront} />
      <Side label="Back" src={back} onChange={onBack} />
    </div>
  );
}

function Side({
  label,
  src,
  onChange,
}: {
  label: string;
  src: string;
  onChange: (src: string) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const ok =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!ok) return;
    try {
      onChange(await fileToJpeg(file));
    } catch {
      /* ignore unreadable */
    }
  }

  return (
    <div className="rounded-sm border border-line bg-pocket p-2">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      {src ? (
        <img src={src} alt={label} className="mb-2 h-36 w-full rounded-sm object-contain" />
      ) : (
        <div className="mb-2 grid h-36 place-items-center rounded-sm bg-raised text-xs text-muted">No photo</div>
      )}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-md bg-accent px-2 text-xs font-semibold text-ink"
        >
          <Camera className="size-3.5" /> Photo
        </button>
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-md border border-line px-2 text-xs font-semibold"
        >
          <FolderOpen className="size-3.5" /> Library
        </button>
        {src ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="grid size-11 place-items-center rounded-md border border-line"
            aria-label={`Remove ${label}`}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function FlipThumb({
  front,
  back,
}: {
  front: string;
  back: string;
}) {
  if (!front && !back) return null;
  return (
    <div className="relative mb-1">
      <img src={front || back} alt="" className="h-16 w-full rounded-sm object-cover" />
      {back && front ? (
        <span className="absolute right-1 bottom-1 rounded-sm bg-bg/80 px-1 text-[10px] font-semibold text-ink">
          <RotateCcw className="mr-0.5 inline size-2.5" /> 2
        </span>
      ) : null}
    </div>
  );
}
