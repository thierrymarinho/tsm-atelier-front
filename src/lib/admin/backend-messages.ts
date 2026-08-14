import type { AdminProblemDetail, OrderStatus } from '@/lib/types/admin';
import { translateOrderStatus } from '@/lib/admin/order-status';
import { translateCategory, translateTargetAudience } from '@/lib/utils/translations';
import type { Category, TargetAudience } from '@/lib/types/api';

export function translateBackendDetail(problem: AdminProblemDetail): string | null {
  if (problem.title === 'Invalid status transition' && problem.from && problem.to) {
    return (
      `Um pedido em "${translateOrderStatus(problem.from as OrderStatus)}" não pode ir para ` +
      `"${translateOrderStatus(problem.to as OrderStatus)}".`
    );
  }

  const detail = problem.detail?.trim();
  if (!detail) return null;

  let match: RegExpExecArray | null;

  match = /^SKU (\S+) has (-?\d+) units available; this adjustment would leave it at (-?\d+)\.$/.exec(detail);
  if (match) {
    const [, code, available, target] = match;
    return (
      `O SKU ${code} tem ${available} ${available === '1' ? 'unidade disponível' : 'unidades disponíveis'} — ` +
      `este ajuste o deixaria com ${target}. Confira a quantidade e lance de novo.`
    );
  }

  match = /^SKU (\S+) is now at (-?\d+) units \(version \d+\), but the count was made against version \d+\./.exec(detail);
  if (match) {
    const [, code, current] = match;
    return (
      `O SKU ${code} mudou desde a leitura — agora está com ${current} ` +
      `${current === '1' ? 'unidade' : 'unidades'}. Recarregue e confira antes de gravar a contagem.`
    );
  }

  match = /^Stock for SKU (\S+) cannot be changed through the product form\./.exec(detail);
  if (match) {
    return (
      `O estoque do SKU ${match[1]} não se edita pelo formulário do produto — ` +
      `use o ajuste de estoque, na linha do próprio SKU.`
    );
  }

  match = /^New SKU \(size (\w+)\) requires an initial stockQuantity\.$/.exec(detail);
  if (match) {
    return `O SKU novo (tamanho ${match[1]}) precisa do estoque inicial.`;
  }

  if (detail === 'The promotional price must be lower than the regular price.') {
    return 'O preço promocional precisa ser menor que o preço de tabela.';
  }

  match = /^Category (\w+) is not valid for audience (WOMEN|MEN)$/.exec(detail);
  if (match) {
    return (
      `A categoria "${translateCategory(match[1] as Category)}" não vale para o público ` +
      `"${translateTargetAudience(match[2] as TargetAudience)}". Escolha outra categoria — ` +
      `ou troque o público.`
    );
  }

  match = /^Total fabric composition percentage must be exactly 100%, but was (-?\d+)%$/.exec(detail);
  if (match) {
    const total = Number(match[1]);
    const gap = 100 - total;
    return (
      `A composição do tecido precisa somar exatamente 100% — está em ${total}%` +
      (gap > 0 ? ` (faltam ${gap}).` : ` (passou ${-gap}).`)
    );
  }

  match = /^Fabric composition cannot repeat the same material: (.+)$/.exec(detail);
  if (match) {
    return `A composição repete o mesmo material: ${match[1]}.`;
  }

  match = /^Care instructions must not give two answers for the same axis: (.+)$/.exec(detail);
  if (match) {
    return `A etiqueta de cuidados tem instruções contraditórias no mesmo eixo: ${match[1]}.`;
  }

  match = /^(Product|Collection) (\d+) is not deleted\.$/.exec(detail);
  if (match) {
    const noun = match[1] === 'Product' ? 'O produto' : 'A coleção';
    return `${noun} ${match[2]} não está mais entre os removidos — alguém já o restaurou. Recarregue a listagem.`;
  }

  match = /^Product already exists with identifier: (.+)$/.exec(detail);
  if (match) {
    return `Já existe um produto chamado “${match[1]}”. O nome precisa ser único.`;
  }

  match = /^SKU already exists with identifier: (.+)$/.exec(detail);
  if (match) {
    return (
      `Os códigos de SKU ${match[1]} passaram a pertencer a outro produto enquanto este estava ` +
      `removido. Renomeie-os no outro produto antes de restaurar.`
    );
  }

  return null;
}
