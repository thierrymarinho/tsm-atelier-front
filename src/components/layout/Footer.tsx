import { Github, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-background text-foreground py-16 border-t border-muted">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-6 text-center">

        <div className="flex items-center gap-6">
          <a
            href="https://www.linkedin.com/in/thierry-marinho/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="w-5 h-5" strokeWidth={1.5} />
          </a>
          <a
            href="https://github.com/thierrymarinho"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" strokeWidth={1.5} />
          </a>
        </div>

        <div className="flex flex-col gap-2 text-xs tracking-wider uppercase text-muted-foreground">
          <p>© 2026 TSM Atelier. All rights reserved.</p>
          <p className="text-[10px] tracking-normal normal-case opacity-70 max-w-md mx-auto leading-relaxed">
            Este é um projeto desenvolvido exclusivamente para fins educativos e de demonstração de portfólio.
          </p>
        </div>

      </div>
    </footer>
  );
}
