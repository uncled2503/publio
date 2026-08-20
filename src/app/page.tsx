import Link from "next/link";
import {
  CalendarClock,
  ImagePlus,
  Send,
  ShieldCheck,
  Users,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";

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

const FEATURES = [
  {
    icon: CalendarClock,
    title: "Calendário de conteúdo",
    description: "Veja toda a operação do mês num só lugar, com status de cada publicação em tempo real.",
  },
  {
    icon: ImagePlus,
    title: "Compositor completo",
    description: "Imagem, carrossel de até 10 itens ou Reel — com pré-visualização fiel ao Instagram.",
  },
  {
    icon: Users,
    title: "Workspaces e equipe",
    description: "Convide seu time com papéis (owner, admin, membro) e mantenha cada cliente separado.",
  },
  {
    icon: RefreshCw,
    title: "Retentativa automática",
    description: "Falhas temporárias da Meta são reprocessadas sozinhas, sem você precisar reagendar nada.",
  },
  {
    icon: Clock,
    title: "Fuso horário por workspace",
    description: "Agende no horário certo pra cada operação, sem fazer contas de fuso na cabeça.",
  },
  {
    icon: ShieldCheck,
    title: "Tokens criptografados",
    description: "Acesso ao Instagram guardado com criptografia autenticada — nunca em texto plano.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur md:px-12">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#recursos" className="hover:text-foreground">
            Recursos
          </a>
          <a href="#como-funciona" className="hover:text-foreground">
            Como funciona
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Começar grátis</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-20 pb-24 md:px-12">
          <div
            aria-hidden
            className="bg-brand-gradient pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <Sparkles className="size-3.5" />
              Publicação 100% via API oficial da Meta
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              Planeje hoje.{" "}
              <span className="text-brand-gradient">Publique automaticamente</span> depois.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground text-balance">
              Conecte seu Instagram profissional, crie conteúdo, agende e acompanhe cada
              publicação — sem senhas, sem automação por fora das regras da Meta.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Começar grátis <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Já tenho uma conta</Link>
              </Button>
            </div>
          </div>

          {/* Illustrative product preview */}
          <div className="relative mx-auto mt-16 max-w-4xl">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
                <span className="size-2.5 rounded-full bg-destructive/60" />
                <span className="size-2.5 rounded-full bg-warning/60" />
                <span className="size-2.5 rounded-full bg-success/60" />
                <span className="ml-3 text-xs text-muted-foreground">publio.website/app/calendario</span>
              </div>
              <div className="grid grid-cols-7 gap-px bg-border p-px">
                {Array.from({ length: 28 }).map((_, i) => {
                  const hasPost = [3, 8, 11, 15, 19, 22, 26].includes(i);
                  const isBrand = [8, 19].includes(i);
                  return (
                    <div key={i} className="flex min-h-16 flex-col gap-1 bg-card p-2">
                      <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                      {hasPost ? (
                        <span
                          className={
                            "h-2 rounded-full " + (isBrand ? "bg-brand-gradient" : "bg-accent-foreground/30")
                          }
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="recursos" className="px-6 py-20 md:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto mb-12 max-w-xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Tudo que uma operação de conteúdo precisa
              </h2>
              <p className="mt-3 text-muted-foreground">
                Sem planilha, sem lembrete manual, sem torcer pra não esquecer de postar.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="border-border/80">
                  <CardHeader>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
                      <feature.icon className="size-5 text-accent-foreground" />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {feature.description}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="border-t border-border bg-secondary/40 px-6 py-20 md:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto mb-12 max-w-xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Como funciona</h2>
              <p className="mt-3 text-muted-foreground">Quatro passos, do primeiro acesso à publicação.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <div key={step.title} className="flex flex-col gap-3">
                  <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-full text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-20 md:px-12">
          <div className="bg-brand-gradient relative mx-auto flex max-w-4xl flex-col items-center gap-6 overflow-hidden rounded-2xl px-8 py-16 text-center text-white">
            <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Comece a agendar suas publicações hoje
            </h2>
            <p className="max-w-lg text-white/85">
              Conecte sua conta profissional do Instagram e crie sua primeira publicação em minutos.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/signup">
                Começar grátis <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-10 text-sm text-muted-foreground md:px-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-2">
            <Logo />
            <p className="max-w-xs text-xs text-muted-foreground">
              Agendamento e publicação no Instagram via API oficial da Meta.
            </p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Produto</span>
              <a href="#recursos" className="hover:text-foreground">
                Recursos
              </a>
              <a href="#como-funciona" className="hover:text-foreground">
                Como funciona
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground">Legal</span>
              <Link href="/legal/privacy" className="hover:text-foreground">
                Privacidade
              </Link>
              <Link href="/legal/terms" className="hover:text-foreground">
                Termos
              </Link>
              <Link href="/legal/data-deletion" className="hover:text-foreground">
                Exclusão de dados
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-5xl border-t border-border pt-6 text-xs">
          © {new Date().getFullYear()} Publio
        </div>
      </footer>
    </div>
  );
}
