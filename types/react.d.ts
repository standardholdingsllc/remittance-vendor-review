declare module 'react' {
  export interface ChangeEvent<T = Element> extends Event {
    target: T & EventTarget;
  }
  
  export interface HTMLInputElement extends Element {
    files: FileList | null;
    value: string;
  }
  
  export function useState<S>(initialState: S | (() => S)): [S, (newState: S) => void];
  export namespace React {
    interface ChangeEvent<T = Element> extends Event {
      target: T & EventTarget;
    }
  }
}

declare global {
  namespace React {
    interface ChangeEvent<T = Element> extends Event {
      target: T & EventTarget;
    }
  }
  
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
} 