import { prisma } from "@/server/db/prisma";
import { AuditService } from "@/server/services/audit-service";

export class FolderNotFoundError extends Error {
  constructor() {
    super("Pasta não encontrada neste workspace.");
    this.name = "FolderNotFoundError";
  }
}

export class DuplicateFolderNameError extends Error {
  constructor() {
    super("Já existe uma pasta com esse nome neste local.");
    this.name = "DuplicateFolderNameError";
  }
}

async function assertFolderInWorkspace(workspaceId: string, folderId: string) {
  const folder = await prisma.mediaFolder.findFirst({ where: { id: folderId, workspaceId } });
  if (!folder) throw new FolderNotFoundError();
  return folder;
}

export const MediaFolderService = {
  /** Direct child folders of `parentId` (or the root, when `null`), for the current folder view. */
  async listChildren(workspaceId: string, parentId: string | null) {
    return prisma.mediaFolder.findMany({
      where: { workspaceId, parentId },
      orderBy: { name: "asc" },
    });
  },

  /** Root-to-current chain of folders, for the breadcrumb. */
  async getBreadcrumb(workspaceId: string, folderId: string | null) {
    const trail: Array<{ id: string; name: string }> = [];
    let currentId = folderId;
    while (currentId) {
      const folder: { id: string; name: string; parentId: string | null } = await assertFolderInWorkspace(
        workspaceId,
        currentId,
      );
      trail.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parentId;
    }
    return trail;
  },

  /** Every folder in the workspace, flattened, for the "mover para pasta" picker. */
  async listAllFlat(workspaceId: string) {
    return prisma.mediaFolder.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, parentId: true },
    });
  },

  async create(params: { workspaceId: string; actorUserId: string; name: string; parentId: string | null }) {
    const name = params.name.trim().slice(0, 120);
    if (!name) throw new Error("Informe um nome para a pasta.");

    if (params.parentId) {
      await assertFolderInWorkspace(params.workspaceId, params.parentId);
    }

    const folder = await prisma.mediaFolder
      .create({
        data: { workspaceId: params.workspaceId, parentId: params.parentId, name },
      })
      .catch((error: unknown) => {
        if (isUniqueConstraintError(error)) throw new DuplicateFolderNameError();
        throw error;
      });

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: "media_folder.created",
      resourceType: "media_folder",
      resourceId: folder.id,
      metadata: { name: folder.name, parentId: folder.parentId },
    });

    return folder;
  },

  async rename(params: { workspaceId: string; actorUserId: string; folderId: string; name: string }) {
    const folder = await assertFolderInWorkspace(params.workspaceId, params.folderId);
    const name = params.name.trim().slice(0, 120);
    if (!name) throw new Error("Informe um nome para a pasta.");

    await prisma.mediaFolder
      .update({ where: { id: folder.id }, data: { name } })
      .catch((error: unknown) => {
        if (isUniqueConstraintError(error)) throw new DuplicateFolderNameError();
        throw error;
      });

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: "media_folder.renamed",
      resourceType: "media_folder",
      resourceId: folder.id,
      metadata: { from: folder.name, to: name },
    });
  },

  /** Deletes the folder (and, via DB cascade, its subfolders) — media inside is unfiled, never deleted. */
  async delete(params: { workspaceId: string; actorUserId: string; folderId: string }) {
    const folder = await assertFolderInWorkspace(params.workspaceId, params.folderId);

    await prisma.mediaFolder.delete({ where: { id: folder.id } });

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: "media_folder.deleted",
      resourceType: "media_folder",
      resourceId: folder.id,
      metadata: { name: folder.name },
    });
  },

  /** Media directly inside `folderId` (or the unfiled root bucket, when `null`), in display order. */
  async listMedia(workspaceId: string, folderId: string | null) {
    return prisma.mediaAsset.findMany({
      where: { workspaceId, folderId, deletedAt: null },
      orderBy: { position: "asc" },
    });
  },

  /** Reparents media into `folderId` (or unfiles it, when `null`), appending after whatever's already there. */
  async moveMedia(params: { workspaceId: string; actorUserId: string; mediaAssetIds: string[]; folderId: string | null }) {
    if (params.mediaAssetIds.length === 0) return;
    if (params.folderId) {
      await assertFolderInWorkspace(params.workspaceId, params.folderId);
    }

    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: params.mediaAssetIds }, workspaceId: params.workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (assets.length !== params.mediaAssetIds.length) {
      throw new Error("Uma ou mais mídias selecionadas não foram encontradas.");
    }

    const maxPosition = await prisma.mediaAsset.aggregate({
      where: { workspaceId: params.workspaceId, folderId: params.folderId },
      _max: { position: true },
    });
    let nextPosition = (maxPosition._max.position ?? -1) + 1;

    await prisma.$transaction(
      params.mediaAssetIds.map((id) =>
        prisma.mediaAsset.update({ where: { id }, data: { folderId: params.folderId, position: nextPosition++ } }),
      ),
    );

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: "media.moved_to_folder",
      resourceType: "media_folder",
      resourceId: params.folderId,
      metadata: { mediaAssetIds: params.mediaAssetIds, count: params.mediaAssetIds.length },
    });
  },

  /** Persists a manual drag-reorder within one folder. */
  async reorderMedia(params: { workspaceId: string; folderId: string | null; orderedMediaAssetIds: string[] }) {
    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: params.orderedMediaAssetIds }, workspaceId: params.workspaceId, folderId: params.folderId },
      select: { id: true },
    });
    if (assets.length !== params.orderedMediaAssetIds.length) {
      throw new Error("A lista de mídias não corresponde ao conteúdo atual da pasta.");
    }

    await prisma.$transaction(
      params.orderedMediaAssetIds.map((id, index) =>
        prisma.mediaAsset.update({ where: { id }, data: { position: index } }),
      ),
    );
  },
};

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}
