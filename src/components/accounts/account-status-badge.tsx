import type { TokenStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const LABELS: Record<TokenStatus, string> = {
  CONNECTED: "Conectado",
  EXPIRING: "Expirando",
  REAUTH_REQUIRED: "Reconectar",
  PERMISSION_REVOKED: "Permissão revogada",
  DISCONNECTED: "Desconectado",
  ERROR: "Erro",
};

const VARIANTS: Record<TokenStatus, "success" | "warning" | "destructive" | "secondary"> = {
  CONNECTED: "success",
  EXPIRING: "warning",
  REAUTH_REQUIRED: "destructive",
  PERMISSION_REVOKED: "destructive",
  DISCONNECTED: "secondary",
  ERROR: "destructive",
};

export function AccountStatusBadge({ status }: { status: TokenStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
