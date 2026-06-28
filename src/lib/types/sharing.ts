export type ExportStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

export interface ShareLink {
  id: string;
  resumeId: string;
  token: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface ExportJob {
  id: string;
  resumeId: string;
  requestedBy: string;
  status: ExportStatus;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
}
