'use client';

import { useState } from 'react';
import { useMockQuery, wait } from '../lib/mock';
import { mockKycDocuments } from '../mock/data';
import type { KycDocument, KycDocumentKind } from '../types';

function loadKycDocuments(): KycDocument[] {
  return mockKycDocuments;
}

export function useKyc() {
  const { data, isLoading } = useMockQuery(loadKycDocuments);
  const [uploads, setUploads] = useState<Partial<Record<KycDocumentKind, KycDocument>>>({});
  const [uploadingKind, setUploadingKind] = useState<KycDocumentKind | null>(null);

  async function upload(kind: KycDocumentKind, file: File) {
    setUploadingKind(kind);
    await wait(900);
    setUploads((current) => ({
      ...current,
      [kind]: { kind, status: 'pending', fileName: file.name, uploadedAt: new Date().toISOString() },
    }));
    setUploadingKind(null);
  }

  const documents = data?.map((document) => uploads[document.kind] ?? document);

  return { data: documents, isLoading, uploadingKind, upload };
}
