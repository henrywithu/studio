/** Original content and geometry, separated from the client application. */
export interface ElementNode {
  tag: string;
  attrs: Record<string, string>;
  children: ContentNode[];
}
export type ContentNode = ElementNode | string;
export interface PageContent {
  route: string;
  title: string;
  description: string;
  mainClass: string;
  pageClass: string;
  sections: ElementNode[];
  meta: { videoUrls: { key: string; url: string }[] };
}
