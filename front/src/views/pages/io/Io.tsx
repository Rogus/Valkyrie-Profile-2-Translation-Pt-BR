import { Link } from 'react-router-dom'
import IoC from '@/modules/ioc'
import { SERVICES, type IHomeService } from '@/types'

function Io() {
  const homeService = IoC.getOrCreateInstance<IHomeService>(SERVICES.HOME)

  const count = homeService.getCount()

  return (
    <section id="center">
      <h1>IoC demo</h1>
      <p>
        Zustand store behind a service wired through the IoC container. Count
        persists to localStorage.
      </p>
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
      <p>
        <Link to="/" className="btn accent">
          Back home
        </Link>
      </p>
    </section>
  )
}

export default Io
