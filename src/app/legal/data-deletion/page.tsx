import type { Metadata } from "next";

export const metadata: Metadata = { title: "Exclusão de Dados — Publio" };

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Exclusão de Dados</h1>

      {id ? (
        <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm">
          Solicitação processada. Código de confirmação: <code>{id}</code>
        </div>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">O que acontece quando você desconecta ou remove o Publio</h2>
        <p className="text-sm text-muted-foreground">
          Quando você desconecta uma conta do Instagram no Publio, ou remove o acesso do Publio
          pelas configurações do Instagram/Facebook, o token de acesso dessa conta é
          imediatamente apagado e a conexão é encerrada. O Publio para de fazer qualquer chamada
          à API da Meta em nome dessa conta a partir desse momento.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Solicitar exclusão manualmente</h2>
        <p className="text-sm text-muted-foreground">
          Você pode desconectar sua conta do Instagram a qualquer momento em{" "}
          <strong>Contas sociais</strong> dentro do Publio — isso já apaga o token de acesso
          armazenado. Para solicitar a exclusão completa dos seus dados de cadastro (conta,
          workspace, publicações, mídia), envie um pedido para o email de suporte informado no
          seu workspace, ou peça ao administrador do workspace para excluí-lo em{" "}
          <strong>Configurações → Zona de risco</strong>.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">O que é apagado e o que permanece</h2>
        <p className="text-sm text-muted-foreground">
          O token de acesso e o vínculo com a conta do Instagram são apagados imediatamente.
          Publicações já enviadas ao Instagram continuam existindo lá — o Publio não tem controle
          sobre conteúdo já publicado na plataforma da Meta; a exclusão dessas publicações deve
          ser feita diretamente no Instagram.
        </p>
      </section>
    </div>
  );
}
