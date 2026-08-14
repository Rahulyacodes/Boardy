// src/components/board/PlannerView.jsx
import { useState, useEffect } from 'react'
import { getBoards, getBoard } from '../../api'

function PlannerView() {
  const [boards, setBoards] = useState([])
  const [allCards, setAllCards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPlannerData() {
      try {
        const res = await getBoards()
        setBoards(res.data)

        // Fetch details for all user boards to assemble cards overview
        const fullBoards = await Promise.all(
          res.data.map((b) => getBoard(b._id).then((r) => r.data).catch(() => null))
        )

        const cardsList = []
        fullBoards.forEach((board) => {
          if (board && board.lists) {
            board.lists.forEach((list) => {
              if (list.cards) {
                list.cards.forEach((card) => {
                  cardsList.push({
                    ...card,
                    boardTitle: board.title,
                    listTitle: list.title
                  })
                })
              }
            })
          }
        })

        setAllCards(cardsList)
      } catch (err) {
        console.error('Error loading planner view:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPlannerData()
  }, [])

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8 text-white min-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planner Overview</h1>
          <p className="text-xs text-gray-400 mt-1">Track tasks and progress across all your boards</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#1C1C24] border border-[#2A2A35] rounded-xl px-4 py-2 text-xs font-semibold">
            Total Cards: <span className="text-purple-400 font-bold">{allCards.length}</span>
          </div>
          <div className="bg-[#1C1C24] border border-[#2A2A35] rounded-xl px-4 py-2 text-xs font-semibold">
            Boards: <span className="text-teal-400 font-bold">{boards.length}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-gray-400 text-sm">
          Loading planner items...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Summary by List Categories */}
          {['To Do', 'Doing', 'Done'].map((statusKey) => {
            const matchedCards = allCards.filter(
              (c) => c.listTitle.toLowerCase() === statusKey.toLowerCase()
            )

            return (
              <div
                key={statusKey}
                className="bg-[#1C1C24]/80 backdrop-blur border border-[#2A2A35] rounded-2xl p-5 shadow-xl flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-[#2A2A35] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        statusKey === 'To Do'
                          ? 'bg-amber-400'
                          : statusKey === 'Doing'
                          ? 'bg-purple-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <h3 className="font-bold text-sm tracking-wide">{statusKey}</h3>
                  </div>
                  <span className="text-xs font-semibold bg-white/10 px-2.5 py-1 rounded-full text-gray-300">
                    {matchedCards.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[450px] space-y-3 pr-1">
                  {matchedCards.length === 0 ? (
                    <div className="text-xs text-gray-500 py-6 text-center italic">
                      No tasks in {statusKey}
                    </div>
                  ) : (
                    matchedCards.map((card) => (
                      <div
                        key={card._id}
                        className="bg-[#14141A] border border-[#2A2A35] rounded-xl p-3 hover:border-purple-500/50 transition-colors shadow-sm"
                      >
                        <h4 className="font-semibold text-xs text-gray-100 mb-1">{card.title}</h4>
                        {card.description && (
                          <p className="text-[11px] text-gray-400 line-clamp-2 mb-2">
                            {card.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-white/5">
                          <span className="bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded font-medium">
                            {card.boardTitle}
                          </span>
                          <span>{card.createdAt ? new Date(card.createdAt).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PlannerView
