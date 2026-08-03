import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Github, Linkedin } from "lucide-react";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "TSM Atelier | Luxury Fashion",
  description: "Exquisite craftsmanship and timeless luxury.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`} data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <Header />
          
          {/* Main Content */}
          <main className="flex-1 flex flex-col">{children}</main>

        {/* Minimal Footer */}
        <footer className="bg-background text-foreground py-16 border-t border-muted">
          <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-6 text-center">
            
            {/* Social Links */}
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

            {/* Copyright & Educational Warning */}
            <div className="flex flex-col gap-2 text-xs tracking-wider uppercase text-muted-foreground">
              <p>© 2026 TSM Atelier. All rights reserved.</p>
              <p className="text-[10px] tracking-normal normal-case opacity-70 max-w-md mx-auto leading-relaxed">
                Este é um projeto desenvolvido exclusivamente para fins educativos e de demonstração de portfólio.
              </p>
            </div>

          </div>
        </footer>
        </Providers>
      </body>
    </html>
  );
}
