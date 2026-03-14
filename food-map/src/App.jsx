import { startTransition, useEffect, useRef, useState } from 'react'
import {
  BookOpenText,
  Flame,
  MapPin,
  MoonStar,
  Shuffle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Users,
  Wallet,
} from 'lucide-react'
import initialRestaurants from './1.json'
import greetings from './2.json'

const STORAGE_KEY = 'survival_map_data_v2'

const scenarioOptions = [
  '全部',
  '🏃 赶时间',
  '💸 吃土期（<15元）',
  '🍻 寝室团建',
  '📚 图书馆周边',
  '👩‍❤️‍👨 适合约会',
  '🍚 单人速决',
  '🔥 辣到怀疑人生',
  '🌙 深夜食堂',
]

const scenarioMeta = {
  全部: { label: '全场景漫游', Icon: Sparkles },
  '🏃 赶时间': { label: '赶课快冲', Icon: Sparkles },
  '💸 吃土期（<15元）': { label: '穷但要吃', Icon: Wallet },
  '🍻 寝室团建': { label: '寝室团建', Icon: Users },
  '📚 图书馆周边': { label: '图书馆回血', Icon: BookOpenText },
  '👩‍❤️‍👨 适合约会': { label: '约会不尴尬', Icon: Sparkles },
  '🍚 单人速决': { label: '一个人也稳', Icon: Sparkles },
  '🔥 辣到怀疑人生': { label: '辣到醒脑', Icon: Flame },
  '🌙 深夜食堂': { label: '深夜续命', Icon: MoonStar },
}

function randomItem(list, excludeId) {
  if (!list.length) return null
  if (list.length === 1) return list[0]

  let candidates = list
  if (excludeId !== undefined) {
    const filtered = list.filter((item) => item.id !== excludeId)
    if (filtered.length) {
      candidates = filtered
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)]
}

function randomGreeting() {
  return greetings[Math.floor(Math.random() * greetings.length)]
}

function readStoredRestaurants() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function normalizeRestaurants(restaurants) {
  return restaurants.map((restaurant) => ({
    ...restaurant,
    voteStatus:
      restaurant.voteStatus === 'up' || restaurant.voteStatus === 'down'
        ? restaurant.voteStatus
        : 'none',
  }))
}

function App() {
  const [restaurants, setRestaurants] = useState(() => {
    if (typeof window === 'undefined') {
      return normalizeRestaurants(initialRestaurants)
    }
    const storedRestaurants = readStoredRestaurants()
    return storedRestaurants?.length
      ? normalizeRestaurants(storedRestaurants)
      : normalizeRestaurants(initialRestaurants)
  })
  const [activeScenario, setActiveScenario] = useState('全部')
  const [currentGreeting, setCurrentGreeting] = useState(greetings[0] ?? '')
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null)
  const [cardVisible, setCardVisible] = useState(false)
  const animationTimerRef = useRef(null)
  const bootTimerRef = useRef(null)
  const scenarioStripRef = useRef(null)
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
  })

  const filteredRestaurants =
    activeScenario === '全部'
      ? restaurants
      : restaurants.filter((restaurant) =>
          restaurant.scenarios.includes(activeScenario),
        )

  const currentRestaurant =
    filteredRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
    filteredRestaurants[0] ??
    null

  const totalRedVotes = filteredRestaurants.reduce(
    (sum, restaurant) => sum + restaurant.red_votes,
    0,
  )
  const totalBlackVotes = filteredRestaurants.reduce(
    (sum, restaurant) => sum + restaurant.black_votes,
    0,
  )

  const animateToRestaurant = (nextRestaurant) => {
    setCardVisible(false)
    if (animationTimerRef.current) {
      window.clearTimeout(animationTimerRef.current)
    }

    animationTimerRef.current = window.setTimeout(() => {
      setSelectedRestaurantId(nextRestaurant?.id ?? null)
      setCurrentGreeting(randomGreeting())
      setCardVisible(true)
    }, 150)
  }

  const persistRestaurants = (nextRestaurants) => {
    setRestaurants(nextRestaurants)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRestaurants))
  }

  const drawRandomRestaurant = (scenario = activeScenario) => {
    const candidates =
      scenario === '全部'
        ? restaurants
        : restaurants.filter((restaurant) => restaurant.scenarios.includes(scenario))

    const nextRestaurant = randomItem(candidates, selectedRestaurantId)
    animateToRestaurant(nextRestaurant)
  }

  const handleScenarioChange = (scenario) => {
    startTransition(() => {
      setActiveScenario(scenario)
    })
    drawRandomRestaurant(scenario)
  }

  const handleVote = (nextVoteStatus) => {
    if (!currentRestaurant) return

    const nextRestaurants = restaurants.map((restaurant) => {
      if (restaurant.id !== currentRestaurant.id) return restaurant

      let redVotes = restaurant.red_votes
      let blackVotes = restaurant.black_votes
      let voteStatus = restaurant.voteStatus ?? 'none'

      if (nextVoteStatus === 'up') {
        if (voteStatus === 'up') {
          voteStatus = 'none'
          redVotes -= 1
        } else if (voteStatus === 'down') {
          voteStatus = 'up'
          blackVotes -= 1
          redVotes += 1
        } else {
          voteStatus = 'up'
          redVotes += 1
        }
      }

      if (nextVoteStatus === 'down') {
        if (voteStatus === 'down') {
          voteStatus = 'none'
          blackVotes -= 1
        } else if (voteStatus === 'up') {
          voteStatus = 'down'
          redVotes -= 1
          blackVotes += 1
        } else {
          voteStatus = 'down'
          blackVotes += 1
        }
      }

      return {
        ...restaurant,
        red_votes: Math.max(0, redVotes),
        black_votes: Math.max(0, blackVotes),
        voteStatus,
      }
    })

    persistRestaurants(nextRestaurants)
  }

  useEffect(() => {
    const storedRestaurants = readStoredRestaurants()
    const seedRestaurants = normalizeRestaurants(
      storedRestaurants?.length ? storedRestaurants : initialRestaurants,
    )

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedRestaurants))

    bootTimerRef.current = window.setTimeout(() => {
      setCurrentGreeting(randomGreeting())
      const nextRestaurant = randomItem(seedRestaurants)
      setSelectedRestaurantId(nextRestaurant?.id ?? null)
      setCardVisible(true)
    }, 0)

    return () => {
      if (bootTimerRef.current) {
        window.clearTimeout(bootTimerRef.current)
      }
      if (animationTimerRef.current) {
        window.clearTimeout(animationTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const strip = scenarioStripRef.current
    if (!strip) return undefined

    const handleMouseDown = (event) => {
      dragStateRef.current = {
        isDragging: true,
        startX: event.pageX,
        startScrollLeft: strip.scrollLeft,
      }
      strip.classList.add('cursor-grabbing')
    }

    const handleMouseMove = (event) => {
      if (!dragStateRef.current.isDragging) return
      const delta = event.pageX - dragStateRef.current.startX
      strip.scrollLeft = dragStateRef.current.startScrollLeft - delta
    }

    const stopDragging = () => {
      dragStateRef.current.isDragging = false
      strip.classList.remove('cursor-grabbing')
    }

    const handleWheel = (event) => {
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return
      event.preventDefault()
      strip.scrollLeft += event.deltaY
    }

    strip.addEventListener('mousedown', handleMouseDown)
    strip.addEventListener('mousemove', handleMouseMove)
    strip.addEventListener('mouseup', stopDragging)
    strip.addEventListener('mouseleave', stopDragging)
    strip.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('mouseup', stopDragging)

    return () => {
      strip.removeEventListener('mousedown', handleMouseDown)
      strip.removeEventListener('mousemove', handleMouseMove)
      strip.removeEventListener('mouseup', stopDragging)
      strip.removeEventListener('mouseleave', stopDragging)
      strip.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mouseup', stopDragging)
    }
  }, [])

  const currentMeta = scenarioMeta[activeScenario]
  const currentVoteStatus = currentRestaurant?.voteStatus ?? 'none'

  return (
    <main
      className="min-h-screen bg-gray-50 text-gray-900"
      style={{ fontFamily: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif' }}
    >
      <style>{`
        .scenario-strip {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scenario-strip::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden px-4 pb-36 pt-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,#ffe778_0%,rgba(255,208,0,0.45)_36%,rgba(255,255,255,0)_74%)]" />
        <div className="pointer-events-none absolute -left-10 top-28 h-40 w-40 rounded-full bg-yellow-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 top-48 h-44 w-44 rounded-full bg-white blur-2xl" />

        <section className="relative z-10 rounded-[32px] border border-white/70 bg-white/95 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">
                Campus Food Map
              </p>
              <h1 className="mt-2 text-[28px] font-black leading-none text-gray-950">
                大学城生存美食地图
              </h1>
            </div>
            <div className="rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-bold text-gray-800">
              本地已存档
            </div>
          </div>

          <div className="rounded-[28px] bg-gradient-to-r from-yellow-200 via-yellow-100 to-white p-[1px]">
            <div className="rounded-[27px] bg-[#fffaf0] px-4 py-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-gray-500">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                今日嘴替
              </div>
              <p className="text-base font-semibold leading-7 text-gray-900">
                {currentGreeting}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-3xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">总收录</p>
              <p className="mt-1 text-xl font-black">{restaurants.length}</p>
            </div>
            <div className="rounded-3xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">当前可抽</p>
              <p className="mt-1 text-xl font-black">{filteredRestaurants.length}</p>
            </div>
            <div className="rounded-3xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">场景</p>
              <p className="mt-1 truncate text-sm font-black text-gray-900">
                {currentMeta.label}
              </p>
            </div>
          </div>
        </section>

        <section className="relative z-10 mt-5">
          <div
            ref={scenarioStripRef}
            className="scenario-strip -mx-4 flex cursor-grab gap-3 overflow-x-auto px-4 pb-2 pt-1 select-none"
          >
            {scenarioOptions.map((scenario) => {
              const isActive = scenario === activeScenario
              return (
                <button
                  key={scenario}
                  type="button"
                  onClick={() => handleScenarioChange(scenario)}
                  className={`shrink-0 rounded-full px-4 py-3 text-sm font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-yellow-400 text-gray-950 shadow-[0_12px_24px_rgba(255,208,0,0.35)]'
                      : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-100'
                  }`}
                >
                  {scenario}
                </button>
              )
            })}
          </div>
        </section>

        <section className="relative z-10 mt-4 flex-1">
          {currentRestaurant ? (
            <article
              className={`overflow-hidden rounded-[34px] border border-white/60 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.10)] transition-all duration-300 ${
                cardVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-4 opacity-0'
              }`}
            >
              <div className="relative">
                <img
                  src={currentRestaurant.image_url}
                  alt={currentRestaurant.name}
                  className="h-72 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-5 pb-5 pt-10">
                  <div className="flex flex-wrap gap-2">
                    {currentRestaurant.scenarios.map((scenario) => (
                      <span
                        key={scenario}
                        className="rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-gray-900 backdrop-blur"
                      >
                        {scenario}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                      随机抽中的今日饭搭子
                    </p>
                    <h2 className="mt-2 text-[30px] font-black leading-tight text-gray-950">
                      {currentRestaurant.name}
                    </h2>
                  </div>
                  <div className="rounded-[26px] bg-yellow-100 px-4 py-3 text-right">
                    <p className="text-xs font-semibold text-gray-500">人均</p>
                    <p className="text-2xl font-black text-gray-950">
                      ¥{currentRestaurant.price_per_person}
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                    <MapPin className="h-4 w-4 text-yellow-500" />
                    {currentRestaurant.distance_from_dorm}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-700">
                    {currentRestaurant.student_review}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-gray-400">
                    发起人：{currentRestaurant.founder}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {currentRestaurant.meme_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-2xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="rounded-[28px] bg-[#fffaf0] p-4">
                  <div className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-700">
                    <span>同学现场投票</span>
                    <span className="text-xs text-gray-500">
                      红榜 {currentRestaurant.red_votes} / 避雷 {currentRestaurant.black_votes}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-yellow-500 transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          12,
                          Math.round(
                            (currentRestaurant.red_votes /
                              (currentRestaurant.red_votes +
                                currentRestaurant.black_votes)) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleVote('up')}
                    className={`flex items-center justify-center gap-2 rounded-[24px] border px-4 py-4 text-sm font-bold transition hover:-translate-y-0.5 ${
                      currentVoteStatus === 'up'
                        ? 'border-yellow-300 bg-yellow-400 text-gray-950 shadow-[0_12px_24px_rgba(255,208,0,0.28)]'
                        : 'border-yellow-200 bg-yellow-50 text-gray-900 hover:bg-yellow-100'
                    }`}
                  >
                    <ThumbsUp
                      className={`h-4 w-4 ${
                        currentVoteStatus === 'up' ? 'text-gray-950' : 'text-yellow-600'
                      }`}
                    />
                    {currentVoteStatus === 'up' ? '取消安利' : '狠狠安利'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote('down')}
                    className={`flex items-center justify-center gap-2 rounded-[24px] border px-4 py-4 text-sm font-bold transition hover:-translate-y-0.5 ${
                      currentVoteStatus === 'down'
                        ? 'border-gray-900 bg-gray-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.22)]'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    {currentVoteStatus === 'down' ? '取消避雷' : '避雷快逃'}
                  </button>
                </div>
              </div>
            </article>
          ) : (
            <div className="rounded-[34px] bg-white p-6 text-center shadow-sm">
              <p className="text-lg font-black text-gray-900">这个场景暂时没抽到店</p>
              <p className="mt-2 text-sm text-gray-500">
                先切回“全部”或者换个标签，我再给你重新抽。
              </p>
            </div>
          )}
        </section>

        <section className="relative z-10 mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[28px] border border-white/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <ThumbsUp className="h-4 w-4 text-yellow-500" />
              当前场景红榜总票
            </div>
            <p className="mt-2 text-2xl font-black text-gray-950">{totalRedVotes}</p>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <ThumbsDown className="h-4 w-4 text-gray-500" />
              当前场景避雷总票
            </div>
            <p className="mt-2 text-2xl font-black text-gray-950">{totalBlackVotes}</p>
          </div>
        </section>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent" />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-4 pb-5">
        <button
          type="button"
          onClick={() => drawRandomRestaurant()}
          className="flex w-full items-center justify-center gap-3 rounded-[30px] bg-yellow-400 px-6 py-5 text-base font-black text-gray-950 shadow-[0_18px_40px_rgba(255,208,0,0.45)] transition hover:-translate-y-1 active:translate-y-0"
        >
          <Shuffle className="h-5 w-5" />
          随便抽一家
        </button>
      </div>
    </main>
  )
}

export default App
