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
  const DEFAULT_TIME = 25 * 60; // 25分
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME);
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
      saveSession(DEFAULT_TIME / 60); // 完了時にフルセッション分保存
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

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
    setTimeLeft(DEFAULT_TIME);
  };

  const handleFinish = () => {
    const elapsedMinutes = Math.floor((DEFAULT_TIME - timeLeft) / 60);
    if (elapsedMinutes > 0) {
      saveSession(elapsedMinutes);
      alert(`${elapsedMinutes}分間の集中を記録しました`);
    }
    setIsRunning(false);
    setTimeLeft(DEFAULT_TIME);
  };

  const toggleMini = async () => {
    const nextMini = !isMini;
    setIsMini(nextMini);
    await invoke("toggle_mini_mode", { isMini: nextMini });
    if (nextMini) setView("timer"); // ミニモード時はタイマー固定
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none relative overflow-hidden">
      
      {/* ヘッダーエリア */}
      <header className="w-full flex justify-between items-center p-4 z-50">
        <div className="flex gap-2">
          {!isMini && (
            <button 
              onClick={() => setView(view === "timer" ? "calendar" : "timer")}
              className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition text-xs font-bold border border-slate-700 shadow-lg cursor-pointer"
            >
              {view === "timer" ? "履歴を表示" : "タイマーに戻る"}
            </button>
          )}
        </div>
        <button 
          onClick={toggleMini}
          className="px-4 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 transition-all text-xs font-bold text-white shadow-lg border border-indigo-400/30 backdrop-blur-sm cursor-pointer"
        >
          {isMini ? "拡大表示" : "ミニモード"}
        </button>
      </header>

      {/* メインコンテンツエリア */}
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        
        {view === "timer" ? (
          <>
            {!isMini && (
              <h1 className="text-2xl font-light mb-8 tracking-widest text-indigo-300 uppercase z-10">ZenFocus</h1>
            )}
            
            {/* サウナ時計ビジュアル */}
            <div className={`relative ${isMini ? "w-[200px] h-[200px] mb-4" : "w-[300px] h-[300px] mb-12"} flex-none flex items-center justify-center z-0 transition-all duration-500`}>
              <svg 
                className="absolute top-0 left-0 transform -rotate-90 pointer-events-none w-full h-full"
                viewBox="0 0 300 300"
              >
                <circle cx="150" cy="150" r="130" stroke="#1e293b" strokeWidth="12" fill="transparent" />
                <circle
                  cx="150" cy="150" r="130" stroke="#6366f1" strokeWidth="12" fill="transparent"
                  strokeDasharray={2 * Math.PI * 130}
                  style={{ 
                    strokeDashoffset: (2 * Math.PI * 130) - (timeLeft / DEFAULT_TIME) * (2 * Math.PI * 130),
                    transition: "stroke-dashoffset 1s linear"
                  }}
                  strokeLinecap="round"
                />
              </svg>
              <div className={`${isMini ? "text-4xl" : "text-6xl"} font-mono font-medium tracking-tighter z-10 transition-all`}>
                {formatTime(timeLeft)}
              </div>
            </div>

            <div className="flex gap-4 z-10">
              <button
                onClick={handleStartStop}
                className={`${isMini ? "w-24 text-sm py-2" : "w-32 py-3"} rounded-xl font-medium transition-all duration-300 shadow-lg cursor-pointer ${
                  isRunning ? "bg-rose-900/40 text-rose-200 border border-rose-800 hover:bg-rose-800/60" : "bg-emerald-900/40 text-emerald-200 border border-emerald-800 hover:bg-emerald-800/60"
                }`}
              >
                {isRunning ? "停止" : "開始"}
              </button>

              {!isMini && (
                <>
                  <button onClick={handleFinish} className="w-32 py-3 rounded-xl bg-indigo-900/40 text-indigo-200 border border-indigo-800 hover:bg-indigo-800/60 font-medium shadow-lg cursor-pointer">
                    終了
                  </button>
                  <button onClick={handleReset} className="w-32 py-3 rounded-xl bg-slate-800/40 text-slate-300 border border-slate-700 hover:bg-slate-700/60 font-medium shadow-lg cursor-pointer">
                    リセット
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="w-full max-w-md bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl z-10 overflow-y-auto max-h-[80vh]">
            <h2 className="text-xl font-bold mb-4 text-indigo-300 text-center">集中ログ</h2>
            <div className="custom-calendar mb-6 bg-slate-900 rounded-xl">
              <Calendar 
                tileContent={({ date, view }) => {
                  if (view !== 'month') return null;
                  const dStr = date.toLocaleDateString('en-CA');
                  const mins = focusHistory[dStr];
                  if (mins) {
                    return (
                      <div className="flex flex-col items-center">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1"></div>
                        <span className="text-[9px] text-indigo-400 mt-0.5">{mins}m</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </div>
            <div className="text-center text-slate-400 text-xs">
              今日も一歩ずつ進みましょう
            </div>
          </div>
        )}

        {!isMini && view === "timer" && (
          <div className="mt-12 text-slate-500 font-light tracking-wide italic z-10">
            "Focus on the present moment"
          </div>
        )}
      </main>
    </div>
  );
}

export default App;