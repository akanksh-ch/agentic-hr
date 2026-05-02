export type PolicyChunk = {
  text: string;
  embedding: number[];
  metadata: {
    source: string;
    section: string;
    chunkIndex: number;
    category: string;
    version: string;
  };
  createdAt: Date;
};

export type RetrievedPolicyChunk = Omit<PolicyChunk, "embedding" | "createdAt"> & {
  score?: number;
};
