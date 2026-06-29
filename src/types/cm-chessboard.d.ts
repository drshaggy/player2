declare module 'cm-chessboard' {
  export default class Chessboard {
    constructor(element: HTMLElement, options?: any);
    setPosition(fen: string);
    setOrientation(orientation: 'white' | 'black');
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
