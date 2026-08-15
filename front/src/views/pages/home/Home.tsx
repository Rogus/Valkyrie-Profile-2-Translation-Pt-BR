import { useRef, useState } from 'react'

const IMAGES_RAW_BASE =
  'https://raw.githubusercontent.com/trulio2/Valkyrie-Profile-2-Translation/refs/heads/master/images'

const PROJECT_URL = 'https://github.com/trulio2/Valkyrie-Profile-2-Translation'

const images = [
  { src: 'title-cutscene.png', alt: 'Title cutscene' },
  { src: 'first-cutscene.png', alt: 'First cutscene' },
  { src: 'world-map.png', alt: 'World map' },
  { src: 'npc-dialog.png', alt: 'NPC dialog' },
  { src: 'menu.png', alt: 'Menu' },
  { src: 'character-background.png', alt: 'Character background' }
]

const DUB_VIDEO_URL =
  'https://github.com/user-attachments/assets/e3ffbda2-0f37-4fec-a5cf-d1db6875e984'

function Home() {
  const [current, setCurrent] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({})
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [imageWidth, setImageWidth] = useState(0)

  const dragStart = useRef(0)

  const image = images[current]

  const backIndex =
    dragOffset < 0
      ? (current + 1) % images.length
      : (current - 1 + images.length) % images.length
  const backImage = images[backIndex]

  function markLoaded(src: string) {
    setLoadedImages((loaded) =>
      loaded[src] ? loaded : { ...loaded, [src]: true }
    )
  }

  function prev() {
    const target = images[(current - 1 + images.length) % images.length]

    if (!loadedImages[target.src]) setIsLoading(true)
    setCurrent((current) => (current - 1 + images.length) % images.length)
  }

  function next() {
    const target = images[(current + 1) % images.length]

    if (!loadedImages[target.src]) setIsLoading(true)
    setCurrent((current) => (current + 1) % images.length)
  }

  function goTo(index: number) {
    if (!loadedImages[images[index].src]) setIsLoading(true)
    setCurrent(index)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault()

    dragStart.current = event.clientX
    setImageWidth(event.currentTarget.clientWidth)

    setIsDragging(true)

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return

    setDragOffset(event.clientX - dragStart.current)
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return

    const offset = event.clientX - dragStart.current
    const threshold = imageWidth / 4

    if (offset < -threshold) {
      next()
      setDragOffset(imageWidth + offset)
      requestAnimationFrame(() => {
        setIsDragging(false)
        setDragOffset(0)
      })
    } else if (offset > threshold) {
      prev()
      setDragOffset(offset - imageWidth)
      requestAnimationFrame(() => {
        setIsDragging(false)
        setDragOffset(0)
      })
    } else {
      setIsDragging(false)
      setDragOffset(0)
    }
  }

  function handlePointerCancel() {
    setIsDragging(false)
    setDragOffset(0)
  }

  return (
    <>
      <section id="center">
        <h1>Valkyrie Profile 2 - Silmeria Translation</h1>
        <p>
          Fan Translation Project.{' '}
          <a
            href={PROJECT_URL}
            target="_blank"
            rel="noreferrer"
            className="link"
          >
            GitHub
          </a>
        </p>
      </section>

      <section className="carousel" aria-roledescription="carousel">
        <div
          className="carousel-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {isLoading && (
            <div
              className="spinner carousel-spinner"
              role="status"
              aria-label="Loading image"
            ></div>
          )}
          {dragOffset !== 0 && (
            <img
              className="carousel-image carousel-image-back"
              src={`${IMAGES_RAW_BASE}/${backImage.src}`}
              alt={backImage.alt}
              draggable={false}
              loading="lazy"
              decoding="async"
              onLoad={() => markLoaded(backImage.src)}
              style={{
                transform: `translateX(${
                  dragOffset < 0
                    ? imageWidth + dragOffset
                    : dragOffset - imageWidth
                }px)`,
                transition: isDragging ? 'none' : 'transform 0.25s ease'
              }}
            />
          )}
          <img
            className="carousel-image"
            src={`${IMAGES_RAW_BASE}/${image.src}`}
            alt={image.alt}
            draggable={false}
            loading="lazy"
            decoding="async"
            onLoad={() => {
              markLoaded(image.src)
              setIsLoading(false)
            }}
            style={{
              opacity: isLoading ? 0 : 1,
              transform: `translateX(${dragOffset}px)`,
              transition: isDragging
                ? 'none'
                : 'transform 0.25s ease, opacity 0.2s ease'
            }}
          />
        </div>
        <div className="carousel-caption">{image.alt}</div>
        <div className="row">
          <button className="btn" onClick={prev} aria-label="Previous image">
            ‹
          </button>
          <button className="btn" onClick={next} aria-label="Next image">
            ›
          </button>
        </div>
        <div className="carousel-dots">
          {images.map((item, index) => (
            <button
              key={item.src}
              type="button"
              className={`dot ${index === current ? 'active' : ''}`}
              onClick={() => goTo(index)}
              aria-label={`Go to ${item.alt}`}
            />
          ))}
        </div>
      </section>

      <section className="video-section">
        <h2>Dub</h2>
        <p>
          text-to-speech generated dub for the first cutscene, as a proof of
          concept
        </p>
        <video
          className="video"
          controls
          preload="metadata"
          src={DUB_VIDEO_URL}
        />
      </section>
    </>
  )
}

export default Home
