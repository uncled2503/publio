import Link from "next/link";
import { CalendarClock, ImagePlus, Send, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  {
    icon: ImagePlus,
    title: "Conecte seu Instagram",
    description: "Autorize oficialmente via Meta — sem senhas, sem navegador automatizado.",
  },
  {
    icon: CalendarClock,
    title: "Crie conteúdo",
    description: "Imagem, carrossel ou Reel. Escreva a legenda e revise no calendário.",
  },
  {
    icon: Send,
    title: "Agende ou publique",
    description: "Publique agora ou agende para o melhor horário, no fuso do seu workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Acompanhe com confiança",
    description: "Retries automáticos, histórico completo e alertas se algo precisar de atenção.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <span className="text-lg font-semibold tracking-tight">Publio</span>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Começar grátis</Link>
          </Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center gap-20 px-6 py-16 md:px-12">
        <section className="flex max-w-2xl flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Planeje hoje. Publique automaticamente depois.
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            Conecte seu Instagram profissional, crie conteúdo, agende e acompanhe cada publicação —
            usando exclusivamente a API oficial da Meta.
          </p>
          <div className="flex gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">Começar grátis</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Já tenho uma conta</Link>
            </Button>
          </div>
        </section>

        <section className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          {STEPS.map((step) => (
            <Card key={step.title}>
              <CardHeader>
                <step.icon className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {step.description}
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="flex items-center justify-between border-t border-border px-6 py-6 text-sm text-muted-foreground md:px-12">
        <span>© {new Date().getFullYear()} Publio</span>
        <div className="flex gap-4">
          <Link href="/legal/privacy" className="hover:text-foreground">
            Privacidade
          </Link>
          <Link href="/legal/terms" className="hover:text-foreground">
            Termos
          </Link>
        </div>
      </footer>
    </div>
  );
}
