"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "Preciso saber programar para usar o Publio?",
    answer:
      "Não. Você conecta sua conta do Instagram, escreve a legenda, escolhe a mídia e agenda — tudo pela interface, sem código.",
  },
  {
    question: "O Publio pede minha senha do Instagram?",
    answer:
      "Nunca. A conexão é feita 100% pelo fluxo oficial de login da Meta (OAuth) — você autoriza direto no Instagram, e o Publio nunca vê nem armazena sua senha.",
  },
  {
    question: "Existe risco de bloqueio da minha conta?",
    answer:
      "O Publio publica exclusivamente pela API oficial da Meta para contas profissionais (Business ou Creator) — não usamos automação por fora das regras da plataforma, que é o que costuma gerar bloqueio.",
  },
  {
    question: "O que acontece se uma publicação falhar?",
    answer:
      "Falhas temporárias da Meta são reprocessadas automaticamente. Se algo precisar da sua atenção (token expirado, mídia inválida), você vê um alerta claro no painel e no calendário.",
  },
  {
    question: "Consigo usar com mais de uma conta ou cliente?",
    answer:
      "Sim — cada workspace tem suas próprias contas conectadas, mídia e equipe, então você pode manter clientes ou marcas completamente separados.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim, sem contrato de fidelidade. Você pode desconectar suas contas do Instagram ou excluir seu workspace a qualquer momento em Configurações.",
  },
] as const;

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={faq.question} className="rounded-lg border border-border bg-card">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium"
              aria-expanded={isOpen}
            >
              {faq.question}
              <ChevronDown
                className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
