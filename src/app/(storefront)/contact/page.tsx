import Link from "next/link";
import { Github, Linkedin, Mail } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-20 mt-16 sm:mt-20">
      <div className="mb-12 md:mb-16 text-center">
        <h1 className="font-serif text-3xl md:text-5xl tracking-wide uppercase text-foreground mb-4">
          Fale Conosco
        </h1>
        <p className="text-muted-foreground tracking-widest text-sm uppercase">
          Estamos à disposição
        </p>
      </div>

      <div className="border border-muted bg-muted/5 px-6 py-8 sm:px-10 sm:py-10 mb-12 text-center">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
          A TSM Atelier é um projeto desenvolvido para fins educativos e de demonstração
          de portfólio. Não realizamos vendas reais, e nenhum pedido feito nesta loja gera
          cobrança ou envio.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <h2 className="text-sm font-semibold tracking-widest uppercase text-foreground border-b border-muted pb-4">
          Sobre o projeto
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Para dúvidas técnicas, feedback sobre a implementação ou oportunidades
          profissionais, entre em contato por um dos canais abaixo.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="https://www.linkedin.com/in/thierry-marinho/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 border border-foreground text-foreground text-xs tracking-widest uppercase font-medium hover:bg-foreground hover:text-background transition-colors"
          >
            <Linkedin className="w-4 h-4" strokeWidth={1.5} />
            LinkedIn
          </a>
          <a
            href="https://github.com/thierrymarinho"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 border border-foreground text-foreground text-xs tracking-widest uppercase font-medium hover:bg-foreground hover:text-background transition-colors"
          >
            <Github className="w-4 h-4" strokeWidth={1.5} />
            GitHub
          </a>
        </div>

        <div className="flex items-start gap-3 text-sm text-muted-foreground pt-4 border-t border-muted">
          <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
          <p className="leading-relaxed">
            Já possui uma conta? Notificações sobre seus pedidos de demonstração são
            enviadas para o e-mail cadastrado.
          </p>
        </div>
      </div>

      <div className="mt-16 text-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center px-8 py-4 bg-foreground text-background text-xs font-semibold tracking-[0.2em] uppercase hover:opacity-90 transition-opacity"
        >
          Voltar para a Loja
        </Link>
      </div>
    </div>
  );
}
