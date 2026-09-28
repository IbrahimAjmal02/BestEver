import { useEffect, useState } from 'react'
import { getLeaderboard, type Item } from '../api/categories'

interface CategoryTopFiveProps {
  slug: string
}

export default function CategoryTopFive({ slug }: CategoryTopFiveProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaderboard(slug)
      .then((leaderboard) => setItems(leaderboard.slice(0, 5)))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return null

  if (items.length === 0) {
    return <p className="text-sm text-gray-400">No votes yet</p>
  }

  return (
    <div className="flex items-end gap-4 overflow-x-auto pb-1 pt-8">
      {items.map((item, index) => {
        const isFirst = index === 0
        const imageSize = isFirst ? 'h-28 w-28' : 'h-24 w-24'

        return (
          <div key={item.id} className={`flex flex-shrink-0 flex-col items-center gap-1 ${isFirst ? 'w-28' : 'w-24'}`}>
            <div className="relative">
              {isFirst && (
                <img
                  src="/crown.png"
                  alt="1st place"
                  className="absolute -top-8 left-1/2 z-10 h-7 w-auto -translate-x-1/2"
                />
              )}
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className={`${imageSize} object-cover`} />
              ) : (
                <div className={`flex ${imageSize} items-center justify-center bg-gray-100 text-lg font-semibold text-gray-400`}>
                  {item.name.charAt(0).toUpperCase()}
                </div>
              )}
              {!isFirst && (
                <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
              )}
            </div>
            <span className="w-full truncate text-center text-xs text-gray-500">{item.name}</span>
          </div>
        )
      })}
    </div>
  )
}
