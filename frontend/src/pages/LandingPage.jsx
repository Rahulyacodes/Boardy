import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // 🔄 4-Step Drag & Drop Animation Sequence:
  // Step 0: "Landing page copy" drags from Review -> Done & drops in Done
  // Step 1: "Write API docs" drags from In Progress -> Review & drops in Review
  // Step 2: "Write API docs" drags BACK from Review -> In Progress & drops in In Progress
  // Step 3: "Landing page copy" drags BACK from Done -> Review & drops in Review
  const [step, setStep] = useState(0)
  const [isMoving, setIsMoving] = useState(false)
  const [isFlying, setIsFlying] = useState(false)

  useEffect(() => {
    // 1. Mount overlay at origin position
    setIsMoving(true)
    setIsFlying(false)

    // 2. Trigger physical smooth flight to target position
    const flyTimer = setTimeout(() => {
      setIsFlying(true)
    }, 60)

    // 3. Complete physical flight, unmount overlay & place card in list
    const landTimer = setTimeout(() => {
      setIsMoving(false)
      setIsFlying(false)
    }, 1250)

    // 4. Rest in placed list state, then advance step
    const stepTimer = setTimeout(() => {
      setStep((prev) => (prev + 1) % 4)
    }, 3300)

    return () => {
      clearTimeout(flyTimer)
      clearTimeout(landTimer)
      clearTimeout(stepTimer)
    }
  }, [step])

  // Placed card state logic (when card is resting in destination list)
  const isLandingCopyPlacedInDone = (step === 0 && !isMoving) || step === 1 || step === 2
  const isApiDocsPlacedInReview = (step === 1 && !isMoving) || (step === 2 && isMoving)

  // Floating Overlay Helper Configs
  const getOverlayConfig = () => {
    switch (step) {
      case 0: // Landing page copy: Review (Col 3) -> Done (Col 4)
        return {
          title: 'Landing page copy',
          startLeft: '476px',
          startTop: '68px',
          deltaX: isFlying ? 226 : 0,
          deltaY: isFlying ? 0 : 0,
          badgeText: 'Low',
          badgeStyle: 'bg-[#7C6FF7]/15 text-[#7C6FF7] border border-[#7C6FF7]/30'
        }
      case 1: // Write API docs: In Progress (Col 2) -> Review (Col 3)
        return {
          title: 'Write API docs',
          startLeft: '250px',
          startTop: '136px',
          deltaX: isFlying ? 226 : 0,
          deltaY: isFlying ? -68 : 0,
          badgeText: 'Medium',
          badgeStyle: 'bg-[#FFA500]/15 text-[#FFA500] border border-[#FFA500]/30'
        }
      case 2: // Write API docs: Review (Col 3) -> In Progress (Col 2)
        return {
          title: 'Write API docs',
          startLeft: '476px',
          startTop: '68px',
          deltaX: isFlying ? -226 : 0,
          deltaY: isFlying ? 68 : 0,
          badgeText: 'Medium',
          badgeStyle: 'bg-[#FFA500]/15 text-[#FFA500] border border-[#FFA500]/30'
        }
      case 3: // Landing page copy: Done (Col 4) -> Review (Col 3)
        return {
          title: 'Landing page copy',
          startLeft: '702px',
          startTop: '68px',
          deltaX: isFlying ? -226 : 0,
          deltaY: isFlying ? 0 : 0,
          badgeText: 'Done',
          badgeStyle: 'bg-[#69DB7C]/15 text-[#69DB7C] border border-[#69DB7C]/30 font-semibold'
        }
      default:
        return {}
    }
  }

  const overlayConfig = getOverlayConfig()

  return (
    <div className="min-h-screen bg-[#09090D] text-white flex flex-col font-sans selection:bg-[#7C6FF7]/30 selection:text-purple-200 relative overflow-hidden">
      
      {/* 🌟 1. Full-page Ambient Glowing Purple Aurora Backdrop */}
      <div 
        className="fixed inset-0 w-full h-full bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(124,111,247,0.28),rgba(9,9,13,1)_85%)] pointer-events-none z-0" 
      />

      {/* Breathing Glowing Purple Spotlight Orb */}
      <div 
        className="fixed top-[-100px] left-1/2 -translate-x-1/2 w-[700px] sm:w-[1000px] h-[350px] sm:h-[500px] rounded-full bg-gradient-to-r from-[#7C6FF7] via-[#8B5CF6] to-[#9333EA] blur-[140px] pointer-events-none z-0 animate-pulse-glow" 
      />

      {/* 2. Transparent Top Navigation */}
      <nav className="w-full bg-transparent sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 sm:px-10 py-6">
          <Link to="/" className="text-lg font-semibold text-[#7C6FF7] tracking-tight hover:opacity-90 transition-opacity flex items-center gap-2.5">
            <div className="w-7.5 h-7.5 rounded-md bg-[#7C6FF7] text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-[#7C6FF7]/40">
              P
            </div>
            <span className="text-white font-bold tracking-tight text-xl">PrimeTeam</span>
          </Link>

          <div className="flex items-center gap-6">
            {user ? (
              <button
                onClick={() => navigate('/')}
                className="text-xs sm:text-sm font-medium text-white bg-[#1C1C24] hover:bg-[#252533] border border-[#2A2A35] hover:border-[#7C6FF7]/50 px-5 py-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <span>Go to Dashboard</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs sm:text-sm font-medium text-[#8B8B9E] hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="text-xs sm:text-sm font-semibold text-white bg-[#1C1C24] hover:bg-[#252533] border border-[#2A2A35] hover:border-[#7C6FF7]/50 px-5 py-2.5 rounded-lg transition-all shadow-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 3. Left-Aligned Hero Section */}
      <main className="flex-1 flex flex-col items-center relative z-10">
        <section className="w-full max-w-5xl mx-auto px-6 sm:px-10 pt-16 pb-16 text-left">
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.12] tracking-[-0.03em] text-white mb-6 text-left">
            It's just a board.<br />
            <span className="text-[#7C6FF7] drop-shadow-[0_0_30px_rgba(124,111,247,0.5)]">A really good one.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#8B8B9E] leading-[1.7] max-w-xl mb-10 text-left">
            A minimal workspace for teams who'd rather ship than configure.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left">
            <Link
              to={user ? '/' : '/register'}
              className="inline-flex items-center gap-2.5 bg-[#1C1C24] hover:bg-[#252533] text-white border border-[#2A2A35] hover:border-[#7C6FF7]/50 px-6.5 py-3.5 rounded-xl font-medium text-sm sm:text-base transition-all cursor-pointer shadow-md"
            >
              <span>{user ? 'Open Dashboard' : 'Start building.'}</span>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>

            <div className="text-xs text-[#8B8B9E] leading-tight">
              <span className="block font-medium text-gray-300">Free Forever.</span>
              <span>Save money.</span>
            </div>
          </div>
        </section>

        {/* 4. Product Board Preview Mockup with Visible Physical Drag & Drop */}
        <section className="w-full max-w-5xl px-6 sm:px-10 mb-28">
          <div className="rounded-2xl bg-[#1C1C24]/90 border border-[#2A2A35] overflow-hidden shadow-2xl backdrop-blur-md">
            
            {/* Window Bar */}
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#2A2A35] bg-[#171720]">
              <div className="w-3 h-3 rounded-full bg-[#FF6B6B]" />
              <div className="w-3 h-3 rounded-full bg-[#FFA500]" />
              <div className="w-3 h-3 rounded-full bg-[#69DB7C]" />
              <span className="text-xs text-[#8B8B9E] font-medium ml-2">Product launch · 3 members</span>
            </div>

            {/* Board Mockup Content */}
            <div className="flex gap-4 p-6 overflow-x-auto select-none scrollbar-thin relative min-h-[340px]">
              
              {/* 🖐️ Floating Physical Drag Overlay Card with Cursor */}
              {isMoving && (
                <div 
                  className="absolute z-50 pointer-events-none transition-all duration-[1150ms] ease-in-out w-[210px] bg-[#1C1C24] rounded-lg p-3 border border-[#7C6FF7] shadow-2xl shadow-[#7C6FF7]/40 scale-[1.05] rotate-2 ring-1 ring-[#7C6FF7]/60"
                  style={{
                    left: overlayConfig.startLeft,
                    top: overlayConfig.startTop,
                    transform: `translate3d(${overlayConfig.deltaX}px, ${overlayConfig.deltaY}px, 0)`
                  }}
                >
                  <div className="absolute -top-3 -right-3 z-50 bg-[#7C6FF7] p-1.5 rounded-full shadow-xl text-white">
                    <svg className="w-3.5 h-3.5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3.078 2.498a.75.75 0 011.007-.384l16.5 7.5a.75.75 0 010 1.372l-6.5 2.955-2.955 6.5a.75.75 0 01-1.372 0l-7.5-16.5a.75.75 0 01.82-1.943z" />
                    </svg>
                  </div>
                  <div className="text-xs text-white font-medium flex items-center justify-between">
                    <span>{overlayConfig.title}</span>
                  </div>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-2 ${overlayConfig.badgeStyle}`}>
                    {overlayConfig.badgeText}
                  </span>
                </div>
              )}

              {/* Col 1: Backlog */}
              <div className="bg-[#0F0F13] rounded-xl p-3.5 w-[210px] shrink-0 border border-[#2A2A35] flex flex-col gap-2.5">
                <div className="text-xs font-medium text-[#8B8B9E] flex items-center justify-between">
                  <span>Backlog</span>
                  <span className="text-[#3A3A4D] font-mono text-[11px]">2</span>
                </div>

                <div className="bg-[#1C1C24] rounded-lg p-3 border border-[#2A2A35] space-y-2">
                  <div className="text-xs text-white font-medium">Research competitors</div>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#7C6FF7]/15 text-[#7C6FF7] border border-[#7C6FF7]/30 font-medium">
                    Low
                  </span>
                </div>

                <div className="bg-[#1C1C24] rounded-lg p-3 border border-[#2A2A35] space-y-2">
                  <div className="text-xs text-white font-medium">Set up design system</div>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#FFA500]/15 text-[#FFA500] border border-[#FFA500]/30 font-medium">
                    Medium
                  </span>
                  <div className="text-[10px] text-[#8B8B9E] pt-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3 text-[#8B8B9E]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                    </svg>
                    <span>Aug 20</span>
                  </div>
                </div>

                <div className="text-xs text-[#8B8B9E] py-2 border border-dashed border-[#2A2A35] rounded-lg text-center cursor-pointer hover:border-gray-500 hover:text-white transition-all">
                  + Add card
                </div>
              </div>

              {/* Col 2: In progress */}
              <div className="bg-[#0F0F13] rounded-xl p-3.5 w-[210px] shrink-0 border border-[#2A2A35] flex flex-col gap-2.5">
                <div className="text-xs font-medium text-[#8B8B9E] flex items-center justify-between">
                  <span>In progress</span>
                  <span className="text-[#3A3A4D] font-mono text-[11px]">
                    {isApiDocsPlacedInReview ? 1 : 2}
                  </span>
                </div>

                {/* Overdue Card */}
                <div className="bg-[#1C1C24] rounded-lg p-3 border border-[#2A2A35] space-y-2">
                  <div className="text-xs text-white font-medium">Build auth flow</div>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/30 font-medium">
                    High
                  </span>
                  <div className="text-[10px] text-[#FF6B6B] font-semibold pt-0.5 flex items-center gap-1.5 animate-pulse">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B6B] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF6B6B]"></span>
                    </span>
                    <svg className="w-3 h-3 text-[#FF6B6B]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                    </svg>
                    <span>Aug 12 · Overdue</span>
                  </div>
                </div>

                {/* Card B: "Write API docs" placed in In Progress list */}
                {!isApiDocsPlacedInReview && (
                  <div className={`bg-[#1C1C24] rounded-lg p-3 border border-[#2A2A35] space-y-2 transition-all ${
                    step === 1 && isMoving ? 'opacity-30 border-dashed border-[#7C6FF7]' : 'opacity-100'
                  }`}>
                    <div className="text-xs text-white font-medium">Write API docs</div>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#FFA500]/15 text-[#FFA500] border border-[#FFA500]/30 font-medium">
                      Medium
                    </span>
                  </div>
                )}

                <div className="text-xs text-[#8B8B9E] py-2 border border-dashed border-[#2A2A35] rounded-lg text-center cursor-pointer hover:border-gray-500 hover:text-white transition-all">
                  + Add card
                </div>
              </div>

              {/* Col 3: Review */}
              <div className="bg-[#0F0F13] rounded-xl p-3.5 w-[210px] shrink-0 border border-[#2A2A35] flex flex-col gap-2.5">
                <div className="text-xs font-medium text-[#8B8B9E] flex items-center justify-between">
                  <span>Review</span>
                  <span className="text-[#3A3A4D] font-mono text-[11px]">
                    {(!isLandingCopyPlacedInDone ? 1 : 0) + (isApiDocsPlacedInReview ? 1 : 0)}
                  </span>
                </div>

                {/* Card A: "Landing page copy" placed in Review list */}
                {!isLandingCopyPlacedInDone && (
                  <div className={`bg-[#1C1C24] rounded-lg p-3 border border-[#2A2A35] space-y-2 transition-all ${
                    step === 0 && isMoving ? 'opacity-30 border-dashed border-[#7C6FF7]' : 'opacity-100'
                  }`}>
                    <div className="text-xs text-white font-medium">Landing page copy</div>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#7C6FF7]/15 text-[#7C6FF7] border border-[#7C6FF7]/30 font-medium">
                      Low
                    </span>
                  </div>
                )}

                {/* Card B: Placed in Review list after moving */}
                {isApiDocsPlacedInReview && (
                  <div className={`bg-[#1C1C24] rounded-lg p-3 border border-[#2A2A35] space-y-2 transition-all ${
                    step === 2 && isMoving ? 'opacity-30 border-dashed border-[#7C6FF7]' : 'opacity-100'
                  }`}>
                    <div className="text-xs text-white font-medium">Write API docs</div>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#FFA500]/15 text-[#FFA500] border border-[#FFA500]/30 font-medium">
                      Medium
                    </span>
                  </div>
                )}

                <div className="text-xs text-[#8B8B9E] py-2 border border-dashed border-[#2A2A35] rounded-lg text-center cursor-pointer hover:border-gray-500 hover:text-white transition-all">
                  + Add card
                </div>
              </div>

              {/* Col 4: Done */}
              <div className="bg-[#0F0F13] rounded-xl p-3.5 w-[210px] shrink-0 border border-[#2A2A35] flex flex-col gap-2.5">
                <div className="text-xs font-medium text-[#8B8B9E] flex items-center justify-between">
                  <span>Done</span>
                  <span className="text-[#3A3A4D] font-mono text-[11px]">
                    {isLandingCopyPlacedInDone ? 3 : 2}
                  </span>
                </div>

                {/* Card A: Placed in Done list after moving & marked Done */}
                {isLandingCopyPlacedInDone && (
                  <div className={`bg-[#1C1C24] rounded-lg p-3 border border-[#69DB7C]/40 space-y-1.5 transition-all opacity-85 ${
                    step === 3 && isMoving ? 'opacity-30 border-dashed border-[#7C6FF7]' : ''
                  }`}>
                    <div className="text-xs text-white font-medium flex items-center justify-between">
                      <span className="line-through text-gray-300">Landing page copy</span>
                      <svg className="w-3.5 h-3.5 text-[#69DB7C]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-[#69DB7C]/15 text-[#69DB7C] border border-[#69DB7C]/30 font-semibold">
                      Done
                    </span>
                  </div>
                )}

                <div className="bg-[#1C1C24] rounded-lg p-3 border border-[#2A2A35] opacity-50 space-y-1">
                  <div className="text-xs text-white font-medium line-through">Wireframes</div>
                </div>

                <div className="bg-[#1C1C24] rounded-lg p-3 border border-[#2A2A35] opacity-50 space-y-1">
                  <div className="text-xs text-white font-medium line-through">Set up repo</div>
                </div>

                <div className="text-xs text-[#8B8B9E] py-2 border border-dashed border-[#2A2A35] rounded-lg text-center cursor-pointer hover:border-gray-500 hover:text-white transition-all">
                  + Add card
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 5. Alternating Feature Showcase Section (Zig-Zag Layout) */}
        <section className="w-full max-w-5xl mx-auto px-6 sm:px-10 mb-32">
          
          {/* Section Header & Subtitle */}
          <div className="text-center mb-16 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
              Designed for focus. <span className="text-[#7C6FF7]">Built for simplicity.</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-[#8B8B9E] max-w-2xl mx-auto leading-relaxed">
              Everything you need to manage tasks and communicate with your team — and nothing you don't.
            </p>
          </div>

          <div className="space-y-24 sm:space-y-32">
            {/* Feature Row 1: Text Left, Feature Graphic Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Text */}
            <div className="text-left space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.18] tracking-[-0.02em] text-white">
                Turn any project into a clear plan in minutes
              </h2>
              <p className="text-base sm:text-lg text-[#8B8B9E] leading-[1.7] max-w-lg">
                Create tasks with owners, due dates, and priorities in seconds. PrimeTeam fills in the details so your team can skip the setup and get straight to work.
              </p>
            </div>

            {/* Right Column: Feature Graphic Card */}
            <div className="bg-[#1C1C24]/90 border border-[#2A2A35] rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md relative overflow-hidden space-y-4 text-left">
              
              {/* Top Bar Header Mockup */}
              <div className="flex items-center justify-between border-b border-[#2A2A35] pb-3.5 text-xs text-[#8B8B9E]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#7C6FF7]/20 text-[#7C6FF7] flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </div>
                  <span className="font-semibold text-white">Campaign Launch Task</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-purple-600 border border-[#1C1C24] text-[9px] text-white flex items-center justify-center font-bold">J</div>
                    <div className="w-5 h-5 rounded-full bg-blue-600 border border-[#1C1C24] text-[9px] text-white flex items-center justify-center font-bold">R</div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#2A2A35] text-gray-300 font-medium">Join</span>
                </div>
              </div>

              {/* Chat / Task Request Box */}
              <div className="bg-[#0F0F13] border border-[#2A2A35] rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#7C6FF7]/30 text-[#7C6FF7] flex items-center justify-center font-bold text-xs shrink-0">
                    J
                  </div>
                  <div>
                    <div className="text-xs text-white font-medium flex items-center gap-2">
                      <span>Joey</span>
                      <span className="text-[10px] text-[#8B8B9E]">3:30 pm</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      <span className="text-[#7C6FF7] font-medium">@channel</span> Just got off with a customer and they really want that new feature we discussed. Can we get moving on that, please?
                    </p>
                  </div>
                </div>

                {/* AI / Automated Task Confirmation Pill */}
                <div className="ml-10 bg-[#1C1C24] border border-[#7C6FF7]/60 rounded-xl p-3.5 space-y-2 shadow-lg shadow-[#7C6FF7]/15">
                  <div className="text-xs text-white font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#7C6FF7] animate-pulse"></span>
                    <span>The task has been created successfully.</span>
                  </div>
                  <div className="text-[11px] text-[#8B8B9E] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full border border-[#7C6FF7] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7C6FF7]"></span>
                    </span>
                    <span className="text-white font-semibold">Customer feature request</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Feature Row 2: Feature Graphic Left, Text Right (Reversed) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Feature Graphic Card */}
            <div className="bg-[#1C1C24]/90 border border-[#2A2A35] rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md relative overflow-hidden space-y-4 text-left order-2 lg:order-1">
              
              {/* Workspace Activity Mockup Box */}
              <div className="bg-[#0F0F13] border border-[#2A2A35] rounded-xl p-4 space-y-3.5">
                <div className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider">Workspace Activity</div>
                
                {/* User Comment */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                    M
                  </div>
                  <div>
                    <div className="text-xs text-white font-medium">Marc</div>
                    <p className="text-xs text-gray-300 mt-0.5">
                      <span className="text-[#7C6FF7] font-medium">@Team</span>, what's blocking our launch this week?
                    </p>
                  </div>
                </div>

                {/* System Activity Summary Card */}
                <div className="bg-[#1C1C24] border border-[#2A2A35] rounded-lg p-3.5 space-y-2.5">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="text-[#7C6FF7]">⚡</span>
                    <span>PrimeTeam Summary: Here's what's at risk:</span>
                  </div>
                  <ul className="text-xs text-gray-300 space-y-1.5 pl-3 list-disc">
                    <li><span className="font-medium text-white">Launch Email</span> subtask 80% done.</li>
                    <li><span className="font-medium text-amber-400">Hero Wireframes</span> still pending review.</li>
                    <li><span className="font-medium text-[#FF6B6B]">Competitor Research doc</span> overdue.</li>
                  </ul>
                </div>
              </div>

            </div>

            {/* Right Column: Text */}
            <div className="text-left space-y-6 order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.18] tracking-[-0.02em] text-white">
                Know who's doing what, without asking
              </h2>
              <p className="text-base sm:text-lg text-[#8B8B9E] leading-[1.7] max-w-lg">
                Comments, @mentions, and real-time updates keep everyone aligned without another status meeting. PrimeTeam flags what's overdue and what's at risk so nothing slips through.
              </p>
            </div>

          </div>

          {/* Feature Row 3: Text Left, Feature Graphic Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Text & CTA */}
            <div className="text-left space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.18] tracking-[-0.02em] text-white">
                One-click team onboarding & access control
              </h2>
              <p className="text-base sm:text-lg text-[#8B8B9E] leading-[1.7] max-w-lg">
                Invite team members to any workspace instantly via shareable invite links or direct emails. Grant Admin, Member, or Viewer roles with zero friction.
              </p>

              <div>
                <Link
                  to={user ? '/' : '/register'}
                  className="inline-flex items-center gap-2 bg-[#1C1C24] hover:bg-[#252533] text-white border border-[#2A2A35] hover:border-[#7C6FF7]/50 px-6 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer shadow-md"
                >
                  <span>{user ? 'Open Dashboard' : 'Get started'}</span>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right Column: Feature Graphic Card */}
            <div className="bg-[#1C1C24]/90 border border-[#2A2A35] rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md relative overflow-hidden space-y-4 text-left">
              
              <div className="bg-[#0F0F13] border border-[#2A2A35] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Project Alpha Workspace</span>
                    <span className="text-[10px] text-[#8B8B9E]">Invite link active · 4 members</span>
                  </div>
                  <button className="px-3.5 py-1.5 bg-[#7C6FF7] hover:bg-[#6C5CE7] text-white rounded-lg text-xs font-semibold border-none cursor-pointer shadow-sm transition-all">
                    Copy Link
                  </button>
                </div>

                <div className="space-y-2 pt-1 border-t border-[#2A2A35]">
                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[9px] flex items-center justify-center font-bold">R</div>
                      <span className="text-white font-medium">Rahulya</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#7C6FF7]/20 text-[#7C6FF7] font-semibold">Admin</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">J</div>
                      <span className="text-white font-medium">Joey</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#2A2A35] text-gray-300 font-medium">Member</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </section>

      </main>

      {/* 6. Divider Line */}
      <div className="h-[0.5px] bg-[#2A2A35] max-w-5xl mx-auto w-full px-6 sm:px-10 relative z-10" />

      {/* 7. Minimal Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 sm:px-10 py-8 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-[#8B8B9E] relative z-10">
        
        {/* App Name & Logo */}
        <div className="flex items-center gap-2 font-bold text-white tracking-tight">
          <div className="w-5 h-5 rounded bg-[#7C6FF7] text-white flex items-center justify-center font-bold text-[10px]">
            P
          </div>
          <span className="text-[#7C6FF7]">PrimeTeam</span>
        </div>

        {/* Copyright */}
        <div className="text-gray-400">
          © {new Date().getFullYear()} PrimeTeam. All rights reserved.
        </div>

        {/* Contact Us & Built by GitHub */}
        <div className="flex items-center gap-4 sm:gap-5">
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=primeteam.security@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8B8B9E] hover:text-white transition-colors underline-offset-4 hover:underline"
          >
            Contact us
          </a>

          <span className="text-[#2A2A35]">|</span>

          <a
            href="https://github.com/Rahulyacodes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#8B8B9E] hover:text-white transition-colors group"
          >
            <span>Built by</span>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </footer>

    </div>
  )
}

export default LandingPage
