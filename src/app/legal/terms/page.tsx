import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de Uso — Publio" };

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Termos de Uso</h1>
      <p className="text-sm text-muted-foreground">
        Rascunho de trabalho — pendente de revisão jurídica antes do lançamento em produção. Não
        constitui declaração de conformidade legal.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">1. O serviço</h2>
        <p className="text-sm text-muted-foreground">
          Publio é uma plataforma de agendamento e publicação de conteúdo no Instagram, operando
          exclusivamente por meio das APIs oficiais da Meta para contas profissionais (Business ou
          Creator).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">2. Contas e workspaces</h2>
        <p className="text-sm text-muted-foreground">
          Cada usuário é responsável por manter a confidencialidade de suas credenciais. O
          proprietário (OWNER) de um workspace é responsável pelas ações de seus membros dentro do
          workspace.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">3. Uso aceitável</h2>
        <p className="text-sm text-muted-foreground">
          É proibido usar o Publio para publicar conteúdo que viole as políticas da Meta/Instagram,
          para automação não autorizada, ou para qualquer atividade ilegal.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">4. Disponibilidade</h2>
        <p className="text-sm text-muted-foreground">
          Publicações agendadas dependem da disponibilidade das APIs da Meta e da validade da
          conexão da conta do Instagram. Publio realiza tentativas automáticas em caso de falhas
          temporárias, mas não garante publicação em cenários de indisponibilidade prolongada do
          provedor ou revogação de permissões pelo usuário.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">5. Planos e cobrança</h2>
        <p className="text-sm text-muted-foreground">
          Assinaturas são processadas via Stripe e cobradas conforme o plano selecionado. O
          cancelamento pode ser feito a qualquer momento pelo portal de faturamento.
        </p>
      </section>
    </div>
  );
}
