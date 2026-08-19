import type { PostStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const LABELS: Record<PostStatus, string> = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendado",
  QUEUED: "Na fila",
  PREPARING: "Preparando",
  PROCESSING_MEDIA: "Processando mídia",
  PUBLISHING: "Publicando",
  PUBLISHED: "Publicado",
  FAILED: "Falhou",
  CANCELED: "Cancelado",
};

const VARIANTS: Record<PostStatus, "success" | "warning" | "destructive" | "secondary"> = {
  DRAFT: "secondary",
  SCHEDULED: "warning",
  QUEUED: "warning",
  PREPARING: "warning",
  PROCESSING_MEDIA: "warning",
  PUBLISHING: "warning",
  PUBLISHED: "success",
  FAILED: "destructive",
  CANCELED: "secondary",
};

export function PostStatusBadge({ status }: { status: PostStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
