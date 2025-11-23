import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Download, RefreshCw, AlertCircle, 
  Wand2, PenTool, Layers, Layout, Share2, History, X, 
  Maximize2, BookOpen, Sun, Moon, ChevronRight, Zap, Eye, 
  Volume2, Copy, Palette, RotateCcw, Minimize2, Activity, Mail, Send, Info, ScanLine, Key
} from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { ImageComparison } from './components/ImageComparison';
import { processFile, redrawDiagram, analyzeImage, explainDiagram } from './services/geminiService';
import { AppState, DiagramStyle, HistoryItem, AspectRatio } from './types';

// Feature list
const FEATURES = [
  "Neural Analysis", "Style Matrix", "Cipher Engine", "Memory Bank", 
  "Flux Slider", "Education Link", "Vector Synthesis", "Neon Core", 
  "Ratio Control", "Auto-Enhance", "Ultra-Res Export", "Cyber/Solar Mode"
];

// Available Themes
type ThemeType = 'default' | 'nebula' | 'bio' | 'solar' | 'quantum';
const THEMES: { id: ThemeType, name: string, color: string }[] = [
    { id: 'default', name: 'Zero Point', color: '#00f3ff' },
    { id: 'nebula', name: 'Nebula', color: '#ff00ff' },
    { id: 'bio', name: 'Bio-Hazard', color: '#00ff64' },
    { id: 'solar', name: 'Solar Flare', color: '#ffa000' },
    { id: 'quantum', name: 'Quantum', color: '#ffffff' }
];

const HexLogo = () => (
    <div className="relative w-10 h-10 flex items-center justify-center group">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(var(--color-primary),0.8)]">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'rgb(var(--color-primary))', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'rgb(var(--color-secondary))', stopOpacity:1}} />
                </linearGradient>
            </defs>
            <path d="M50 5 L95 27.5 L95 72.5 L50 95 L5 72.5 L5 27.5 Z" fill="none" stroke="url(#grad1)" strokeWidth="6" strokeLinecap="round" className="hex-path" />
        </svg>
        <span className="absolute text-xl font-bold font-brand text-white cursor-default">C</span>
    </div>
);

const ShatterLink = ({ href, icon: Icon, label, colorClass }: { href: string, icon: any, label: string, colorClass: string }) => {
    const [broken, setBroken] = useState(false);
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setBroken(true);
        setTimeout(() => { window.open(href, '_blank'); setBroken(false); }, 1500);
    };
    return (
        <a href={href} onClick={handleClick} className={`flex items-center gap-3 p-4 rounded-xl border border-[var(--border-color)] hover:scale-105 hover:border-cyber-primary cursor-pointer group bg-[var(--panel-bg)] ${colorClass}`}>
            <div className={`p-3 rounded-full bg-[var(--border-color)] ${broken ? 'animate-shatter pointer-events-none' : 'group-hover:rotate-12 transition-transform'}`}>
                <Icon className="w-6 h-6 text-cyber-primary" />
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-lg font-brand text-[var(--text-color)]">{label}</span>
                <span className="text-xs opacity-70 text-[var(--text-muted)]">INITIATE UPLINK</span>
            </div>
        </a>
    );
};

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [autoPrompt, setAutoPrompt] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  
  const [selectedStyle, setSelectedStyle] = useState<DiagramStyle>(DiagramStyle.STANDARD);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // API Key State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
      // Load stored API key
      const storedKey = localStorage.getItem('cipher_api_key');
      if (storedKey) setApiKey(storedKey);
  }, []);

  const saveApiKey = (key: string) => {
      setApiKey(key);
      localStorage.setItem('cipher_api_key', key);
  };

  useEffect(() => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    // Apply dark mode class to html element for index.html CSS variables
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const saved = localStorage.getItem('cipher_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (appState === AppState.SUCCESS && originalImage && generatedImage) {
      const newItem: HistoryItem = { id: Date.now().toString(), original: originalImage, generated: generatedImage, prompt: prompt, date: Date.now() };
      const newHistory = [newItem, ...history].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('cipher_history', JSON.stringify(newHistory));
    }
  }, [appState, generatedImage]);

  // Robust Auto-Analyze Logic
  useEffect(() => {
    if (originalImage && !generatedImage && appState === AppState.IDLE && !prompt) {
        performImageAnalysis();
    }
  }, [originalImage]);

  const performImageAnalysis = async () => {
      if (!originalImage) return;
      setAppState(AppState.ANALYZING);
      try {
          const analysis = await analyzeImage(originalImage, apiKey);
          setPrompt(analysis);
          setAutoPrompt(analysis);
          setAppState(AppState.IDLE);
      } catch (err) {
          console.error("Analysis failed", err);
          setPrompt("Auto-analysis failed. Please check your API Key settings or describe the image manually.");
          setAppState(AppState.IDLE);
      }
  };

  const handleFileSelect = async (file: File) => {
    try {
      setAppState(AppState.UPLOADING);
      const dataUrl = await processFile(file);
      setOriginalImage(dataUrl);
      setGeneratedImage(null);
      setPrompt(""); 
      setAutoPrompt("");
      setExplanation(null);
      setErrorMsg(null);
      setAppState(AppState.IDLE);
      // Logic for analysis is triggered by useEffect when originalImage changes
    } catch (err) {
      setErrorMsg("Failed to process file. It may be too large.");
      setAppState(AppState.IDLE);
    }
  };

  const handleGenerate = async () => {
    if (!originalImage) return;
    setAppState(AppState.GENERATING);
    setErrorMsg(null);
    try {
      // Fallback for prompt if empty
      const promptToUse = prompt || "Scientific diagram of the image content";
      const resultImageUrl = await redrawDiagram(originalImage, promptToUse, selectedStyle, aspectRatio, apiKey);
      setGeneratedImage(resultImageUrl);
      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setAppState(AppState.ERROR);
      if (err.message && err.message.includes("API Key")) {
          setErrorMsg("API Key Missing. Click the Key icon at the top right.");
          setShowSettings(true);
      } else {
          // Show the real error message to help user debug (e.g., Safety, Quota, etc.)
          setErrorMsg(err.message || "Generation failed.");
      }
    }
  };

  const handleExplain = async () => {
      if(!originalImage) return;
      setAppState(AppState.EXPLAINING);
      try {
          const text = await explainDiagram(originalImage, apiKey);
          setExplanation(text);
          setAppState(AppState.IDLE);
      } catch(e) {
          setAppState(AppState.IDLE);
          alert("Explanation failed. Check API Key.");
      }
  };

  const enhancePrompt = () => {
      if(!prompt) return;
      setPrompt(prev => prev + " highly detailed, 8k resolution, precise scientific accuracy, professional vector art.");
  };

  return (
    <div className={`min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] font-sans transition-colors duration-500`}>
        {/* Header */}
        <header className="hud-panel sticky top-0 z-50 transition-all duration-500">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setShowAbout(true)}>
              <HexLogo />
              <h1 className="text-3xl font-bold font-brand tracking-tighter text-[var(--text-color)] drop-shadow-md">CIPHER</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded hover:bg-[var(--border-color)] border border-[var(--border-color)] ${!apiKey ? 'text-red-500 animate-pulse border-red-500' : 'text-cyber-primary'}`} title="API Key Settings">
                <Key className="w-5 h-5" />
              </button>

              <div className="relative">
                  <button onClick={() => setShowThemeSelector(!showThemeSelector)} className="p-2 rounded hover:bg-[var(--border-color)] text-cyber-primary border border-cyber-primary/30"><Palette className="w-5 h-5" /></button>
                  {showThemeSelector && (
                      <div className="absolute top-full right-0 mt-2 p-3 rounded hud-panel flex flex-col gap-2 min-w-[160px] z-50">
                          {THEMES.map(theme => (
                              <button key={theme.id} onClick={() => { setCurrentTheme(theme.id); setShowThemeSelector(false); }} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-[var(--border-color)] text-xs font-mono uppercase">
                                  <div className="w-3 h-3 rounded-full" style={{ background: theme.color }}></div>
                                  <span className={currentTheme === theme.id ? 'font-bold text-[var(--text-color)]' : 'text-[var(--text-muted)]'}>{theme.name}</span>
                              </button>
                          ))}
                      </div>
                  )}
              </div>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-color)]">
                {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-500" />}
              </button>
              <button onClick={() => setShowHistory(true)} className="p-2 rounded hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-color)]"><History className="w-5 h-5" /></button>
              <button onClick={() => setShowAbout(true)} className="p-2 rounded hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-color)]"><Info className="w-5 h-5" /></button>
              {appState === AppState.SUCCESS && (
                <button onClick={() => { setOriginalImage(null); setGeneratedImage(null); }} className="text-sm bg-cyber-primary text-black font-bold px-4 py-1.5 rounded flex items-center gap-2 shadow-neon"><RefreshCw className="w-4 h-4" /> NEW</button>
              )}
            </div>
          </div>
        </header>
        
        {/* Settings / API Key Modal */}
        {showSettings && (
             <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
                 <div className="relative z-10 w-full max-w-md bg-[var(--panel-bg)] border border-cyber-primary rounded p-6 shadow-2xl">
                     <h3 className="text-xl font-bold text-[var(--text-color)] mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-cyber-primary"/> API CONFIGURATION</h3>
                     <p className="text-xs text-[var(--text-muted)] mb-4">A valid Google Gemini API Key is required for neural processing.</p>
                     <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => saveApiKey(e.target.value)}
                        placeholder="Paste Gemini API Key here..."
                        className="w-full p-3 rounded input-bg border border-[var(--border-color)] focus:border-cyber-primary outline-none mb-4 font-mono text-sm"
                     />
                     <div className="flex justify-end gap-2">
                         <button onClick={() => setShowSettings(false)} className="px-4 py-2 rounded border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--border-color)]">Close</button>
                         <button onClick={() => setShowSettings(false)} className="px-4 py-2 rounded bg-cyber-primary text-black font-bold hover:shadow-neon">Save Key</button>
                     </div>
                 </div>
             </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto p-4 lg:p-8 flex flex-col gap-8 relative z-10">
          
          {/* Hero Section */}
          {!originalImage && (
              <div className="text-center py-20 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyber-primary/5 rounded-full blur-3xl -z-10"></div>
                  <h2 className="text-5xl md:text-7xl font-bold font-brand mb-6 text-[var(--text-color)] drop-shadow-[0_0_15px_rgba(var(--color-primary),0.5)]">
                      REDEFINE REALITY
                  </h2>
                  <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto mb-10 font-mono">
                      Enhance scientific diagrams with neural intelligence.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
                      {FEATURES.slice(0, 10).map((f, i) => (
                          <span key={i} className="px-3 py-1 rounded border border-cyber-primary/30 bg-[var(--panel-bg)] text-cyber-primary text-[10px] uppercase tracking-widest font-mono">
                              {f}
                          </span>
                      ))}
                  </div>
              </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT: Input & Controls */}
              <div className={`lg:col-span-5 space-y-6 ${isFullScreen ? 'hidden' : 'block'}`}>
                  <div className="hud-panel rounded p-1 min-h-[300px]">
                      {!originalImage ? (
                          <FileUpload onFileSelect={handleFileSelect} />
                      ) : (
                          <div className="relative group rounded bg-black border border-slate-700">
                               <img src={originalImage} alt="Original" className="w-full max-h-64 object-contain" />
                               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                  <button onClick={() => setOriginalImage(null)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-mono text-xs">TERMINATE</button>
                                  <button onClick={handleExplain} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-mono text-xs flex items-center gap-2"><BookOpen className="w-4 h-4"/> EXPLAIN</button>
                               </div>
                          </div>
                      )}
                  </div>

                  {originalImage && (
                      <div className="hud-panel rounded p-6 space-y-6">
                          {/* Prompt Area */}
                          <div>
                              <div className="flex justify-between items-center mb-2">
                                  <label className="text-xs font-bold text-cyber-primary uppercase tracking-widest flex items-center gap-1"><Activity className="w-3 h-3"/> Neural Prompt</label>
                                  <div className="flex gap-2">
                                    <button onClick={performImageAnalysis} className="text-[10px] border border-cyber-primary text-cyber-primary px-2 py-1 rounded hover:bg-cyber-primary hover:text-black" title="Force Re-Scan"><ScanLine className="w-3 h-3 inline"/> Scan</button>
                                    {autoPrompt && <button onClick={() => setPrompt(autoPrompt)} className="text-[10px] border border-[var(--border-color)] text-[var(--text-muted)] px-2 py-1 rounded hover:bg-[var(--border-color)]"><RotateCcw className="w-3 h-3 inline"/> Reset</button>}
                                    <button onClick={enhancePrompt} className="text-[10px] bg-cyber-primary text-black px-2 py-1 rounded font-bold hover:opacity-80"><Wand2 className="w-3 h-3 inline"/> Enhance</button>
                                  </div>
                              </div>
                              <textarea 
                                  value={prompt} 
                                  onChange={(e) => setPrompt(e.target.value)}
                                  className="w-full h-32 rounded p-3 text-sm focus:border-cyber-primary outline-none resize-none font-mono input-bg placeholder:text-[var(--text-muted)]"
                                  placeholder={appState === AppState.ANALYZING ? "Scanning Neural Patterns..." : "Enter prompt description..."}
                                  disabled={appState === AppState.ANALYZING}
                              />
                              {appState === AppState.ANALYZING && <p className="text-xs text-cyber-primary animate-pulse mt-1">ANALYZING PIXELS...</p>}
                          </div>

                          {/* Explanation Result */}
                          {explanation && (
                              <div className="bg-[var(--input-bg)] border border-cyber-primary/30 p-4 rounded text-sm text-[var(--text-muted)] font-mono h-32 overflow-y-auto">
                                  <div className="flex justify-between mb-2"><span className="text-cyber-primary font-bold">ANALYSIS:</span> <button onClick={() => { const u = new SpeechSynthesisUtterance(explanation); window.speechSynthesis.speak(u); }}><Volume2 className="w-4 h-4 text-cyber-primary"/></button></div>
                                  {explanation}
                              </div>
                          )}

                          {/* Style Grid */}
                          <div className="grid grid-cols-3 gap-2">
                              {Object.values(DiagramStyle).map((style) => (
                                  <button key={style} onClick={() => setSelectedStyle(style)} className={`p-2 rounded border text-[10px] uppercase font-bold transition-all ${selectedStyle === style ? 'bg-cyber-primary text-black border-cyber-primary' : 'bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-cyber-primary hover:text-cyber-primary'}`}>
                                      {style}
                                  </button>
                              ))}
                          </div>

                          {/* Execute Button - Fixed High Contrast */}
                          <button 
                            onClick={handleGenerate} 
                            disabled={appState === AppState.GENERATING || appState === AppState.ANALYZING} 
                            className={`w-full py-4 rounded font-black tracking-widest uppercase text-lg transition-all shadow-lg ${
                                appState === AppState.GENERATING 
                                ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                                : 'bg-cyber-primary text-black hover:shadow-[0_0_25px_rgb(var(--color-primary))] hover:scale-[1.01] hover:text-black border-2 border-transparent hover:border-white'
                            }`}
                          >
                              {appState === AppState.GENERATING ? 'PROCESSING...' : 'EXECUTE RENDER'}
                          </button>
                          
                          {/* Error Message Box */}
                          {errorMsg && (
                            <div className="mt-4 p-4 rounded bg-red-950/50 border border-red-500 text-red-200 text-sm font-mono relative animate-pulse-fast">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div className="break-words w-full">
                                        <p className="font-bold text-red-500 mb-1">SYSTEM ERROR</p>
                                        {errorMsg}
                                    </div>
                                </div>
                            </div>
                          )}
                      </div>
                  )}
              </div>

              {/* RIGHT: Output */}
              <div className={`${isFullScreen ? 'col-span-12' : 'lg:col-span-7'}`}>
                  <div className="hud-panel rounded p-1 h-full min-h-[500px] flex flex-col justify-center relative">
                      {generatedImage && (
                          <div className="absolute top-4 right-4 z-20 flex gap-2">
                              <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 bg-black/70 rounded-full border border-white/20 text-white hover:text-cyber-primary transition-colors">
                                  {isFullScreen ? <Minimize2 className="w-4 h-4"/> : <Maximize2 className="w-4 h-4"/>}
                              </button>
                              <button onClick={() => setShowLightbox(true)} className="p-2 bg-black/70 rounded-full border border-white/20 text-white hover:text-cyber-primary transition-colors"><Eye className="w-4 h-4"/></button>
                          </div>
                      )}
                      
                      {!generatedImage ? (
                           <div className="flex flex-col items-center justify-center opacity-40">
                               {appState === AppState.GENERATING ? (
                                   <div className="w-16 h-16 border-4 border-cyber-primary border-t-transparent rounded-full animate-spin"></div>
                               ) : (
                                   <>
                                     <Layers className="w-20 h-20 mb-4 stroke-1 text-[var(--text-muted)]"/>
                                     <p className="font-brand text-2xl text-[var(--text-muted)]">AWAITING OUTPUT</p>
                                   </>
                               )}
                           </div>
                      ) : (
                          <div className="h-full flex flex-col gap-4">
                              <div className="flex-grow relative bg-black rounded border border-slate-800 overflow-hidden">
                                  {originalImage ? <ImageComparison beforeImage={originalImage} afterImage={generatedImage} /> : <img src={generatedImage} className="w-full h-full object-contain"/>}
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => { const l = document.createElement('a'); l.href = generatedImage; l.download = 'cipher-out.png'; l.click(); }} className="flex-1 bg-green-600 text-white py-3 rounded font-bold tracking-widest uppercase hover:bg-green-500 border border-green-400 flex items-center justify-center gap-2"><Download className="w-5 h-5"/> Save Asset</button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* About Modal */}
          {showAbout && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/90 backdrop-blur" onClick={() => setShowAbout(false)}></div>
                  <div className="relative z-10 w-full max-w-lg bg-[var(--panel-bg)] border border-cyber-primary rounded p-8 shadow-[0_0_50px_rgba(var(--color-primary),0.3)]">
                      <button onClick={() => setShowAbout(false)} className="absolute top-4 right-4 text-[var(--text-color)] hover:text-cyber-primary"><X className="w-6 h-6"/></button>
                      <div className="flex items-center gap-4 mb-6"><HexLogo /><h2 className="text-3xl font-brand font-bold text-[var(--text-color)]">CIPHER</h2></div>
                      <p className="text-[var(--text-muted)] font-light mb-6">Elite generative AI construct for technical diagram enhancement.</p>
                      <div className="grid grid-cols-2 gap-4">
                          <ShatterLink href="https://t.me/cipher_attacks" icon={Send} label="Join Uplink" colorClass="hover:border-blue-400" />
                          <ShatterLink href="mailto:birukgetachew253@gmail.com" icon={Mail} label="Email Comm" colorClass="hover:border-red-400" />
                      </div>
                      <div className="mt-6 pt-6 border-t border-[var(--border-color)] flex justify-between text-xs text-[var(--text-muted)] font-mono">
                          <span>VER 3.1.2</span>
                          <span className="text-cyber-primary">Powered by Biruk Getachew (Cipher)</span>
                      </div>
                  </div>
              </div>
          )}
          
          {/* Lightbox */}
          {showLightbox && generatedImage && (
              <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur flex items-center justify-center p-4">
                  <button onClick={() => setShowLightbox(false)} className="absolute top-6 right-6 text-white hover:text-cyber-primary"><X className="w-8 h-8"/></button>
                  <img src={generatedImage} className="max-w-full max-h-full object-contain rounded border border-cyber-primary/20 shadow-[0_0_50px_rgba(var(--color-primary),0.2)]" />
              </div>
          )}

          {/* History Drawer */}
          {showHistory && (
              <div className="fixed inset-0 z-[60] flex justify-end">
                  <div className="absolute inset-0 bg-black/50 backdrop-blur" onClick={() => setShowHistory(false)}></div>
                  <div className="w-80 bg-[var(--panel-bg)] border-l border-cyber-primary h-full relative z-10 p-6 overflow-y-auto">
                       <h2 className="text-xl font-bold font-brand text-[var(--text-color)] mb-6 flex items-center gap-2"><History className="w-5 h-5 text-cyber-primary"/> LOGS</h2>
                       <div className="space-y-4">
                           {history.map(item => (
                               <div key={item.id} onClick={() => { setOriginalImage(item.original); setGeneratedImage(item.generated); setPrompt(item.prompt); setShowHistory(false); setAppState(AppState.SUCCESS); }} className="cursor-pointer bg-[var(--input-bg)] border border-[var(--border-color)] hover:border-cyber-primary p-2 rounded group">
                                   <img src={item.generated} className="w-full h-24 object-cover rounded mb-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                                   <p className="text-[10px] text-[var(--text-muted)] truncate font-mono">{item.prompt}</p>
                               </div>
                           ))}
                       </div>
                  </div>
              </div>
          )}
        </main>
        
        {/* Footer */}
        <footer className="fixed bottom-0 w-full h-6 bg-[var(--panel-bg)] border-t border-[var(--border-color)] flex items-center justify-between px-4 text-[10px] text-cyber-primary font-mono z-40">
             <span>SYSTEM ONLINE</span>
             <span>CIPHER CORE ACTIVE</span>
        </footer>
    </div>
  );
}