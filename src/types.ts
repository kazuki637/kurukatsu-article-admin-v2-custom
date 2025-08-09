
export type ArticleStatus = 'published';

export type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'image'; url: string; alt?: string; fileName?: string };

export interface Article {
  title: string;
  subtitle: string;
  status: ArticleStatus;
  blocks: Block[];         // ordered content blocks
  headerUrl: string;       // header image (16:9, <=1MB)
  updatedAt: any;          // Firebase Timestamp
  publishedAt: any | null; // Firebase Timestamp or null
  author?: string;
  summary?: string;
}
