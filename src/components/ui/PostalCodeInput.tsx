"use client";

import { maskPostalCode } from "@/lib/utils/postal-code";

interface PostalCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export function PostalCodeInput({
  value,
  onChange,
  className,
  placeholder = "00000-000",
  required,
  id,
  ...aria
}: PostalCodeInputProps) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      maxLength={9}
      autoComplete="postal-code"
      placeholder={placeholder}
      required={required}
      value={value}
      onChange={(e) => onChange(maskPostalCode(e.target.value))}
      className={className}
      {...aria}
    />
  );
}
