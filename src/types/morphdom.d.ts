declare module 'morphdom' {
  export interface MorphdomOptions {
    childrenOnly?: boolean;
    onBeforeElUpdated?: (fromEl: Element, toEl: Element) => boolean;
  }

  export default function morphdom(
    fromNode: Element,
    toNode: Element | string,
    options?: MorphdomOptions
  ): Element;
}
