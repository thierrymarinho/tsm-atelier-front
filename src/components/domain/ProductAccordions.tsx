"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { ProductResponseDTO } from "@/lib/types/api";

interface AccordionItemProps {
  title: string;
  content: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionItem({ title, content, isOpen, onToggle }: AccordionItemProps) {
  return (
    <div className="border-b border-muted">
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left hover:opacity-70 transition-opacity focus:outline-none"
      >
        <span className="text-sm tracking-wide font-medium text-foreground">{title}</span>
        {isOpen ? (
          <Minus className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        ) : (
          <Plus className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[1000px] pb-6 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="text-sm text-muted-foreground leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  );
}

interface ProductAccordionsProps {
  product: ProductResponseDTO;
}

export function ProductAccordions({ product }: ProductAccordionsProps) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="w-full flex flex-col pb-16">
      <AccordionItem
        title="Envios e Devoluções"
        isOpen={openSection === "shipping"}
        onToggle={() => toggleSection("shipping")}
        content={
          <div className="flex flex-col gap-2">
            <p>Frete grátis para todas as regiões do Brasil.</p>
          </div>
        }
      />

      <AccordionItem
        title="Cuidados"
        isOpen={openSection === "care"}
        onToggle={() => toggleSection("care")}
        content={
          <ul className="list-disc pl-4 flex flex-col gap-1">
            {product.careInstructions?.length > 0 ? (
              product.careInstructions.map((care) => (
                <li key={care.instruction}>{care.label}</li>
              ))
            ) : (

              <li>Consulte a etiqueta da peça.</li>
            )}
          </ul>
        }
      />
    </div>
  );
}
