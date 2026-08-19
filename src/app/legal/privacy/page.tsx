import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade — Publio" };

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Política de Privacidade</h1>
      <p className="text-sm text-muted-foreground">
        Rascunho de trabalho — pendente de revisão jurídica antes do lançamento em produção. Não
        constitui declaração de conformidade legal.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">1. Dados coletados</h2>
        <p className="text-sm text-muted-foreground">
          Coletamos dados de cadastro (nome, email), dados de uso do produto (posts, mídia,
          configurações de workspace) e, mediante autorização explícita via OAuth da Meta, dados da
          conta profissional do Instagram conectada (identificador da conta, nome de usuário, tipo
          de conta, token de acesso).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">2. Uso dos dados</h2>
        <p className="text-sm text-muted-foreground">
          Os dados são usados exclusivamente para operar o produto: autenticar publicações no
          Instagram por meio das APIs oficiais da Meta, agendar e processar conteúdo, e fornecer
          suporte e faturamento.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">3. Armazenamento e segurança</h2>
        <p className="text-sm text-muted-foreground">
          Tokens de acesso ao Instagram são criptografados em repouso (AES-256-GCM). O acesso ao
          banco de dados é restrito à infraestrutura da aplicação. Consulte{" "}
          <code>docs/security.md</code> no repositório para detalhes técnicos.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">4. Compartilhamento com terceiros</h2>
        <p className="text-sm text-muted-foreground">
          Dados de publicação são enviados à Meta exclusivamente para realizar a publicação
          solicitada pelo usuário. Dados de pagamento são processados pela Stripe. Não vendemos
          dados pessoais a terceiros.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">5. Direitos do titular (LGPD)</h2>
        <p className="text-sm text-muted-foreground">
          Você pode solicitar exportação ou exclusão dos seus dados, e desconectar sua conta do
          Instagram a qualquer momento em Configurações → Contas sociais. Solicitações adicionais
          podem ser enviadas para o email de suporte cadastrado no workspace.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">6. Retenção</h2>
        <p className="text-sm text-muted-foreground">
          Dados de conta são mantidos enquanto o workspace estiver ativo. Registros de auditoria e
          tentativas de publicação são retidos pelo período necessário para diagnóstico de
          incidentes e obrigações contratuais, conforme detalhado em <code>docs/security.md</code>.
        </p>
      </section>
    </div>
  );
}
