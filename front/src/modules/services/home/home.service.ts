import { homeStore } from '@/modules/services/home/home.store'
import type { IHomeService, Image } from '@/types'

export default class HomeService implements IHomeService {
  public getCount(): number {
    return homeStore((state) => state.count)
  }

  public getImages(): Image[] {
    return [
      { src: 'title-cutscene.png', alt: 'Title cutscene' },
      { src: 'first-cutscene.png', alt: 'First cutscene' },
      { src: 'world-map.png', alt: 'World map' },
      { src: 'npc-dialog.png', alt: 'NPC dialog' },
      { src: 'menu.png', alt: 'Menu' },
      { src: 'character-background.png', alt: 'Character background' }
    ]
  }

  public getProjectURL(): string {
    return 'https://github.com/trulio2/Valkyrie-Profile-2-Translation'
  }

  public getImageBase(): string {
    return 'https://raw.githubusercontent.com/trulio2/Valkyrie-Profile-2-Translation/refs/heads/master/images'
  }

  public getDubVideo(): string {
    return 'https://github.com/user-attachments/assets/e3ffbda2-0f37-4fec-a5cf-d1db6875e984'
  }

  public increment(): void {
    const { count, setCount } = homeStore.getState()

    setCount(count + 1)
  }

  public decrement(): void {
    const { count, setCount } = homeStore.getState()

    setCount(count - 1)
  }

  public reset(): void {
    const { setCount } = homeStore.getState()

    setCount(0)
  }
}
