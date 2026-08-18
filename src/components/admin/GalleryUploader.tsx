"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import {
  UPLOAD_ACCEPT_ATTR,
  uploadImage,
  validateImageFile,
  type UploadFolder,
} from "@/lib/admin/uploads";

interface GalleryUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: UploadFolder;
  readOnly?: boolean;
}

interface QueueItem {
  id: string;
  name: string;
  status: "sending" | "failed";
  error?: string;
}

export function GalleryUploader({
  value,
  onChange,
  folder = "products",
  readOnly = false,
}: GalleryUploaderProps) {
  const inputId = useId();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const seq = useRef(0);

  const valueRef = useRef(value);
  valueRef.current = value;

  const sendAll = async (files: File[]) => {
    for (const file of files) {
      const id = `q${seq.current++}`;
      const invalid = validateImageFile(file);
      if (invalid) {
        setQueue((current) => [...current, { id, name: file.name, status: "failed", error: invalid }]);
        continue;
      }

      setQueue((current) => [...current, { id, name: file.name, status: "sending" }]);
      try {
        const url = await uploadImage(file, folder);
        const next = [...valueRef.current, url];
        valueRef.current = next;
        onChange(next);
        setQueue((current) => current.filter((item) => item.id !== id));
      } catch (caught) {
        setQueue((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "failed",
                  error: caught instanceof Error ? caught.message : "Falha no envio.",
                }
              : item,
          ),
        );
      }
    }
  };

  const move = (index: number, by: -1 | 1) => {
    const next = [...value];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));

  const replaceAt = (index: number, url: string) =>
    onChange(value.map((current, i) => (i === index ? url : current)));

  if (readOnly) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Galeria ({value.length})
        </span>

        {value.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma imagem além da capa e do hover.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {value.map((url, index) => (
              <li
                key={`${url}-${index}`}
                className="relative w-12 h-16 bg-muted/40 flex-shrink-0 overflow-hidden"
              >
                {url ? (
                  <Image src={url} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <ImagePlus className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        Galeria ({value.length})
      </span>

      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((url, index) => (
            <li key={`${url}-${index}`} className="flex items-center gap-2">
              <div className="relative w-12 h-16 bg-muted/40 flex-shrink-0 overflow-hidden">
                {url ? (
                  <Image src={url} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <ImagePlus className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                )}
              </div>

              <input
                type="url"
                value={url}
                onChange={(event) => replaceAt(index, event.target.value)}
                aria-label={`URL da imagem ${index + 1} da galeria`}
                className="flex-1 min-w-0 h-8 px-2 bg-transparent border border-muted text-xs font-mono text-foreground focus:outline-none focus:border-foreground transition-colors"
              />

              <div className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Mover imagem ${index + 1} para trás`}
                  className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  aria-label={`Mover imagem ${index + 1} para frente`}
                  className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={`Remover imagem ${index + 1}`}
                  className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {queue.length > 0 && (
        <ul className="flex flex-col gap-1">
          {queue.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-xs">
              {item.status === "sending" ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground truncate">{item.name}</span>
                </>
              ) : (
                <>
                  <span className="text-red-600 truncate">{item.name}</span>
                  <span className="text-red-600 truncate">— {item.error}</span>
                  <button
                    type="button"
                    onClick={() => setQueue((current) => current.filter((q) => q.id !== item.id))}
                    className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Dispensar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          multiple
          accept={UPLOAD_ACCEPT_ATTR}
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) void sendAll(files);
            event.target.value = "";
          }}
        />
        <label
          htmlFor={inputId}
          className="flex items-center gap-1.5 px-2.5 h-8 border border-muted text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground transition-colors cursor-pointer"
        >
          <Upload className="w-3 h-3" strokeWidth={1.5} />
          Adicionar imagens
        </label>
        <button
          type="button"
          onClick={() => onChange([...value, ""])}
          className="px-2.5 h-8 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          + colar URL
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground leading-snug">
        Aparecem na página do produto depois da capa e da imagem de hover, nesta ordem. Enviar não
        salva — grave o produto para aplicar.
      </p>
    </div>
  );
}
