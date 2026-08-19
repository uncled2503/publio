import type { MediaProcessingStatus } from "@prisma/client";
import { Loader2, CheckCircle2, TriangleAlert, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const CONFIG: Record<
  MediaProcessingStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary"; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: { label: "Aguardando", variant: "secondary", icon: Clock },
  PROCESSING: { label: "Processando", variant: "warning", icon: Loader2 },
  READY: { label: "Pronto", variant: "success", icon: CheckCircle2 },
  INVALID: { label: "Inválido", variant: "destructive", icon: TriangleAlert },
};

export function MediaProcessingBadge({ status }: { status: MediaProcessingStatus }) {
  const { label, variant, icon: Icon } = CONFIG[status];
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={status === "PROCESSING" ? "size-3 animate-spin" : "size-3"} />
      {label}
    </Badge>
  );
}
