import IoC from '@/modules/ioc'
import { SERVICES, type IHomeService } from '@/types'

function Home() {
  const homeService = IoC.getOrCreateInstance<IHomeService>(SERVICES.HOME)

  const count = homeService.getCount()

  return (
    <section id="center">
      <h1>Home</h1>
      <p>Count is {count}</p>
      <div className="row">
        <button className="btn" onClick={() => homeService.increment()}>
          +
        </button>
        <button className="btn" onClick={() => homeService.decrement()}>
          -
        </button>
        <button className="btn" onClick={() => homeService.reset()}>
          reset
        </button>
      </div>
    </section>
  )
}

export default Home
