import { createSignal, onMount } from "solid-js";

// Declare lucide globally since it's loaded from CDN in index.html
declare const lucide: any;

export default function App() {
  const [activeTool, setActiveTool] = createSignal("pen");
  const [activeTab, setActiveTab] = createSignal("layers");
  const [zoom, setZoom] = createSignal(100);
  const [fileMenuOpen, setFileMenuOpen] = createSignal(false);
  const [ramUsage, setRamUsage] = createSignal(112);

  onMount(() => {
    // Initialize Lucide icons on mount
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  });

  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
  };

  return (
    <div class="app grid grid-rows-[32px_38px_1fr_26px] h-screen overflow-hidden text-[13px] font-medium bg-[#1A1A1C] text-[#D4D4D8]">
      
      {/* 1. TOP WINDOW HEADER & MENUBAR */}
      <header data-tauri-drag-region class="menubar flex items-center justify-between pl-3 pr-0 bg-[#1A1A1C] border-b border-[#343438] h-[32px] relative select-none">
        <div data-tauri-drag-region class="flex items-center h-full">
          {/* Logo */}
          <div class="flex items-center gap-1.5 mr-4 text-[11px] text-[#D4D4D8]">
            <div class="w-4 h-4 bg-gradient-to-tr from-[#5C6AEA] to-[#7380F3] rounded-[2px] flex items-center justify-center text-[10px] font-black text-[#1A1A1C]">
              P
            </div>
            <span class="font-semibold tracking-wide">Photrez</span>
          </div>

          {/* Windows Style Flat Menu Bar */}
          <nav class="flex items-center h-full text-[#D4D4D8]" aria-label="Main menu">
            <div class="relative h-full flex items-center">
              <button 
                onClick={() => setFileMenuOpen(!fileMenuOpen())}
                class="px-3 h-full hover:bg-white/5 transition-colors duration-100 text-[11px] cursor-default"
              >
                File
              </button>
              {fileMenuOpen() && (
                <div class="absolute left-0 top-[32px] bg-[#29292B] border border-[#343438] rounded-[2px] shadow-lg py-1 w-56 z-50">
                  <a href="#" class="flex items-center justify-between px-3.5 py-1 hover:bg-[#5C6AEA] hover:text-white text-[#D4D4D8] text-[11px] no-underline">
                    <span>New Document...</span>
                    <span class="font-mono text-[10px] opacity-70">Ctrl+N</span>
                  </a>
                  <a href="#" class="flex items-center justify-between px-3.5 py-1 hover:bg-[#5C6AEA] hover:text-white text-[#D4D4D8] text-[11px] no-underline">
                    <span>Open Image...</span>
                    <span class="font-mono text-[10px] opacity-70">Ctrl+O</span>
                  </a>
                  <div class="h-[1px] bg-[#343438] my-1 mx-2"></div>
                  <a href="#" class="flex items-center justify-between px-3.5 py-1 hover:bg-[#5C6AEA] hover:text-white text-[#D4D4D8] text-[11px] no-underline">
                    <span>Export Graphic...</span>
                    <span class="font-mono text-[10px] opacity-70">Ctrl+E</span>
                  </a>
                </div>
              )}
            </div>
            <button class="px-3 h-full hover:bg-white/5 transition-colors duration-100 text-[11px] cursor-default">Edit</button>
            <button class="px-3 h-full hover:bg-white/5 transition-colors duration-100 text-[11px] cursor-default">View</button>
            <button class="px-3 h-full hover:bg-white/5 transition-colors duration-100 text-[11px] cursor-default">Window</button>
            <button class="px-3 h-full hover:bg-white/5 transition-colors duration-100 text-[11px] cursor-default">Help</button>
          </nav>
        </div>

        {/* Dynamic App Title */}
        <div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
          <span class="font-mono text-[10px] text-[#A1A1AA] tracking-tight">banner-client-v4.qanvas</span>
          <span class="w-1 h-1 rounded-full bg-[#A1A1AA]"></span>
          <span class="text-[10px] text-[#71717A] font-normal">Photrez Core v1.0</span>
        </div>

        {/* Windows Native Title Bar Controls (Simulated) */}
        <div class="flex items-center h-full text-[#A1A1AA]">
          <button class="h-full w-[46px] flex items-center justify-center hover:bg-white/5 hover:text-white transition-colors" title="Minimize">
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"></rect></svg>
          </button>
          <button class="h-full w-[46px] flex items-center justify-center hover:bg-white/5 hover:text-white transition-colors" title="Maximize">
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"></rect></svg>
          </button>
          <button class="h-full w-[46px] flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors" title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" stroke-width="1" stroke-linecap="round"></path></svg>
          </button>
        </div>
      </header>

      {/* 2. CONTEXTUAL TOOL OPTIONS BAR */}
      <section class="toolbar flex items-center justify-between px-3 bg-[#1A1A1C] border-b border-[#343438] h-[38px] text-[11px] text-[#A1A1AA]" aria-label="Tool options bar">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 border-r border-[#343438] pr-4 h-full py-1">
            <i data-lucide="pen-tool" class={`w-3.5 h-3.5 ${activeTool() === "pen" ? "text-[#5C6AEA]" : ""}`}></i>
            <span class="font-medium text-[#D4D4D8] text-[11px] capitalize">{activeTool()} Tool</span>
          </div>
          
          <div class="flex items-center gap-2">
            <span class="text-[#A1A1AA] text-[10px]">Fill</span>
            <button class="flex items-center gap-1.5 px-2 py-0.5 bg-[#202022] hover:bg-[#29292B] border border-[#343438] rounded-[2px] text-[11px]">
              <span class="w-3 h-3 rounded-[1px] bg-gradient-to-tr from-[#5C6AEA] to-[#7380F3] border border-white/20"></span>
              <span class="text-[11px] font-normal text-[#D4D4D8]">Studio Indigo</span>
              <i data-lucide="chevron-down" class="w-3 h-3 text-[#71717A]"></i>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[#A1A1AA] text-[10px]">Stroke</span>
            <input type="text" class="w-14 h-[22px] bg-white/5 border border-white/10 border-b-white/40 focus:border-b-[#5C6AEA] font-sans text-[12px] font-normal text-center text-[#D4D4D8] rounded-[2px] outline-none transition-all duration-100" value="2.5 px" readonly />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button class="flex items-center gap-1.5 px-2.5 h-[22px] bg-[#202022] border border-[#343438] text-[#A1A1AA] hover:bg-[#29292B] hover:text-white rounded-[2px] transition-all duration-100 cursor-default">
            <i data-lucide="terminal" class="w-3 h-3 text-[#5C6AEA]"></i>
            <span class="text-[10px] font-normal">Command Palette</span>
            <kbd class="font-mono text-[9px] bg-[#161618] border border-[#343438] px-1 rounded-[1px] text-[#71717A]">Ctrl K</kbd>
          </button>
          
          <span class="w-[1px] h-4 bg-[#343438] mx-1"></span>
          <button class="px-2.5 h-[22px] bg-[#202022] border border-[#343438] text-[#A1A1AA] hover:bg-[#29292B] hover:text-white rounded-[2px] text-[10px] font-normal cursor-default">Inspector</button>
          <button class="flex items-center gap-1 px-3 h-[22px] bg-gradient-to-b from-[#7380F3] to-[#5C6AEA] hover:from-[#8793FA] hover:to-[#7380F3] active:bg-[#4754D1] text-white font-normal text-[11px] rounded-[2px] shadow-sm border border-white/10 border-t-white/30 transition-colors duration-100 cursor-default">
            <i data-lucide="share" class="w-3 h-3"></i>
            <span>Export</span>
          </button>
        </div>
      </section>

      {/* 3. WORKSPACE */}
      <div class="workspace grid grid-cols-[48px_1fr_320px] min-h-0 h-full overflow-hidden">
        
        {/* 3.1 LEFT TOOL RAIL */}
        <aside class="tool-rail bg-[#1A1A1C] border-r border-[#343438] py-3 flex flex-col items-center gap-1.5 z-10 relative">
          <div class="flex flex-col gap-1 w-full items-center">
            {/* Move Tool */}
            <div class="relative w-8 h-8 flex items-center justify-center">
              {activeTool() === "move" && <span class="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#5C6AEA]"></span>}
              <button 
                onClick={() => handleToolChange("move")}
                class={`w-8 h-8 rounded-[2px] flex items-center justify-center text-[#A1A1AA] hover:bg-[#29292B] hover:text-white transition-all duration-100 cursor-default ${activeTool() === "move" ? "text-white bg-[#29292B] shadow-inner" : ""}`} 
                title="Move Tool (V)"
              >
                <i data-lucide="move" class="w-4 h-4"></i>
              </button>
            </div>

            {/* Pen Tool */}
            <div class="relative w-8 h-8 flex items-center justify-center">
              {activeTool() === "pen" && <span class="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#5C6AEA]"></span>}
              <button 
                onClick={() => handleToolChange("pen")}
                class={`w-8 h-8 rounded-[2px] flex items-center justify-center text-[#A1A1AA] hover:bg-[#29292B] hover:text-white transition-all duration-100 cursor-default ${activeTool() === "pen" ? "text-white bg-[#29292B] shadow-inner" : ""}`} 
                title="Pen Tool (P)"
              >
                <i data-lucide="pen-tool" class="w-4 h-4"></i>
              </button>
            </div>

            {/* Text Tool */}
            <div class="relative w-8 h-8 flex items-center justify-center">
              {activeTool() === "text" && <span class="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#5C6AEA]"></span>}
              <button 
                onClick={() => handleToolChange("text")}
                class={`w-8 h-8 rounded-[2px] flex items-center justify-center text-[#A1A1AA] hover:bg-[#29292B] hover:text-white transition-all duration-100 cursor-default ${activeTool() === "text" ? "text-white bg-[#29292B] shadow-inner" : ""}`} 
                title="Text Tool (T)"
              >
                <i data-lucide="type" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
          <div class="mt-auto flex flex-col gap-1 w-full items-center">
            <button 
              onClick={() => setZoom(z => Math.min(200, z + 10))}
              class="w-8 h-8 rounded-[2px] flex items-center justify-center text-[#A1A1AA] hover:bg-[#29292B] hover:text-white transition-all duration-100 cursor-default" 
              title="Zoom In"
            >
              <i data-lucide="zoom-in" class="w-4 h-4"></i>
            </button>
            <button 
              onClick={() => setZoom(z => Math.max(10, z - 10))}
              class="w-8 h-8 rounded-[2px] flex items-center justify-center text-[#A1A1AA] hover:bg-[#29292B] hover:text-white transition-all duration-100 cursor-default" 
              title="Zoom Out"
            >
              <i data-lucide="zoom-out" class="w-4 h-4"></i>
            </button>
          </div>
        </aside>

        {/* 3.2 CANVAS VIEWPORT */}
        <main class="canvas-wrap relative bg-[#161618] overflow-hidden flex flex-col h-full">
          <div class="h-[18px] bg-[#1A1A1C] border-b border-[#343438] relative">
            <div class="absolute inset-0 font-mono text-[10px] text-[#71717A] leading-none pt-0.5 pointer-events-none">
              <span class="absolute -translate-x-1/2" style="left: 18px;">0</span>
              <span class="absolute -translate-x-1/2" style="left: 118px;">100</span>
              <span class="absolute -translate-x-1/2" style="left: 218px;">200</span>
              <span class="absolute -translate-x-1/2" style="left: 318px;">300</span>
              <span class="absolute -translate-x-1/2" style="left: 418px;">400</span>
              <span class="absolute -translate-x-1/2" style="left: 518px;">500</span>
            </div>
          </div>
          
          <div class="flex flex-row h-full min-h-0 w-full">
            <div class="w-[18px] bg-[#1A1A1C] border-r border-[#343438] relative"></div>
            <div class="flex-1 h-full flex items-center justify-center relative bg-[#161618]">
              {/* Artboard styled with zero-tint gray grid */}
              <div 
                class="artboard w-[680px] aspect-[16/10] border border-[#343438] shadow-[0_8px_16px_rgba(0,0,0,0.6)] relative rounded-[1px] overflow-hidden bg-[#202022]"
                style={`transform: scale(${zoom() / 100}); transition: transform var(--motion-normal);`}
              >
                <div class="absolute inset-0 bg-[#202022] flex flex-col justify-between p-8">
                  <div class="relative w-full h-[180px] rounded-[2px] border border-[#343438] bg-[#1A1A1C] flex items-center justify-center">
                    <svg class="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M 50,140 C 150,20 250,200 380,90" 
                        fill="none" 
                        stroke="#5C6AEA" 
                        stroke-width="2.5" 
                        stroke-dasharray="5" 
                        style="animation: dash 1s linear infinite;"
                      />
                      <circle cx="50" cy="140" r="4.5" fill="#1A1A1C" stroke="#5C6AEA" stroke-width="2" />
                      <circle cx="380" cy="90" r="4.5" fill="#1A1A1C" stroke="#5C6AEA" stroke-width="2" />
                    </svg>
                  </div>
                  <div class="flex items-end justify-between mt-4">
                    <div class="flex flex-col">
                      <span class="text-[10px] text-[#A1A1AA] font-normal uppercase tracking-wider">Campaign banner</span>
                      <h3 class="text-base font-bold text-white mt-1 leading-none">Explore Unknown</h3>
                    </div>
                    {/* Precise UCRT Primary Solid Button */}
                    <div class="px-4 py-1.5 rounded-[2px] bg-[#D4D4D8] text-[#161618] font-bold text-[11px] cursor-default">
                      Join Expedition
                    </div>
                  </div>
                </div>
                <div class="absolute inset-x-6 inset-y-6 border border-[#5C6AEA]/50 pointer-events-none">
                  <div class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#1A1A1C] border-2 border-[#5C6AEA] pointer-events-auto cursor-nwse-resize"></div>
                  <div class="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#1A1A1C] border-2 border-[#5C6AEA] pointer-events-auto cursor-nwse-resize"></div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* 3.3 RIGHT INSPECTOR PANEL */}
        <aside class="inspector bg-[#202022] border-l border-[#343438] flex flex-col min-h-0 overflow-hidden">
          <div class="border-b border-[#343438] flex flex-col min-h-0 bg-[#202022]">
            <header class="h-8 border-b border-[#343438] px-3.5 flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-[11px] font-medium text-[#D4D4D8]">
                <i data-lucide="sliders" class="w-3.5 h-3.5 text-[#5C6AEA]"></i>
                <span>Vector properties</span>
              </div>
            </header>
            <div class="p-3.5 flex flex-col gap-3.5">
              <div class="grid grid-cols-4 gap-2">
                <div class="flex flex-col gap-0.5">
                  <label class="text-[10px] uppercase tracking-wider text-[#A1A1AA]">X</label>
                  <input class="text-[12px] h-[22px] px-1 rounded-[2px] bg-white/5 border border-white/10 border-b-white/40 focus:border-b-[#5C6AEA] text-center text-[#D4D4D8] outline-none transition-all duration-100 tabular-nums" value="128.5 px" readonly />
                </div>
                <div class="flex flex-col gap-0.5">
                  <label class="text-[10px] uppercase tracking-wider text-[#A1A1AA]">Y</label>
                  <input class="text-[12px] h-[22px] px-1 rounded-[2px] bg-white/5 border border-white/10 border-b-white/40 focus:border-b-[#5C6AEA] text-center text-[#D4D4D8] outline-none transition-all duration-100 tabular-nums" value="64.0 px" readonly />
                </div>
                <div class="flex flex-col gap-0.5">
                  <label class="text-[10px] uppercase tracking-wider text-[#A1A1AA]">W</label>
                  <input class="text-[12px] h-[22px] px-1 rounded-[2px] bg-white/5 border border-white/10 border-b-white/40 focus:border-b-[#5C6AEA] text-center text-[#D4D4D8] outline-none transition-all duration-100 tabular-nums" value="680.0 px" readonly />
                </div>
                <div class="flex flex-col gap-0.5">
                  <label class="text-[10px] uppercase tracking-wider text-[#A1A1AA]">H</label>
                  <input class="text-[12px] h-[22px] px-1 rounded-[2px] bg-white/5 border border-white/10 border-b-white/40 focus:border-b-[#5C6AEA] text-center text-[#D4D4D8] outline-none transition-all duration-100 tabular-nums" value="425.0 px" readonly />
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Attached Tabs - Standard Precise Design */}
            <div class="flex bg-[#161618] h-[32px] select-none">
              <button 
                onClick={() => setActiveTab("layers")}
                class={`px-5 flex items-center justify-center text-[10px] font-bold border-r border-r-[#343438] cursor-default ${activeTab() === "layers" ? "bg-[#202022] text-[#D4D4D8] border-t-[2px] border-t-[#5C6AEA] relative z-10" : "bg-transparent text-[#71717A] hover:text-[#D4D4D8] hover:bg-[#1A1A1C] border-t-[2px] border-t-transparent border-b border-b-[#343438]"}`}
              >
                LAYERS
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                class={`px-5 flex items-center justify-center text-[10px] font-bold border-r border-r-[#343438] cursor-default ${activeTab() === "history" ? "bg-[#202022] text-[#D4D4D8] border-t-[2px] border-t-[#5C6AEA] relative z-10" : "bg-transparent text-[#71717A] hover:text-[#D4D4D8] hover:bg-[#1A1A1C] border-t-[2px] border-t-transparent border-b border-b-[#343438]"}`}
              >
                HISTORY
              </button>
              <div class="flex-1 border-b border-[#343438]"></div>
            </div>

            <div class={`flex-1 overflow-y-auto min-h-0 flex flex-col ${activeTab() === "layers" ? "" : "hidden"}`}>
              <section class="flex flex-col flex-1">
                <header class="h-7 border-b border-[#343438] px-3.5 flex items-center justify-between bg-[#1A1A1C]">
                  <span class="text-[10px] font-medium text-[#A1A1AA]">Layers stack</span>
                </header>
                <div class="flex flex-col">
                  {/* Active Vector Layer Row */}
                  <div class="h-[28px] border-b border-[#343438] flex items-center justify-between px-2 bg-[#5C6AEA]/10 border-l-[2px] border-l-[#5C6AEA] text-white cursor-default">
                    <div class="flex items-center gap-2">
                      <button class="text-[#D4D4D8] hover:text-white"><i data-lucide="eye" class="w-3.5 h-3.5"></i></button>
                      <div class="w-4 h-4 rounded-[1px] border border-[#5C6AEA]/30 flex items-center justify-center bg-[#5C6AEA]/20">
                        <i data-lucide="pen-tool" class="w-2.5 h-2.5 text-[#5C6AEA]"></i>
                      </div>
                      <span class="text-[11px] font-medium text-[#D4D4D8]">Vector Line Shape</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div class={`flex-1 overflow-y-auto min-h-0 flex flex-col ${activeTab() === "history" ? "" : "hidden"}`}>
              <section class="p-3.5 flex flex-col gap-3">
                <span class="text-[10px] text-[#A1A1AA]">History logs will appear here.</span>
              </section>
            </div>
          </div>
        </aside>
      </div>

      {/* 4. BOTTOM STATUS BAR */}
      <footer class="statusbar flex items-center justify-between px-3 bg-[#1A1A1C] border-t border-[#343438] h-[24px] text-[10px] text-[#71717A] select-none">
        <div class="flex items-center gap-3">
          <span class="text-[#D4D4D8]">680 x 425 px</span>
          <span class="opacity-30">•</span>
          <span>Zoom: <span class="text-[#5C6AEA] font-medium tabular-nums">{zoom()}%</span></span>
          <span class="opacity-30">•</span>
          <span>RAM: <span class="text-[#10B981] font-mono tabular-nums">{ramUsage()} MB</span></span>
        </div>
      </footer>
    </div>
  );
}
