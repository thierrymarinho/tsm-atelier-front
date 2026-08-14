import { ApiError } from "@/lib/api/client";
import { translateBackendDetail } from "@/lib/admin/backend-messages";
import type { AdminProblemDetail } from "@/lib/types/admin";

export function readProblem(error: unknown): AdminProblemDetail | null {
  if (!(error instanceof ApiError) || !error.response) return null;
  const data = error.response.data;
  if (!data || typeof data !== "object") return null;
  return { ...(data as AdminProblemDetail), status: error.response.status };
}

export function formatAdminError(error: unknown, fallback = "Não foi possível concluir a operação."): string {
  const problem = readProblem(error);
  if (!problem) return fallback;

  const detail = problem.detail?.trim();

  if (problem.status === 400 || problem.status === 409) {
    const translated = translateBackendDetail(problem);
    if (translated) return translated;
  }

  switch (problem.status) {
    case 400:
      return detail ? `Operação recusada: ${detail}` : "Operação recusada pela regra de negócio.";
    case 401:
      return "Sua sessão expirou. Entre novamente para continuar.";
    case 403:
      return "Sem permissão para esta operação.";
    case 404:
      return "Registro não encontrado. Ele pode ter sido removido.";
    case 409:
      return detail ? `Conflito: ${detail}` : "Este registro foi alterado por outra pessoa.";
    case 413:
      return "Arquivo acima do limite permitido.";
    case 415:
      return "Formato de arquivo não suportado.";
    case 422:
      if (problem.fields) {
        const messages = Object.values(problem.fields).filter(Boolean);
        if (messages.length > 0) return messages.join(" · ");
      }
      return detail ?? "Um ou mais campos são inválidos.";
    case 500:
      return "Erro no servidor. Tente novamente em instantes.";
    default:
      return detail ?? fallback;
  }
}

export function readFieldErrors(error: unknown): Record<string, string> | null {
  const problem = readProblem(error);
  return problem?.status === 422 && problem.fields ? problem.fields : null;
}
