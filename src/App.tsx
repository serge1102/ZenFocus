import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Calendar from "react-calendar";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, CheckCircle, History, Calendar as CalendarIcon, Maximize2, Minimize2 } from "lucide-react";
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

  useEffect(() => {
    document.title = `${formatTime(timeLeft)} - ZenFocus`;
  }, [timeLeft]);

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

      {/* Header Area */}
      <header className="w-full flex justify-between items-center p-6 z-50 absolute top-0 left-0">
        <div className="flex gap-4">
          {!isMini && (
            <motion.button
              onClick={() => setView(view === "timer" ? "calendar" : "timer")}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="p-3 rounded-2xl bg-white/5 backdrop-blur-md text-slate-300 shadow-lg cursor-pointer hover:shadow-white/10"
              title={view === "timer" ? "View History" : "Back to Timer"}
            >
              {view === "timer" ? <History size={22} /> : <CalendarIcon size={22} />}
            </motion.button>
          )}
        </div>
        <motion.button
          onClick={toggleMini}
          whileHover={{ scale: 1.1, backgroundColor: "rgba(99, 102, 241, 0.25)" }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="p-3 rounded-2xl bg-indigo-500/10 backdrop-blur-md text-indigo-300 shadow-lg cursor-pointer hover:shadow-indigo-500/20"
          title={isMini ? "Maximize" : "Mini Mode"}
        >
          {isMini ? <Maximize2 size={22} /> : <Minimize2 size={22} />}
        </motion.button>
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
                  <div className={`${isMini ? "text-5xl" : "text-8xl"} font-mono font-light tracking-tighter text-slate-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all select-none leading-none`}>
                    {formatTime(timeLeft)}
                  </div>
                  {isRunning && !isMini && (
                    <div className="text-slate-400 text-xl font-medium mt-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
                      Ends at {new Date(Date.now() + timeLeft * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {!isMini && !isRunning && (
                    <div className="text-indigo-400/60 text-xs font-bold tracking-[0.2em] mt-4 uppercase animate-pulse">
                      Scroll to Set
                    </div>
                  )}
                  {isRunning && !isMini && (
                    <div className="text-emerald-400/60 text-xs font-bold tracking-[0.2em] mt-2 uppercase">
                      Focusing
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dock Area (Pinned to flow bottom) */}
            <div className={`flex-none w-full flex justify-center pb-12 z-20 ${isMini ? "pb-4" : ""}`}>
              {/* Glass Dock Container */}
              <div className={`flex items-center justify-center gap-12 px-12 py-8 bg-black/20 backdrop-blur-xl rounded-[3rem] shadow-2xl shadow-black/30 transition-all duration-500 ${isMini ? "scale-75 origin-bottom gap-6 px-8" : ""}`}>

                {/* Reset Button (Left) */}
                {!isMini && (
                  <motion.button
                    onClick={handleReset}
                    whileHover={{
                      scale: 1.15,
                      rotate: -15,
                      backgroundColor: "rgba(244, 63, 94, 0.1)",
                      color: "#fda4af",
                      boxShadow: "0 0 20px rgba(244, 63, 94, 0.3)"
                    }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="flex-none p-4 rounded-full text-slate-400 bg-white/5 backdrop-blur-md transition-colors"
                    title="Reset"
                  >
                    <RotateCcw size={26} />
                  </motion.button>
                )}

                {/* Main Action Button (Center) */}
                <motion.button
                  onClick={handleStartStop}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className={`flex-none w-24 h-24 mx-8 rounded-full flex items-center justify-center transition-all relative group overflow-hidden ${isRunning
                    ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-[0_0_60px_rgba(244,63,94,0.6)] border-t border-white/20"
                    : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_0_50px_rgba(99,102,241,0.5)] border-t border-white/30"
                    }`}
                >
                  {/* Internal highlight for 3D glass effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                  <AnimatePresence mode="wait">
                    {isRunning ? (
                      <motion.div
                        key="pause"
                        initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: -90 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex gap-2">
                          <div className="w-2.5 h-8 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                          <div className="w-2.5 h-8 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="play"
                        initial={{ opacity: 0, scale: 0.5, x: -5 }}
                        animate={{ opacity: 1, scale: 1, x: 2 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                        className="ml-1"
                      >
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-md">
                          <path d="M5 3l14 9-14 9V3z" />
                        </svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Finish Button (Right) */}
                {!isMini && (
                  <motion.button
                    onClick={handleFinish}
                    whileHover={{
                      scale: 1.15,
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      color: "#6ee7b7",
                      boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)"
                    }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="flex-none p-4 rounded-full text-slate-400 bg-white/5 backdrop-blur-md transition-colors"
                    title="Finish"
                  >
                    <CheckCircle size={28} />
                  </motion.button>
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