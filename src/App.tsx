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

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mins = parseInt(e.target.value);
    setSelectedMinutes(mins);
    if (!isRunning) {
      setTimeLeft(mins * 60);
    }
  };

  const toggleMini = async () => {
    const nextMini = !isMini;
    setIsMini(nextMini);
    await invoke("toggle_mini_mode", { isMini: nextMini });
    if (nextMini) setView("timer");
  };

  // 円周の計算
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  // 時間経過とともに円が増える（満たされていく）アニメーション
  // 開始時 (timeLeft = total) => offset = circumference (空)
  // 終了時 (timeLeft = 0) => offset = 0 (満タン)
  const totalSeconds = selectedMinutes * 60;
  const strokeDashoffset = (timeLeft / totalSeconds) * circumference;

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col select-none relative overflow-hidden">
      
      {/* ヘッダーエリア */}
      <header className="w-full flex justify-between items-center p-4 z-50 absolute top-0 left-0">
        <div className="flex gap-2">
          {!isMini && (
            <button 
              onClick={() => setView(view === "timer" ? "calendar" : "timer")}
              className="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700/80 transition-all text-slate-200 backdrop-blur-sm shadow-lg border border-slate-700/30 cursor-pointer group"
              title={view === "timer" ? "履歴を表示" : "タイマーに戻る"}
            >
              {view === "timer" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              )}
            </button>
          )}
        </div>
        <button 
          onClick={toggleMini}
          className="p-3 rounded-full bg-indigo-600/80 hover:bg-indigo-500 transition-all text-white shadow-lg border border-indigo-400/30 backdrop-blur-sm cursor-pointer"
          title={isMini ? "拡大表示" : "ミニモード"}
        >
          {isMini ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" x2="14" y1="3" y2="10"/>
              <line x1="3" x2="10" y1="21" y2="14"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20"/>
              <polyline points="20 10 14 10 14 4"/>
              <line x1="14" x2="21" y1="10" y2="3"/>
              <line x1="3" x2="10" y1="21" y2="14"/>
            </svg>
          )}
        </button>
      </header>

      {/* メインコンテンツエリア */}
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        
        {view === "timer" ? (
          <>
            {/* サウナ時計ビジュアル */}
            <div className={`relative ${isMini ? "w-[200px] h-[200px] mb-2" : "w-[360px] h-[360px] mb-8"} flex-none flex items-center justify-center z-0 transition-all duration-500`}>
              <svg 
                className="absolute top-0 left-0 transform -rotate-90 pointer-events-none w-full h-full"
                viewBox="0 0 300 300"
              >
                {/* 背景の円（暗い部分） */}
                <circle cx="150" cy="150" r={radius} stroke="#1e293b" strokeWidth="8" fill="transparent" />
                {/* 進行の円（明るい部分） */}
                <circle
                  cx="150" cy="150" r={radius} stroke="#818cf8" strokeWidth="12" fill="transparent"
                  strokeDasharray={circumference}
                  style={{ 
                    strokeDashoffset: strokeDashoffset,
                    transition: "stroke-dashoffset 1s linear"
                  }}
                  strokeLinecap="round"
                />
              </svg>
              <div className={`${isMini ? "text-5xl" : "text-8xl"} font-mono font-light tracking-tighter z-10 text-slate-100 drop-shadow-lg transition-all`}>
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* 時間設定スライダー (停止中かつ通常モードのみ表示) */}
            {!isMini && !isRunning && (
              <div className="w-64 mb-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={selectedMinutes}
                  onChange={handleTimeChange}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="mt-2 text-slate-400 text-sm font-medium tracking-wide">
                  設定時間: <span className="text-indigo-400">{selectedMinutes}</span> 分
                </div>
              </div>
            )}

            <div className={`flex gap-6 z-10 ${isMini ? "scale-90" : ""}`}>
              <button
                onClick={handleStartStop}
                className={`${isMini ? "px-6 py-2" : "px-10 py-4"} rounded-full font-bold text-lg shadow-xl shadow-indigo-900/20 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer ${
                  isRunning 
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700" 
                  : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500"
                }`}
              >
                {isRunning ? (
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                        <span>停止</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>開始</span>
                    </div>
                )}
              </button>

              {!isMini && (
                <>
                  <button 
                    onClick={handleFinish} 
                    className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all hover:scale-105 active:scale-95 shadow-lg border border-slate-700/50 cursor-pointer"
                    title="終了して記録"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                  <button 
                    onClick={handleReset} 
                    className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all hover:scale-105 active:scale-95 shadow-lg border border-slate-700/50 cursor-pointer"
                    title="リセット"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/50 shadow-2xl z-10 overflow-y-auto max-h-[80vh] animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-indigo-100">集中ログ</h2>
                <div className="text-xs text-slate-500 font-mono">HISTORY</div>
            </div>
            
            <div className="custom-calendar mb-6 bg-slate-950/50 rounded-2xl p-2 border border-slate-800">
              <Calendar 
                tileContent={({ date, view }) => {
                  if (view !== 'month') return null;
                  const dStr = date.toLocaleDateString('en-CA');
                  const mins = focusHistory[dStr];
                  if (mins) {
                    return (
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </div>
            
            <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Recent Activity</h3>
                {Object.entries(focusHistory)
                    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                    .slice(0, 3)
                    .map(([date, mins]) => (
                        <div key={date} className="flex justify-between items-center p-3 rounded-xl bg-slate-800/30 border border-slate-800/50">
                            <span className="text-slate-300 font-mono text-sm">{date}</span>
                            <span className="text-indigo-300 font-bold">{mins} min</span>
                        </div>
                    ))
                }
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;