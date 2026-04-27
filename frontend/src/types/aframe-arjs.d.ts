import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type AFrameElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  embedded?: boolean;
  arjs?: string;
  preset?: string;
  camera?: boolean;
  'vr-mode-ui'?: string;
  renderer?: string;
  position?: string;
  rotation?: string;
  scale?: string;
  geometry?: string;
  material?: string;
  visible?: boolean;
  'gltf-model'?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': AFrameElementProps;
      'a-marker': AFrameElementProps;
      'a-entity': AFrameElementProps;
      'a-assets': AFrameElementProps;
      'a-asset-item': AFrameElementProps;
    }
  }
}
