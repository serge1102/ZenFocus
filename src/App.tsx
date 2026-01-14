import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";

// 日付ごとの集中データを表す型
type FocusData = {
  [date: string]: number; // "YYYY-MM-DD": minutes
};

function App() {
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isMini, setIsMini] = useState(false);
  const [view, setView] = useState<"timer" | "calendar">("timer");
  const [focusHistory, setFocusHistory] = useState<FocusData>({});

  // 初期ロード：localStorageから履歴を読み込む
  useEffect(() => {
    const saved = localStorage.getItem("zenfocus_history");
    if (saved) {
      setFocusHistory(JSON.parse(saved));
    }
  }, []);

  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  useEffect(() => {
    let timer: number | undefined;
    if (isRunning && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      playNotificationSound();
      saveSession(selectedMinutes);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, selectedMinutes]);

  const saveSession = (minutes: number) => {
    if (minutes <= 0) return;

    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const newHistory = { ...focusHistory };
    newHistory[today] = (newHistory[today] || 0) + minutes;

    setFocusHistory(newHistory);
    localStorage.setItem("zenfocus_history", JSON.stringify(newHistory));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartStop = () => setIsRunning(!isRunning);

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(selectedMinutes * 60);
  };

  const handleFinish = () => {
    const totalSeconds = selectedMinutes * 60;
    const elapsedMinutes = Math.floor((totalSeconds - timeLeft) / 60);
    if (elapsedMinutes > 0) {
      saveSession(elapsedMinutes);
      alert(`${elapsedMinutes}分間の集中を記録しました`);
    }
    setIsRunning(false);
    setTimeLeft(selectedMinutes * 60);
  };

  const toggleMini = async () => {
    const nextMini = !isMini;
    setIsMini(nextMini);
    await invoke("toggle_mini_mode", { isMini: nextMini });
    if (nextMini) setView("timer");
  };

  // --- Scroll Interaction Logic ---
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isRunning || isMini) return;

    // Normalize wheel delta (some mice scrolling fast, some slow)
    // Use Math.sign or small increments.
    // Usually, scrolling DOWN (pulling wheel towards user) moves content UP (visual).
    // For values: Scroll UP (push away) -> Increase. Scroll DOWN (pull close) -> Decrease.
    // e.deltaY < 0 is Scrolling UP. e.deltaY > 0 is Scrolling DOWN.

    const newMinutes = selectedMinutes + (e.deltaY < 0 ? 1 : -1);

    if (newMinutes >= 1 && newMinutes <= 60) {
      setSelectedMinutes(newMinutes);
      setTimeLeft(newMinutes * 60);
    }
  };

  // 円周の計算
  const radius = 130;
  const circumference = 2 * Math.PI * radius;

  // Calculate display parameters
  let strokeDashoffset: number;

  if (isRunning) {
    // Running: Full Circle Animation (Start=Full, End=Empty)
    // Map timeLeft (0 to total) to Stroke (0 to circumference)
    const totalSeconds = selectedMinutes * 60;
    const progress = timeLeft / totalSeconds;
    // progress goes 1.0 -> 0.0
    // offset goes 0 (Full) -> circumference (Empty)
    strokeDashoffset = circumference * (1 - progress);
  } else {
    // Stopped: Clock Face Animation (0-60 mins)
    strokeDashoffset = circumference * (1 - (selectedMinutes / 60));
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col select-none relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">

      {/* ヘッダーエリア */}
      <header className="w-full flex justify-between items-center p-6 z-50 absolute top-0 left-0">
        <div className="flex gap-2">
          {!isMini && (
            <button
              onClick={() => setView(view === "timer" ? "calendar" : "timer")}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all text-slate-300 hover:text-white backdrop-blur-md shadow-lg border border-white/10 cursor-pointer group"
              title={view === "timer" ? "履歴を表示" : "タイマーに戻る"}
            >
              {view === "timer" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              )}
            </button>
          )}
        </div>
        <button
          onClick={toggleMini}
          className="p-3 rounded-full bg-indigo-500/10 hover:bg-indigo-500/30 transition-all text-indigo-300 hover:text-indigo-100 shadow-lg border border-indigo-500/20 backdrop-blur-md cursor-pointer"
          title={isMini ? "拡大表示" : "ミニモード"}
        >
          {isMini ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" x2="14" y1="3" y2="10" />
              <line x1="3" x2="10" y1="21" y2="14" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" x2="21" y1="10" y2="3" />
              <line x1="3" x2="10" y1="21" y2="14" />
            </svg>
          )}
        </button>
      </header>

      {/* メインコンテンツエリア - Flex Column Layout */}
      <main className="flex-grow w-full h-full flex flex-col relative z-0">

        {view === "timer" ? (
          <>
            {/* Timer Area (Grows to fill space, centers timer) */}
            <div className="flex-grow flex items-center justify-center min-h-0">
              <div
                className={`relative ${isMini ? "w-[220px] h-[220px]" : "w-[400px] h-[400px]"} flex-none flex items-center justify-center transition-all duration-500`}
                onWheel={handleWheel}
              >
                {/* Glow Effect Background */}
                {!isMini && <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>}

                <svg
                  className="absolute top-0 left-0 w-full h-full"
                  viewBox="0 0 300 300"
                >
                  {/* 目盛り (Ticks) */}
                  {[...Array(60)].map((_, i) => {
                    const isHour = i % 5 === 0;
                    const tickHeight = isHour ? 15 : 8;
                    const tickWidth = isHour ? 3 : 1;
                    const rotation = i * 6;
                    return (
                      <rect
                        key={i}
                        x={150 - tickWidth / 2}
                        y={150 - radius - 20}
                        width={tickWidth}
                        height={tickHeight}
                        fill={isHour ? "#475569" : "#334155"}
                        transform={`rotate(${rotation} 150 150)`}
                      />
                    )
                  })}

                  {/* 進行の円（明るい部分） */}
                  {/* Rotated -90 so stroke starts at top */}
                  <circle
                    cx="150" cy="150" r={radius}
                    stroke="url(#gradient)"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={circumference}
                    style={{
                      strokeDashoffset: strokeDashoffset,
                      transition: "stroke-dashoffset 0.1s linear",
                      transform: "rotate(-90deg)",
                      transformOrigin: "center"
                    }}
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                  />

                  {/* Gradient Definition */}
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* 中央のテキスト */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-10 w-full text-center">
                  <div className={`${isMini ? "text-5xl" : "text-8xl"} font-mono font-light tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all select-none leading-none`}>
                    {formatTime(timeLeft)}
                  </div>
                  {!isMini && !isRunning && (
                    <div className="text-indigo-400/60 text-xs font-bold tracking-[0.2em] mt-4 uppercase animate-pulse">
                      Scroll to Set
                    </div>
                  )}
                  {isRunning && !isMini && (
                    <div className="text-emerald-400/60 text-xs font-bold tracking-[0.2em] mt-4 uppercase">
                      Focusing
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dock Area (Pinned to flow bottom) */}
            <div className={`flex-none w-full flex justify-center pb-12 z-20 ${isMini ? "pb-4" : ""}`}>
              <div className={`flex items-center gap-6 px-10 py-5 bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_50px_rgba(99,102,241,0.15)] hover:border-white/20 transition-all duration-500 group ${isMini ? "scale-75 origin-bottom" : ""}`}>

                {/* Reset Button (Left) */}
                {!isMini && (
                  <button
                    onClick={handleReset}
                    className="p-4 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-300 active:scale-90"
                    title="Reset"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                )}

                {/* Main Action Button (Center) */}
                <button
                  onClick={handleStartStop}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 active:scale-90 border border-white/10 ${isRunning
                    ? "bg-slate-800 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)]"
                    : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] hover:scale-110"
                    }`}
                >
                  {isRunning ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="ml-1">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>

                {/* Finish Button (Right) */}
                {!isMini && (
                  <button
                    onClick={handleFinish}
                    className="p-4 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-300 active:scale-90"
                    title="Finish"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/5 shadow-2xl z-10 overflow-y-auto max-h-[80vh] animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white tracking-wide">History</h2>
                <div className="text-xs text-slate-500 font-mono tracking-widest uppercase">Logs</div>
              </div>

              <div className="custom-calendar mb-6 bg-black/20 rounded-2xl p-2 border border-white/5">
                <Calendar
                  tileContent={({ date, view }) => {
                    if (view !== 'month') return null;
                    const dStr = date.toLocaleDateString('en-CA');
                    const mins = focusHistory[dStr];
                    if (mins) {
                      return (
                        <div className="flex flex-col items-center mt-1">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Recent Sessions</h3>
                {Object.entries(focusHistory)
                  .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                  .slice(0, 3)
                  .map(([date, mins]) => (
                    <div key={date} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                      <span className="text-slate-300 font-mono text-sm">{date}</span>
                      <span className="text-indigo-300 font-bold drop-shadow-sm">{mins} min</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;