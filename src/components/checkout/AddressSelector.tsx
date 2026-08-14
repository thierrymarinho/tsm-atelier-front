"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { AddressResponseDTO, AddressRequestDTO, BRAZILIAN_STATES } from "@/lib/types/api";
import { Loader2, MapPin, Plus, Check } from "lucide-react";
import { formatApiError } from "@/lib/utils/error";
import { PostalCodeInput } from "@/components/ui/PostalCodeInput";
import { isCompletePostalCode, POSTAL_CODE_HINT } from "@/lib/utils/postal-code";

interface AddressSelectorProps {
  onAddressSelected: (addressId: number) => void;
}

export function AddressSelector({ onAddressSelected }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<AddressResponseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const selectedAddressIdRef = useRef<number | null>(null);

  const selectAddress = useCallback(
    (id: number) => {
      selectedAddressIdRef.current = id;
      setSelectedAddressId(id);
      onAddressSelected(id);
    },
    [onAddressSelected],
  );

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
      setAddresses(data);

      const defaultAddr = data.find((a) => a.isDefault);
      if (defaultAddr && selectedAddressIdRef.current === null) {
        selectAddress(defaultAddr.id);
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const { data } = await apiClient.post<AddressResponseDTO>("/v1/addresses", formData);
      await fetchAddresses();
      setIsFormOpen(false);
      setIsModalOpen(false);
      handleSelectAddress(data.id);

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

  const handleSelectAddress = (id: number) => {
    selectAddress(id);
    setIsModalOpen(false);
  };

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 border border-muted bg-muted/5">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (addresses.length === 0 || (isFormOpen && !isModalOpen)) {
    return (
      <div className="border border-muted p-6 bg-background">
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-5 h-5 text-foreground" />
          <h2 className="text-sm font-semibold tracking-widest uppercase">
            Endereço de Entrega
          </h2>
        </div>

        <form onSubmit={handleCreateAddress} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PostalCodeInput
              placeholder="CEP (00000-000)"
              required
              value={formData.postalCode}
              onChange={(postalCode) => setFormData({ ...formData, postalCode })}
              className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
            />
            <input
              type="text"
              placeholder="Rua / Avenida"
              required
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
            />
            <input
              type="text"
              placeholder="Número"
              required
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
            />
            <input
              type="text"
              placeholder="Complemento (Opcional)"
              value={formData.complement}
              onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
              className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
            />
            <input
              type="text"
              placeholder="Bairro"
              required
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
            />
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Cidade"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-2/3 bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
              />
              <select
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value as any })}
                className="w-1/3 bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors cursor-pointer"
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
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="accent-foreground w-4 h-4"
              />
              <span className="text-sm text-muted-foreground">Tornar este meu endereço padrão</span>
            </label>
          )}

          {formError && (
            <p className="text-sm text-red-500 mt-2">{formError}</p>
          )}

          <div className="flex gap-4 mt-6">
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="py-3 px-6 border border-foreground text-foreground text-xs uppercase tracking-widest font-medium hover:bg-muted/30 transition-colors"
              >
                Cancelar
              </button>
            )}
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
    <>
      <div className="border border-muted p-6 bg-background">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-foreground" />
            <h2 className="text-sm font-semibold tracking-widest uppercase">
              Endereço de Entrega
            </h2>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-medium uppercase tracking-widest underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            Alterar
          </button>
        </div>

        {selectedAddress && (
          <div className="text-sm text-muted-foreground flex flex-col gap-1">
            <p className="font-medium text-foreground">
              {selectedAddress.street}, {selectedAddress.number}
              {selectedAddress.complement && ` - ${selectedAddress.complement}`}
            </p>
            <p>
              {selectedAddress.neighborhood}
            </p>
            <p>
              {selectedAddress.city} - {selectedAddress.state}
            </p>
            <p>CEP: {selectedAddress.postalCode}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold tracking-widest uppercase">Seus Endereços</h3>
              <button onClick={() => { setIsModalOpen(false); setIsFormOpen(false); }} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground underline underline-offset-4">
                Fechar
              </button>
            </div>

            {isFormOpen ? (
               <form onSubmit={handleCreateAddress} className="flex flex-col gap-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <PostalCodeInput placeholder="CEP (00000-000)" required value={formData.postalCode} onChange={(postalCode) => setFormData({ ...formData, postalCode })} className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
                    <input type="text" placeholder="Rua / Avenida" required value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
                    <input type="text" placeholder="Número" required value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
                    <input type="text" placeholder="Complemento" value={formData.complement} onChange={(e) => setFormData({ ...formData, complement: e.target.value })} className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
                    <input type="text" placeholder="Bairro" required value={formData.neighborhood} onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })} className="w-full bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
                    <div className="flex gap-4">
                      <input type="text" placeholder="Cidade" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-2/3 bg-transparent border-b border-muted py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
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
                  {formError && <p className="text-sm text-red-500">{formError}</p>}
                  <div className="flex gap-4 mt-4">
                    <button type="button" onClick={() => setIsFormOpen(false)} className="py-3 px-4 border border-foreground text-xs uppercase font-medium">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-foreground text-background text-xs uppercase font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Salvar Endereço
                    </button>
                  </div>
               </form>
            ) : (
              <div className="flex flex-col gap-4">
                {addresses.map(addr => (
                  <div
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr.id)}
                    className={`p-4 border cursor-pointer transition-colors flex items-start justify-between ${selectedAddressId === addr.id ? 'border-foreground bg-muted/10' : 'border-muted hover:border-foreground/50'}`}
                  >
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">{addr.street}, {addr.number}</span>
                      <span className="text-muted-foreground">{addr.neighborhood} - {addr.city}/{addr.state}</span>
                      <span className="text-muted-foreground text-xs mt-1">CEP: {addr.postalCode}</span>
                    </div>
                    {selectedAddressId === addr.id && (
                      <Check className="w-5 h-5 text-foreground" />
                    )}
                  </div>
                ))}

                <button
                  onClick={() => setIsFormOpen(true)}
                  className="mt-2 w-full py-4 border border-dashed border-muted hover:border-foreground transition-colors flex items-center justify-center gap-2 text-sm font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Novo Endereço
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
