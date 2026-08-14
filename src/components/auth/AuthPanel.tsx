"use client";

import { useState } from "react";
import { X, Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { ApiErrorResponse } from "@/lib/types/api";

type AuthView = "login" | "register" | "pending";

const NAME_MIN = 2;
const NAME_MAX = 50;
const EMAIL_MAX = 255;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

const TITLE_EMAIL_UNVERIFIED = "Email not verified";
const TITLE_ACCOUNT_LOCKED = "Account Locked";

const RETRY_WINDOW = /(\d+)\s*(second|minute|hour)/i;
const RETRY_UNITS: Record<string, [singular: string, plural: string]> = {
  second: ["segundo", "segundos"],
  minute: ["minuto", "minutos"],
  hour: ["hora", "horas"],
};

function formatRetryAfter(detail: unknown): string {
  if (typeof detail !== "string") return "";
  const match = RETRY_WINDOW.exec(detail);
  if (!match) return "";
  const amount = Number(match[1]);
  const unit = RETRY_UNITS[match[2].toLowerCase()];
  if (!Number.isFinite(amount) || amount <= 0 || !unit) return "";
  return ` Tente novamente em ${amount} ${amount === 1 ? unit[0] : unit[1]}.`;
}

interface AuthPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}

export function AuthPanel({ isOpen, onClose }: AuthPanelProps) {
  const { login, register, resendVerificationEmail } = useAuth();
  const [view, setView] = useState<AuthView>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isEmailUnverified, setIsEmailUnverified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [pendingKind, setPendingKind] = useState<"registered" | "resent">("registered");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setServerError("");
    setErrors({});
    setShowPassword(false);
    setIsEmailUnverified(false);
  };

  const switchView = (newView: AuthView) => {
    resetForm();
    setView(newView);
  };

  const handleClose = () => {
    resetForm();
    setView("login");
    setRegisteredEmail("");
    setPendingKind("registered");
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (view === "register") {
      if (!firstName.trim()) {
        newErrors.firstName = "Nome é obrigatório.";
      } else if (firstName.trim().length < NAME_MIN || firstName.trim().length > NAME_MAX) {
        newErrors.firstName = `Nome deve ter entre ${NAME_MIN} e ${NAME_MAX} caracteres.`;
      }

      if (!lastName.trim()) {
        newErrors.lastName = "Sobrenome é obrigatório.";
      } else if (lastName.trim().length < NAME_MIN || lastName.trim().length > NAME_MAX) {
        newErrors.lastName = `Sobrenome deve ter entre ${NAME_MIN} e ${NAME_MAX} caracteres.`;
      }
    }

    if (!email.trim()) {
      newErrors.email = "Email é obrigatório.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Formato de email inválido.";
    } else if (email.trim().length > EMAIL_MAX) {
      newErrors.email = `Email deve ter no máximo ${EMAIL_MAX} caracteres.`;
    }

    if (!password) {
      newErrors.password = "Senha é obrigatória.";
    } else if (
      view === "register" &&
      (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    ) {
      newErrors.password = `Senha deve ter entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseApiError = (error: any): { message: string; offerResend: boolean } => {
    const data = error?.response?.data as ApiErrorResponse | undefined;
    const status = error?.response?.status;
    const title = data?.title;

    if (status === 422 && data?.fields) {
      const fieldErrors: FormErrors = {};
      if (data.fields.firstName) fieldErrors.firstName = data.fields.firstName;
      if (data.fields.lastName) fieldErrors.lastName = data.fields.lastName;
      if (data.fields.email) fieldErrors.email = data.fields.email;
      if (data.fields.password) fieldErrors.password = data.fields.password;
      setErrors(fieldErrors);
      return {
        message: data.detail || "Um ou mais campos são inválidos.",
        offerResend: false,
      };
    }

    if (status === 401) {
      return { message: "Email ou senha incorretos.", offerResend: false };
    }

    if (status === 403) {
      if (title === TITLE_EMAIL_UNVERIFIED) {
        return {
          message: "Seu email ainda não foi verificado. Verifique sua caixa de entrada.",
          offerResend: true,
        };
      }
      if (!data) {
        return {
          message: "Não foi possível validar sua requisição. Recarregue a página e tente novamente.",
          offerResend: false,
        };
      }
      return {
        message: "Você não tem permissão para esta ação.",
        offerResend: false,
      };
    }

    if (status === 409) {
      return { message: "Este email já está cadastrado.", offerResend: false };
    }

    if (status === 429) {
      const wait = formatRetryAfter(data?.detail);
      return {
        message:
          title === TITLE_ACCOUNT_LOCKED
            ? `Muitas tentativas de senha incorreta. Sua conta está temporariamente bloqueada.${wait}`
            : `Muitas tentativas em pouco tempo.${wait || " Aguarde alguns minutos e tente novamente."}`,
        offerResend: false,
      };
    }

    return {
      message: data?.detail || "Ocorreu um erro. Tente novamente.",
      offerResend: false,
    };
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    setServerError("");
    const target = email;
    try {
      await resendVerificationEmail(target);
      setRegisteredEmail(target);
      setPendingKind("resent");
      resetForm();
      setView("pending");
    } catch (error: any) {
      const { message } = parseApiError(error);
      setServerError(message);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (view === "login") {
        await login({ email, password });
        handleClose();
      } else {
        await register({ firstName: firstName.trim(), lastName: lastName.trim(), email, password });
        setRegisteredEmail(email);
        setPendingKind("registered");
        resetForm();
        setView("pending");
      }
    } catch (error: any) {
      const { message, offerResend } = parseApiError(error);
      setIsEmailUnverified(offerResend);
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (view) {
      case "login": return "Entrar";
      case "register": return "Criar Conta";
      case "pending": return "Verifique seu Email";
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[420px] bg-background z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-muted">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground">
            {getTitle()}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:opacity-70 transition-opacity"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8">

          {view === "pending" && (
            <div className="flex flex-col items-center text-center gap-6 py-12">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Mail className="w-8 h-8 text-foreground" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium text-foreground tracking-wide">
                  Verifique seu email
                </h3>
                {pendingKind === "registered" ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Enviamos um link de verificação para{" "}
                    <strong className="text-foreground">{registeredEmail}</strong>.
                    <br />
                    Clique no link para ativar sua conta.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Se houver uma conta pendente de verificação para{" "}
                    <strong className="text-foreground">{registeredEmail}</strong>, um novo link
                    acabou de ser enviado.
                    <br />
                    Clique no link para ativar sua conta.
                  </p>
                )}
              </div>
              <div className="w-full border-t border-muted pt-6 mt-4">
                <p className="text-xs text-muted-foreground mb-4">
                  Não recebeu o email? Verifique sua pasta de spam.
                </p>
                <button
                  onClick={() => switchView("login")}
                  className="w-full py-3 border border-foreground text-foreground text-xs tracking-widest uppercase font-medium hover:bg-foreground hover:text-background transition-colors"
                >
                  Voltar para Login
                </button>
              </div>
            </div>
          )}

          {(view === "login" || view === "register") && (
            <>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                {view === "register" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="firstName" className="text-xs tracking-wide text-muted-foreground uppercase">
                        Nome
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Seu nome"
                        className={`w-full bg-transparent border-b py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors ${
                          errors.firstName ? "border-red-500" : "border-muted focus:border-foreground"
                        }`}
                      />
                      {errors.firstName && (
                        <span className="text-xs text-red-500 mt-0.5">{errors.firstName}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="lastName" className="text-xs tracking-wide text-muted-foreground uppercase">
                        Sobrenome
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Seu sobrenome"
                        className={`w-full bg-transparent border-b py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors ${
                          errors.lastName ? "border-red-500" : "border-muted focus:border-foreground"
                        }`}
                      />
                      {errors.lastName && (
                        <span className="text-xs text-red-500 mt-0.5">{errors.lastName}</span>
                      )}
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs tracking-wide text-muted-foreground uppercase">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className={`w-full bg-transparent border-b py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors ${
                      errors.email ? "border-red-500" : "border-muted focus:border-foreground"
                    }`}
                  />
                  {errors.email && (
                    <span className="text-xs text-red-500 mt-0.5">{errors.email}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-xs tracking-wide text-muted-foreground uppercase">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className={`w-full bg-transparent border-b py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors pr-10 ${
                        errors.password ? "border-red-500" : "border-muted focus:border-foreground"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                      ) : (
                        <Eye className="w-4 h-4" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="text-xs text-red-500 mt-0.5">{errors.password}</span>
                  )}
                </div>

                {serverError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex flex-col gap-2 text-sm text-red-600 dark:text-red-400">
                    <span>{serverError}</span>
                    {isEmailUnverified && (
                      <button
                        type="button"
                        onClick={handleResendEmail}
                        disabled={isResending}
                        className="text-xs font-medium underline underline-offset-4 self-start flex items-center gap-2 mt-1 transition-colors text-red-600 dark:text-red-400 md:text-red-700 md:dark:text-red-300 md:hover:text-red-600 md:dark:hover:text-red-400"
                      >
                        {isResending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Reenviar email de verificação
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 py-4 bg-foreground text-background text-xs tracking-widest uppercase font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {view === "login" ? "Entrar" : "Criar Conta"}
                </button>
              </form>

              <div className="mt-8 text-center">
                {view === "login" ? (
                  <p className="text-sm text-muted-foreground">
                    Ainda não possui uma conta?{" "}
                    <button
                      onClick={() => switchView("register")}
                      className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity font-medium"
                    >
                      Registrar-se
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Já possui uma conta?{" "}
                    <button
                      onClick={() => switchView("login")}
                      className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity font-medium"
                    >
                      Entrar
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
