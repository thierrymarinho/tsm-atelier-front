"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import {
  UPLOAD_ACCEPT_ATTR,
  uploadImage,
  validateImageFile,
  type UploadFolder,
} from "@/lib/admin/uploads";

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  folder?: UploadFolder;
  required?: boolean;
  error?: string;
  readOnly?: boolean;
}

export function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  folder = "products",
  required,
  error,
  readOnly = false,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);

  const send = async (file: File) => {
    setUploadError(null);
    const invalid = validateImageFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadImage(file, folder);
      onChange(url);
      setJustUploaded(true);
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : "Falha ao enviar a imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void send(file);
  };

  const message = error ?? uploadError;

  if (readOnly) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>

        <div className="flex items-center gap-3 border border-muted p-2">
          <div className="relative w-16 h-20 bg-muted/40 flex-shrink-0 overflow-hidden">
            {value ? (
              <Image src={value} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <ImagePlus className="w-5 h-5" strokeWidth={1.5} />
              </span>
            )}
          </div>

          <span className="min-w-0 flex-1 text-xs font-mono text-muted-foreground break-all line-clamp-3">
            {value || "sem imagem"}
          </span>
        </div>

        {hint && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`flex items-center gap-3 border p-2 transition-colors ${
          isDragging ? "border-foreground bg-muted/40" : message ? "border-red-400" : "border-muted"
        }`}
      >
        <div className="relative w-16 h-20 bg-muted/40 flex-shrink-0 overflow-hidden">
          {value ? (
            <Image src={value} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <ImagePlus className="w-5 h-5" strokeWidth={1.5} />
            </span>
          )}

          {isUploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="w-4 h-4 animate-spin text-foreground" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={UPLOAD_ACCEPT_ATTR}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void send(file);
                event.target.value = "";
              }}
            />
            <label
              htmlFor={inputId}
              className="flex items-center gap-1.5 px-2.5 h-8 border border-muted text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground transition-colors cursor-pointer"
            >
              <Upload className="w-3 h-3" strokeWidth={1.5} />
              {value ? "Trocar" : "Enviar"}
            </label>

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setJustUploaded(false);
                }}
                className="flex items-center gap-1.5 px-2.5 h-8 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                Remover
              </button>
            )}

            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              ou arraste aqui
            </span>
          </div>

          <input
            type="url"
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setJustUploaded(false);
            }}
            placeholder="https://res.cloudinary.com/…"
            aria-label={`URL da imagem: ${label}`}
            className="w-full h-8 px-2 bg-transparent border border-muted text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
          />
        </div>
      </div>

      {hint && !message && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}

      {justUploaded && !message && (
        <p className="text-[10px] text-foreground leading-snug">
          Imagem enviada — salve para aplicar.
        </p>
      )}

      {message && <p className="text-xs text-red-600 leading-snug">{message}</p>}
    </div>
  );
}
