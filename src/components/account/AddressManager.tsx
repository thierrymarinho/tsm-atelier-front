"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { AddressResponseDTO, AddressRequestDTO, BRAZILIAN_STATES } from "@/lib/types/api";
import { Loader2, Plus, Trash2, Check, Star } from "lucide-react";
import { formatApiError } from "@/lib/utils/error";
import { PostalCodeInput } from "@/components/ui/PostalCodeInput";
import { isCompletePostalCode, POSTAL_CODE_HINT } from "@/lib/utils/postal-code";

export function AddressManager() {
  const [addresses, setAddresses] = useState<AddressResponseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [formData, setFormData] = useState<AddressRequestDTO>({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "SP",
    postalCode: "",
    isDefault: false,
  } as AddressRequestDTO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchAddresses = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get<AddressResponseDTO[]>("/v1/addresses");
      const sorted = [...data].sort((a, b) =>
        b.isDefault === a.isDefault ? 0 : b.isDefault ? 1 : -1,
      );
      setAddresses(sorted);
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!isCompletePostalCode(formData.postalCode)) {
      setFormError(POSTAL_CODE_HINT);
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post<AddressResponseDTO>("/v1/addresses", formData);
      await fetchAddresses();
      setIsFormOpen(false);
      setFormData({
        street: "", number: "", complement: "", neighborhood: "",
        city: "", state: "SP", postalCode: "", isDefault: false,
      } as AddressRequestDTO);
    } catch (error: any) {
      setFormError(formatApiError(error, "Erro ao salvar endereço."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este endereço?")) return;
    try {
      await apiClient.delete(`/v1/addresses/${id}`);
      setAddresses(addresses.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error deleting address", error);
    }
  };

  const handleMakeDefault = async (id: number) => {
    try {
      await apiClient.patch(`/v1/addresses/${id}/default`);
      await fetchAddresses();
    } catch (error) {
      console.error("Error updating default address", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isFormOpen) {
    return (
      <div className="border border-muted p-6 sm:p-8 bg-background max-w-2xl animate-fade-in-fast">
        <h3 className="text-sm font-semibold tracking-widest uppercase mb-6 border-b border-muted pb-4">
          Novo Endereço
        </h3>

        <form onSubmit={handleCreateAddress} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="postalCode" className="text-xs text-muted-foreground uppercase tracking-widest">CEP</label>
              <PostalCodeInput id="postalCode" required value={formData.postalCode} onChange={(postalCode) => setFormData({ ...formData, postalCode })} className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">Rua / Avenida</label>
              <input type="text" required value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">Número</label>
              <input type="text" required value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">Complemento</label>
              <input type="text" value={formData.complement} onChange={(e) => setFormData({ ...formData, complement: e.target.value })} className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" placeholder="Opcional" />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">Bairro</label>
              <input type="text" required value={formData.neighborhood} onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })} className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">Cidade</label>
              <input type="text" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">Estado (UF)</label>
              <select
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value as any })}
                className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors cursor-pointer"
              >
                {BRAZILIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {addresses.length > 0 && (
            <label className="flex items-center gap-3 mt-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="accent-foreground w-4 h-4 cursor-pointer"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Definir como endereço principal</span>
            </label>
          )}

          {formError && <p className="text-sm text-red-500 mt-2">{formError}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-4 mt-8">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="py-3 px-8 border border-foreground text-foreground text-xs uppercase tracking-widest font-medium hover:bg-muted/30 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-foreground text-background text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Endereço
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 bg-muted/5 border border-muted">
          <p className="text-muted-foreground mb-6">
            Você ainda não possui endereços cadastrados.
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-8 py-3 bg-foreground text-background text-xs tracking-widest uppercase font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Endereço
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map(addr => (
              <div
                key={addr.id}
                className={`p-6 border relative flex flex-col justify-between ${
                  addr.isDefault ? 'border-foreground bg-muted/5' : 'border-muted'
                }`}
              >
                {addr.isDefault && (
                  <div className="absolute top-0 right-0 bg-foreground text-background text-[10px] uppercase tracking-widest px-3 py-1 font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> Principal
                  </div>
                )}

                <div className="flex flex-col text-sm mb-8 mt-2">
                  <span className="font-medium text-base mb-2">
                    {addr.street}, {addr.number}
                    {addr.complement && ` - ${addr.complement}`}
                  </span>
                  <span className="text-muted-foreground">{addr.neighborhood}</span>
                  <span className="text-muted-foreground">{addr.city} - {addr.state}</span>
                  <span className="text-muted-foreground mt-2">CEP: {addr.postalCode}</span>
                </div>

                <div className="flex items-center gap-4 border-t border-muted pt-4">
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleMakeDefault(addr.id)}
                      className="text-xs uppercase tracking-widest font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Tornar Principal
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="text-xs uppercase tracking-widest font-medium text-red-400 hover:text-red-600 transition-colors flex items-center gap-1 ml-auto"
                  >
                    <Trash2 className="w-3 h-3" /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setIsFormOpen(true)}
            className="w-full sm:w-auto self-start mt-4 px-8 py-4 border border-dashed border-muted hover:border-foreground transition-colors flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4" />
            Adicionar Novo Endereço
          </button>
        </>
      )}
    </div>
  );
}
