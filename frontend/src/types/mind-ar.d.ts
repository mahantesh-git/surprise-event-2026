declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  export class MindARThree {
    constructor(config: {
      container: HTMLElement;
      imageTargetSrc: string;
      maxTrack?: number;
      uiLoading?: string;
      uiScanning?: string;
      uiError?: string;
    });
    start(): Promise<void>;
    stop(): void;
    renderer: any;
    scene: any;
    camera: any;
    addAnchor(targetIndex: number): { group: any; targetIndex: number; onTargetFound: () => void; onTargetLost: () => void };
  }
}
