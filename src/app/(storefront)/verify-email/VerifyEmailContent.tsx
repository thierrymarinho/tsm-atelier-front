"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { consumeAuthIntent } from "@/lib/auth-intent";
import Link from "next/link";

type VerifyState = "loading" | "success" | "error";

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyEmail } = useAuth();
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [destination, setDestination] = useState("/");

  const token = searchParams.get("token");

  const verifyStartedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage("Token de verificação não encontrado.");
      return;
    }

    if (verifyStartedRef.current) return;
    verifyStartedRef.current = true;

    verifyEmail(token)
      .then(() => {
        setDestination(consumeAuthIntent() ?? "/");
        setState("success");
      })
      .catch((error: any) => {
        setState("error");
        const status = error?.response?.status;
        setErrorMessage(
          status === 422
            ? "O link de verificação está incompleto. Abra-o novamente a partir do e-mail."
            : "Este link de verificação é inválido ou expirou. Peça um novo pela tela de login.",
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (state !== "success") return;
    const redirectTimer = setTimeout(() => router.push(destination), 2500);
    return () => clearTimeout(redirectTimer);
  }, [state, destination, router]);

  return (
    <div className="flex-1 w-full flex items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6">

        {state === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-foreground animate-spin" strokeWidth={1.5} />
            <div className="flex flex-col gap-2">
              <h1 className="text-lg font-medium text-foreground tracking-wide">
                Verificando seu email...
              </h1>
              <p className="text-sm text-muted-foreground">
                Aguarde enquanto confirmamos sua conta.
              </p>
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-lg font-medium text-foreground tracking-wide">
                Email verificado com sucesso!
              </h1>
              <p className="text-sm text-muted-foreground">
                Sua conta está ativa. Redirecionando...
              </p>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-lg font-medium text-foreground tracking-wide">
                Falha na verificação
              </h1>
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
            </div>
            <Link
              href="/"
              className="mt-4 px-8 py-3 border border-foreground text-foreground text-xs tracking-widest uppercase font-medium hover:bg-foreground hover:text-background transition-colors"
            >
              Voltar para a loja
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
