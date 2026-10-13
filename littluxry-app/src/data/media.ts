export type MediaItem = {
  id: string
  type: 'video' | 'image'
  src: string
  label: string
  tags: string[]
}

export const mediaLibrary: MediaItem[] = [
  {
    id: 'vid-fringe',
    type: 'video',
    src: '/assets/video.mp4',
    label: 'Fringe Muse — 5 Colors Rotating',
    tags: ['hero', 'fringe', 'video'],
  },
  {
    id: 'img-rosso-1',
    type: 'image',
    src: '/assets/rosso-1.jpg',
    label: 'Rosso Bucket 01',
    tags: ['rosso', 'product'],
  },
  {
    id: 'img-rosso-2',
    type: 'image',
    src: '/assets/rosso-2.jpg',
    label: 'Rosso Bucket 02',
    tags: ['rosso', 'product'],
  },
  {
    id: 'img-rosso-3',
    type: 'image',
    src: '/assets/rosso-3.jpg',
    label: 'Rosso Bucket 03',
    tags: ['rosso', 'product'],
  },
  {
    id: 'img-riviera-1',
    type: 'image',
    src: '/assets/riviera-1.jpg',
    label: 'Riviera Straw 01',
    tags: ['riviera', 'product'],
  },
  {
    id: 'img-riviera-2',
    type: 'image',
    src: '/assets/riviera-2.jpg',
    label: 'Riviera Straw 02',
    tags: ['riviera', 'product'],
  },
  {
    id: 'img-riviera-3',
    type: 'image',
    src: '/assets/riviera-3.jpg',
    label: 'Riviera Straw 03',
    tags: ['riviera', 'product'],
  },
  {
    id: 'img-fringe-hero',
    type: 'image',
    src: '/assets/fringe-hero.png',
    label: 'Fringe Hero Still',
    tags: ['fringe', 'hero'],
  },
]
