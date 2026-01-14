import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Calendar from "react-calendar";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, CheckCircle, History, Calendar as CalendarIcon, Maximize2, Minimize2, Play, Pause, Flame } from "lucide-react";
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

    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
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
      setTimeLeft(selectedMinutes * 60);
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


  // Steam Particle Setup
  const [steamParticles, setSteamParticles] = useState<{ id: number; left: string; duration: string; delay: string; size: number }[]>([]);

  useEffect(() => {
    // Generate steam particles - More density
    const particles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${-10 + Math.random() * 120}%`, // Wider spread
      duration: `${3 + Math.random() * 5}s`,
      delay: `${Math.random() * 2}s`, // Reduced delay for faster onset
      size: 100 + Math.random() * 150 // Larger particles
    }));
    setSteamParticles(particles);
  }, []);


  return (
    <div
      className="h-screen flex flex-col select-none relative overflow-hidden text-stone-100 font-sans"
      style={{
        backgroundColor: '#1c1008', // Dark wood base
        backgroundImage: `
          radial-gradient(circle at 50% 0%, rgba(255,150,100,0.15), transparent 60%),
          repeating-linear-gradient(90deg, transparent 0, transparent 58px, rgba(0,0,0,0.3) 59px, rgba(0,0,0,0.3) 60px),
          url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")
        `
      }}
    >

      {/* Steam Effect - Only visible when running */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 pointer-events-none z-10"
          >
            {steamParticles.map((p) => (
              <div
                key={p.id}
                className="absolute -bottom-20 bg-white/5 rounded-full blur-[60px] animate-steam"
                style={{
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  animationDuration: p.duration,
                  animationDelay: p.delay,
                  opacity: 0
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient Mist Effect (Base - weaker) */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-stone-800/10 rounded-full blur-3xl pointer-events-none mix-blend-screen animate-pulse delay-1000"></div>
      <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-orange-900/10 rounded-full blur-3xl pointer-events-none mix-blend-screen animate-pulse"></div>

      {/* Header Area */}
      <header className="w-full flex justify-between items-center p-6 z-50 absolute top-0 left-0">
        <div className="flex gap-4">
          {!isMini && (
            <motion.button
              onClick={() => setView(view === "timer" ? "calendar" : "timer")}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 247, 237, 0.1)" }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="p-3 rounded-2xl bg-black/20 backdrop-blur-md text-stone-400 border border-white/5 shadow-lg cursor-pointer hover:shadow-orange-500/5 hover:text-stone-200"
              title={view === "timer" ? "View History" : "Back to Timer"}
            >
              {view === "timer" ? <History size={22} /> : <CalendarIcon size={22} />}
            </motion.button>
          )}
        </div>
        <motion.button
          onClick={toggleMini}
          whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 247, 237, 0.1)" }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="p-3 rounded-2xl bg-black/20 backdrop-blur-md text-stone-400 border border-white/5 shadow-lg cursor-pointer hover:shadow-orange-500/5 hover:text-stone-200"
          title={isMini ? "Maximize" : "Mini Mode"}
        >
          {isMini ? <Maximize2 size={22} /> : <Minimize2 size={22} />}
        </motion.button>
      </header>

      {/* メインコンテンツエリア - Flex Column Layout */}
      <main className="flex-grow w-full h-full flex flex-col relative z-20">

        {view === "timer" ? (
          <>
            {/* Timer Area (Grows to fill space, centers timer) */}
            <div className="flex-grow flex items-center justify-center min-h-0">
              <div
                className={`relative ${isMini ? "w-[220px] h-[220px]" : "w-[400px] h-[400px]"} flex-none flex items-center justify-center transition-all duration-500`}
                onWheel={handleWheel}
              >
                {/* Glow Effect Background - Heat Radiance */}
                {!isMini && <div className={`absolute inset-0 blur-3xl rounded-full pointer-events-none transition-opacity duration-1000 ${isRunning ? "bg-orange-500/10 opacity-100" : "bg-stone-500/5 opacity-50"}`}></div>}

                <svg
                  className="absolute top-0 left-0 w-full h-full"
                  viewBox="0 0 300 300"
                >
                  {/* 目盛り (Ticks) - Darker Stone Ticks on Wood */}
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
                        fill={isHour ? "#451a03" : "#57534e"} // Dark Wood/Stone
                        transform={`rotate(${rotation} 150 150)`}
                        className="opacity-90"
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
                    className={`filter ${isRunning ? "drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" : "drop-shadow-[0_0_2px_rgba(249,115,22,0.3)]"}`}
                  />

                  {/* Gradient Definition - Ember/Heat */}
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#fbbf24" /> {/* Amber 400 (Fire core) */}
                      <stop offset="50%" stopColor="#f97316" /> {/* Orange 500 */}
                      <stop offset="100%" stopColor="#ef4444" /> {/* Red 500 */}
                    </linearGradient>
                  </defs>
                </svg>

                {/* 中央のテキスト */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-10 w-full text-center">
                  <div className={`${isMini ? "text-5xl" : "text-8xl"} font-mono font-light tracking-tighter text-orange-50/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] transition-all select-none leading-none`}>
                    {formatTime(timeLeft)}
                  </div>
                  {isRunning && !isMini && (
                    <div className="text-orange-200/80 text-xl font-medium mt-2 animate-in fade-in slide-in-from-bottom-2 duration-700 font-sans tracking-wide drop-shadow-md">
                      <span className="flex items-center gap-2">
                        <Flame size={16} className="animate-pulse text-orange-400" />
                        Heating until {new Date(Date.now() + timeLeft * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  {!isMini && !isRunning && (
                    <div className="text-stone-500/80 text-xs font-bold tracking-[0.2em] mt-4 uppercase animate-pulse shadow-black drop-shadow-sm">
                      Scroll to Set Time
                    </div>
                  )}
                  {isRunning && !isMini && (
                    <div className="text-orange-400/60 text-xs font-bold tracking-[0.2em] mt-2 uppercase">
                      Infrared On
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dock Area (Pinned to flow bottom) */}
            <div className={`flex-none w-full flex justify-center pb-8 z-30 ${isMini ? "pb-4" : ""}`}>
              {/* Glass Dock Container - Dark Stone Texture */}
              <div className={`flex items-center justify-center gap-12 px-12 py-1 bg-[#291d18]/80 backdrop-blur-xl rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)] border-t border-white/5 transition-all duration-500 ${isMini ? "scale-75 origin-bottom gap-6 px-8" : ""}`}>

                {/* Reset Button (Left) */}
                {!isMini && (
                  <motion.button
                    onClick={handleReset}
                    whileHover={{
                      scale: 1.15,
                      rotate: -15,
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      color: "#fb7185", // rose-400
                    }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="flex-none p-2 rounded-full text-stone-500 bg-transparent transition-colors"
                    title="Reset"
                  >
                    <RotateCcw size={18} />
                  </motion.button>
                )}

                {/* Main Action Button (Center) - Hot Stone */}
                <motion.button
                  onClick={handleStartStop}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className={`flex-none w-[72px] h-[72px] mx-8 rounded-full flex items-center justify-center transition-all relative group overflow-hidden ${isRunning
                    ? "bg-gradient-to-br from-orange-700 to-red-700 text-white shadow-[0_0_40px_rgba(239,68,68,0.5),inset_0_2px_5px_rgba(255,255,255,0.3)] ring-1 ring-orange-500/30"
                    : "bg-gradient-to-br from-[#3f3b38] to-[#1c1917] text-stone-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_15px_30px_rgba(0,0,0,0.6)] border-t border-white/10"
                    }`}
                >
                  {/* Internal highlight for 3D stone effect */}
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${isRunning ? "from-white/20 to-transparent" : "from-white/10 via-transparent to-black/40"} pointer-events-none`} />

                  <AnimatePresence mode="wait">
                    {isRunning ? (
                      <motion.div
                        key="pause"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Pause size={28} fill="currentColor" className="drop-shadow-lg text-orange-50" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="play"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                        className="ml-1"
                      >
                        <Play size={28} fill="currentColor" className="drop-shadow-md opacity-90 text-stone-300" />
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
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      color: "#6ee7b7", // emerald-300
                    }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="flex-none p-2 rounded-full text-stone-500 bg-transparent transition-colors"
                    title="Finish"
                  >
                    <CheckCircle size={18} />
                  </motion.button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-grow flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-[#291d18]/90 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/5 shadow-2xl z-10 overflow-y-auto max-h-[80vh] animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-stone-200 tracking-wide">Sauna Logs</h2>
                <div className="text-xs text-stone-500 font-mono tracking-widest uppercase">History</div>
              </div>

              <div className="custom-calendar mb-6 bg-black/40 rounded-2xl p-2 border border-white/5">
                <Calendar
                  tileContent={({ date, view }) => {
                    if (view !== 'month') return null;
                    const dStr = date.toLocaleDateString('en-CA');
                    const mins = focusHistory[dStr];
                    if (mins) {
                      return (
                        <div className="flex flex-col items-center mt-1">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_5px_rgba(249,115,22,0.8)]"></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-stone-600 uppercase tracking-widest mb-4">Recent Sessions</h3>
                {Object.entries(focusHistory)
                  .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                  .slice(0, 3)
                  .map(([date, mins]) => (
                    <div key={date} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                      <span className="text-stone-400 font-mono text-sm">{date}</span>
                      <span className="text-orange-300 font-bold drop-shadow-sm">{mins} min</span>
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