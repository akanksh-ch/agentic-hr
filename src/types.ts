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
