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
  Layers,
  Lock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/landing/reveal";
import { WaveDivider } from "@/components/landing/wave-divider";
import { Faq } from "@/components/landing/faq";

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

const FACTS = [
  { icon: Layers, label: "Imagem, carrossel e Reel num único compositor" },
  { icon: Lock, label: "Login oficial da Meta — sua senha nunca passa pelo Publio" },
  { icon: RefreshCw, label: "Publicação com retentativa automática" },
] as const;

const STATUS_ROWS = [
  { icon: CheckCircle2, tone: "text-success", label: "Promoção de verão", status: "Publicado" },
  { icon: Loader2, tone: "text-warning-foreground", label: "Bastidores da loja", status: "Publicando" },
  { icon: AlertTriangle, tone: "text-destructive", label: "Depoimento cliente", status: "Requer atenção" },
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
          <a href="#faq" className="hover:text-foreground">
            Perguntas frequentes
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
        <section className="relative overflow-hidden px-6 pt-20 pb-16 md:px-12">
          <div
            aria-hidden
            className="bg-brand-gradient pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          />
          <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
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
          </Reveal>

          {/* Illustrative product preview */}
          <Reveal delay={150} className="relative mx-auto mt-16 max-w-4xl">
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
          </Reveal>
        </section>

        {/* Honest facts strip — no fabricated metrics */}
        <Reveal className="border-y border-border bg-secondary/40 px-6 py-6 md:px-12">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:justify-between">
            {FACTS.map((fact) => (
              <div key={fact.label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <fact.icon className="size-4 shrink-0 text-primary" />
                {fact.label}
              </div>
            ))}
          </div>
        </Reveal>

        <WaveDivider bgClassName="bg-secondary/40" fillClassName="text-background" />

        {/* Showcase: Compositor */}
        <section className="px-6 py-16 md:px-12">
          <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <Reveal className="flex flex-col gap-4">
              <span className="w-fit rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                Compositor
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Escreva uma vez, publique com confiança
              </h2>
              <p className="text-muted-foreground">
                Monte imagem, carrossel ou Reel com pré-visualização fiel ao Instagram — legenda,
                mídia e conta de destino, tudo revisado antes de sair do rascunho.
              </p>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-success" /> Carrossel com até 10 itens, na ordem que você escolher
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-success" /> Pré-visualização igual ao feed do Instagram
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-success" /> Publique agora ou agende para depois
                </li>
              </ul>
            </Reveal>
            <Reveal delay={150}>
              <Card className="overflow-hidden py-0 shadow-xl">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <div className="bg-brand-gradient size-6 shrink-0 rounded-full" />
                  <span className="text-xs font-medium">sua_marca</span>
                </div>
                <div className="flex aspect-square items-center justify-center bg-muted">
                  <ImagePlus className="size-10 text-muted-foreground" />
                </div>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="h-2 w-4/5 rounded-full bg-accent" />
                  <div className="h-2 w-3/5 rounded-full bg-accent" />
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-md bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">
                      Carrossel
                    </span>
                    <span className="rounded-md bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">
                      3 itens
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* Showcase: Confiabilidade */}
        <section className="bg-secondary/40 px-6 py-16 md:px-12">
          <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <Reveal className="order-2 lg:order-1">
              <Card className="py-0 shadow-xl">
                <CardContent className="flex flex-col divide-y divide-border p-0">
                  {STATUS_ROWS.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="text-sm">{row.label}</span>
                      <span className={"flex items-center gap-1.5 text-xs font-medium " + row.tone}>
                        <row.icon className="size-3.5" />
                        {row.status}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </Reveal>
            <Reveal delay={150} className="order-1 flex flex-col gap-4 lg:order-2">
              <span className="w-fit rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                Confiabilidade
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Você sempre sabe o que está acontecendo
              </h2>
              <p className="text-muted-foreground">
                Cada publicação passa por um pipeline com status claro — da fila até o link real no
                Instagram. Se algo falhar, o Publio tenta de novo automaticamente e avisa se
                precisar da sua ação.
              </p>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-success" /> Histórico completo de cada tentativa
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-success" /> Alerta se um token do Instagram expirar
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-success" /> Link direto pra publicação assim que sai do ar
                </li>
              </ul>
            </Reveal>
          </div>
        </section>

        <WaveDivider bgClassName="bg-secondary/40" fillClassName="text-background" flip />

        {/* Features */}
        <section id="recursos" className="px-6 py-20 md:px-12">
          <div className="mx-auto max-w-5xl">
            <Reveal className="mx-auto mb-12 max-w-xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Tudo que uma operação de conteúdo precisa
              </h2>
              <p className="mt-3 text-muted-foreground">
                Sem planilha, sem lembrete manual, sem torcer pra não esquecer de postar.
              </p>
            </Reveal>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 60}>
                  <Card className="h-full border-border/80">
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
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="border-t border-border bg-secondary/40 px-6 py-20 md:px-12">
          <div className="mx-auto max-w-5xl">
            <Reveal className="mx-auto mb-14 max-w-xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Como funciona</h2>
              <p className="mt-3 text-muted-foreground">Quatro passos, do primeiro acesso à publicação.</p>
            </Reveal>
            <div className="relative grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div
                aria-hidden
                className="absolute top-[18px] right-0 left-0 hidden h-px bg-border lg:block"
              />
              {STEPS.map((step, index) => (
                <Reveal key={step.title} delay={index * 80} className="relative flex flex-col gap-3">
                  <span className="bg-brand-gradient relative z-10 flex size-9 items-center justify-center rounded-full text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <WaveDivider bgClassName="bg-secondary/40" fillClassName="text-background" />

        {/* FAQ */}
        <section id="faq" className="px-6 py-20 md:px-12">
          <Reveal className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Perguntas frequentes</h2>
          </Reveal>
          <Reveal delay={100}>
            <Faq />
          </Reveal>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-20 md:px-12">
          <Reveal className="bg-brand-gradient relative mx-auto flex max-w-4xl flex-col items-center gap-6 overflow-hidden rounded-2xl px-8 py-16 text-center text-white">
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
          </Reveal>
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
              <a href="#faq" className="hover:text-foreground">
                Perguntas frequentes
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
