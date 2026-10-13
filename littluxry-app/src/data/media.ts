export type MediaItem = {
  id: string
  type: 'video' | 'image'
  src: string
  label: string
  tags: string[]
  sizeLabel?: string
  favorite?: boolean
}

export const mediaLibrary: MediaItem[] = [
  {
    id: 'vid-campaign',
    type: 'video',
    src: '/assets/video.mp4',
    label: 'Campaign Reel 01',
    tags: ['hero', 'fringe', 'video'],
    sizeLabel: '2.4 MB',
    favorite: true,
  },
  {
    id: 'img-noir',
    type: 'image',
    src: '/assets/fringe-hero.png',
    label: 'Noir Studio',
    tags: ['fringe', 'studio'],
    sizeLabel: '2.4 MB',
  },
  {
    id: 'img-blanc',
    type: 'image',
    src: '/assets/riviera-1.jpg',
    label: 'Blanc Flatlay',
    tags: ['fringe', 'flatlay'],
    sizeLabel: '2.4 MB',
  },
  {
    id: 'img-oat',
    type: 'image',
    src: '/assets/riviera-2.jpg',
    label: 'Oat Detail',
    tags: ['fringe', 'detail'],
    sizeLabel: '2.4 MB',
  },
  {
    id: 'img-blush',
    type: 'image',
    src: '/assets/riviera-3.jpg',
    label: 'Blush On Model',
    tags: ['fringe', 'model'],
    sizeLabel: '2.4 MB',
  },
  {
    id: 'img-emerald',
    type: 'image',
    src: '/assets/rosso-1.jpg',
    label: 'Emerald Hardware',
    tags: ['detail', 'hardware'],
    sizeLabel: '2.4 MB',
  },
  {
    id: 'img-rosso',
    type: 'image',
    src: '/assets/rosso-hero.png',
    label: 'Rosso Texture',
    tags: ['rosso', 'texture'],
    sizeLabel: '2.4 MB',
  },
]
