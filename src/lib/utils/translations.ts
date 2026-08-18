import type { Role } from "@/lib/types/api";

export const translateCategory = (category: string | undefined | null) => {
  if (!category) return "";

  const translations: Record<string, string> = {
    CLOTHING: "Roupas",
    ACCESSORIES: "Acessórios",
    ACCESSORY: "Acessórios",
    SHOES: "Sapatos",
    BAGS: "Bolsas",
    JEWELRY: "Joias",
    BEAUTY: "Beleza",
    HOME: "Casa",

    JACKETS: "Jaquetas",
    COATS_AND_TRENCHES: "Casacos e Sobretudos",
    DRESSES: "Vestidos",
    BLAZERS: "Blazers",
    SHIRTS_AND_BLOUSES: "Camisas e Blusas",
    JEANS: "Jeans",
    PANTS: "Calças",
    TOPS: "Tops",
    T_SHIRTS: "Camisetas",
    SKIRTS_AND_SHORTS: "Saias e Shorts",
    SHIRTS: "Camisas",
    SHORTS: "Bermudas e Shorts"
  };
  const normalizedKey = category.toString().trim().toUpperCase();
  return translations[normalizedKey] || category;
};

export const translateRole = (role: Role): string => {
  const translations: Record<Role, string> = {
    CUSTOMER: "Cliente",
    ADMIN: "Administrador",
    ADMIN_VIEWER: "Administrador (somente leitura)",
  };
  return translations[role] ?? role;
};

export const translateTargetAudience = (audience: string | undefined | null) => {
  if (!audience) return "";

  const translations: Record<string, string> = {
    WOMEN: "Mulher",
    MEN: "Homem",
    UNISEX: "Unissex",
    KIDS: "Infantil"
  };

  const normalizedKey = audience.toString().trim().toUpperCase();
  return translations[normalizedKey] || audience;
};

export { translateOrderStatus } from "@/lib/admin/order-status";

import { POSTAL_CODE_HINT } from "./postal-code";

export const translateApiError = (message: string): string => {
  if (!message) return "";

  const translations: Record<string, string> = {
    "Street is required": "A rua/avenida é obrigatória",
    "Street cannot exceed 255 characters": "A rua não pode exceder 255 caracteres",
    "Number is required": "O número é obrigatório",
    "Number cannot exceed 10 characters": "O número não pode exceder 10 caracteres",
    "Complement cannot exceed 255 characters": "O complemento não pode exceder 255 caracteres",
    "Neighborhood is required": "O bairro é obrigatório",
    "Neighborhood cannot exceed 100 characters": "O bairro não pode exceder 100 caracteres",
    "City is required": "A cidade é obrigatória",
    "City cannot exceed 100 characters": "A cidade não pode exceder 100 caracteres",
    "State is required": "O estado (UF) é obrigatório",
    "Postal code is required": "O CEP é obrigatório",
    "Invalid postal code format": POSTAL_CODE_HINT,

    "One or more fields are invalid.": "Um ou mais campos são inválidos.",
    "Validation error": "Erro de validação",
    "Bad Request": "Requisição inválida",
  };

  if (translations[message]) {
    return translations[message];
  }

  if (message.includes("must not be blank") || message.includes("is required")) {
    return "Campo obrigatório preenchido incorretamente.";
  }

  return message;
};
