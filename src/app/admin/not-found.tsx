import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
      <h1 className="font-serif text-xl md:text-2xl tracking-wide uppercase text-foreground">
        Não encontrado
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
        Esta tela do painel não existe, ou o registro que você procurava foi removido.
      </p>
      <Link
        href="/admin"
        className="mt-8 px-6 py-3 bg-foreground text-background text-xs font-semibold tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
      >
        Voltar ao painel
      </Link>
    </div>
  );
}
