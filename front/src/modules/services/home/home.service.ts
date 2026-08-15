import { homeStore } from '@/modules/services/home/home.store'
import type { IHomeService } from '@/types'

export default class HomeService implements IHomeService {
  public getCount(): number {
    return homeStore((state) => state.count)
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
