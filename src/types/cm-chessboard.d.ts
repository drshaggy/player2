declare module 'cm-chessboard' {
  export * from 'cm-chessboard/src/Chessboard';
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
