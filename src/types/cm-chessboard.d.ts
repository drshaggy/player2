/* eslint-disable @typescript-eslint/no-explicit-any */
// Type shim for the untyped cm-chessboard library. TODO: Phase 2 — replace
// `any` with proper interfaces once the library's event shape is mapped.
declare module 'cm-chessboard' {
  export class Chessboard {
    constructor(element: HTMLElement, options?: any);
    setPosition(fen: string);
    setOrientation(orientation: 'white' | 'black');
    enableMoveInput(handler: (event: any) => any, color: any);
    removeLegalMovesMarkers();
    addLegalMovesMarkers(moves: any[]);
    // Add other methods as needed
  }
  export const COLOR: any;
  export const INPUT_EVENT_TYPE: any;
}

declare module 'cm-chessboard/src/extensions/markers/Markers' {
  export class Markers {
    constructor(chessboard: any);
    addMarker(pos: string, color: string);
    removeMarker(pos: string);
    clearMarkers();
  }
}

declare module 'cm-chessboard/assets/chessboard.css' {}
