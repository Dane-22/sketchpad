import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Compass, Triangle, Hexagon, Settings, PenTool, Ruler } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const container = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useGSAP(() => {
    // Hero Text Reveal
    const tl = gsap.timeline();
    tl.from('.hero-title', {
      y: 100,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      ease: 'power4.out',
    })
    .from('.hero-subtitle', {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.5');

    // Scroll Parallax for features
    gsap.utils.toArray<HTMLElement>('.feature-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top bottom-=100',
          toggleActions: 'play none none reverse'
        },
        y: 100,
        opacity: 0,
        duration: 0.8,
        delay: i * 0.1,
        ease: 'power3.out'
      });
    });

    // Pinning "How it works" section
    ScrollTrigger.create({
      trigger: ".how-it-works",
      start: "top top",
      end: "+=2000",
      pin: true,
      animation: gsap.to(".how-it-works-content", {
        xPercent: -66.66,
        ease: "none",
      }),
      scrub: 1,
    });

    // Marquee effect
    gsap.to('.marquee-content', {
      xPercent: -50,
      ease: "none",
      duration: 20,
      repeat: -1
    });

    // Floating engineering elements animation
    gsap.utils.toArray<HTMLElement>('.floating-element').forEach((el, i) => {
      gsap.to(el, {
        y: 'random(-30, 30)',
        x: 'random(-30, 30)',
        rotation: 'random(-45, 45)',
        duration: 'random(4, 8)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.2
      });
    });

  }, { scope: container });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!spotlightRef.current) return;
    const { clientX, clientY } = e;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    gsap.to(spotlightRef.current, {
      x: x,
      y: y,
      duration: 0.8,
      ease: 'power3.out',
      xPercent: -50,
      yPercent: -50
    });
  };

  return (
    <div ref={container} className="bg-neutral-950 text-white overflow-x-hidden min-h-screen relative">
      {/* Floating Elements layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <Compass size={120} className="floating-element absolute top-[120vh] left-[10%] text-blue-500/10" />
        <Triangle size={150} className="floating-element absolute top-[160vh] right-[15%] text-neutral-500/10" />
        <Hexagon size={180} className="floating-element absolute top-[220vh] left-[20%] text-blue-400/5" />
        <Settings size={200} className="floating-element absolute top-[280vh] right-[10%] text-neutral-600/10" />
        <PenTool size={100} className="floating-element absolute top-[350vh] left-[30%] text-blue-500/10" />
        <Ruler size={140} className="floating-element absolute top-[400vh] right-[25%] text-neutral-400/5" />
      </div>

      {/* Navbar */}
      <nav className="fixed w-full flex justify-between items-center px-8 py-6 z-50 mix-blend-difference">
        <div className="text-2xl font-bold tracking-tighter">EngPlanner.</div>
        <button 
          onClick={() => navigate('/login')}
          className="px-6 py-2 rounded-full border border-white/20 hover:bg-white hover:text-black transition-colors"
        >
          Login
        </button>
      </nav>

      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center overflow-hidden px-8 md:px-16"
        onMouseMove={handleMouseMove}
      >
        {/* Spotlight Effect */}
        <div 
          ref={spotlightRef}
          className="absolute w-[800px] h-[800px] rounded-full pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)',
            left: 0,
            top: 0
          }}
        />

        {/* Blueprint Grid Background */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', 
               backgroundSize: '3rem 3rem' 
             }} 
        />

        <div className="max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10 items-center">
          
          {/* Left Column: Copy & CTA */}
          <div className="flex flex-col items-start pt-20">
            <h1 className="text-6xl lg:text-8xl font-black mb-6 leading-tight drop-shadow-2xl hero-title text-left">
              Design <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Smarter.</span><br/>
              Plan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Faster.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-neutral-400 max-w-xl mb-10 hero-subtitle text-left">
              The ultimate web-based CAD and engineering planning platform. Built for precision, designed for speed.
            </p>
            
            <button 
              onClick={() => navigate('/login')}
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-lg text-lg hover:bg-neutral-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] mb-12 overflow-hidden"
            >
              <span className="relative z-10">START PLANNING NOW</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            </button>

            {/* Trust Markers */}
            <div className="space-y-4 hero-subtitle">
              <div className="flex items-center gap-4">
                <div className="flex text-yellow-400 text-sm">★★★★★</div>
                <span className="text-white font-bold text-sm">Trusted by 10,000+ Engineers</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex text-yellow-400 text-sm">★★★★★</div>
                <span className="text-white font-bold text-sm">Full DXF Support & Cloud Sync</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex text-yellow-400 text-sm">★★★★★</div>
                <span className="text-white font-bold text-sm">Built for Enterprise Precision</span>
              </div>
            </div>
          </div>

          {/* Right Column: Tilted Grid of "Screenshots" */}
          <div className="hidden lg:block relative h-[800px] w-full perspective-[2000px]">
            <div className="absolute inset-0 transform -rotate-y-12 rotate-x-12 -rotate-z-12 scale-110 flex gap-6">
              
              {/* Column 1 */}
              <div className="animate-scroll-up w-[300px]">
                {/* First Block */}
                <div className="flex flex-col gap-6 pb-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={`col1-a-${i}`} className="w-[300px] h-[200px] bg-neutral-900/80 backdrop-blur-md rounded-xl border border-blue-500/30 p-4 shadow-2xl flex flex-col justify-between group hover:border-blue-400 transition-colors">
                      <div className="w-full h-4 bg-neutral-800 rounded-md mb-2 flex items-center px-2 gap-1">
                         <div className="w-2 h-2 rounded-full bg-red-500" />
                         <div className="w-2 h-2 rounded-full bg-yellow-500" />
                         <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1 border border-neutral-800 rounded border-dashed opacity-50 flex items-center justify-center">
                         <svg className="w-12 h-12 text-blue-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Duplicated Block for Infinite Loop */}
                <div className="flex flex-col gap-6 pb-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={`col1-b-${i}`} className="w-[300px] h-[200px] bg-neutral-900/80 backdrop-blur-md rounded-xl border border-blue-500/30 p-4 shadow-2xl flex flex-col justify-between group hover:border-blue-400 transition-colors">
                      <div className="w-full h-4 bg-neutral-800 rounded-md mb-2 flex items-center px-2 gap-1">
                         <div className="w-2 h-2 rounded-full bg-red-500" />
                         <div className="w-2 h-2 rounded-full bg-yellow-500" />
                         <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1 border border-neutral-800 rounded border-dashed opacity-50 flex items-center justify-center">
                         <svg className="w-12 h-12 text-blue-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2 */}
              <div className="animate-scroll-down w-[300px] mt-[-300px]">
                <div className="flex flex-col gap-6 pb-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={`col2-a-${i}`} className="w-[300px] h-[250px] bg-neutral-900/80 backdrop-blur-md rounded-xl border border-indigo-500/30 p-4 shadow-2xl flex flex-col justify-between group hover:border-indigo-400 transition-colors">
                      <div className="w-full h-4 bg-neutral-800 rounded-md mb-2 flex items-center px-2 gap-1">
                         <div className="w-2 h-2 rounded-full bg-red-500" />
                         <div className="w-2 h-2 rounded-full bg-yellow-500" />
                         <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1 border border-neutral-800 rounded border-dashed opacity-50 flex items-center justify-center bg-indigo-500/5">
                         <svg className="w-16 h-16 text-indigo-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-6 pb-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={`col2-b-${i}`} className="w-[300px] h-[250px] bg-neutral-900/80 backdrop-blur-md rounded-xl border border-indigo-500/30 p-4 shadow-2xl flex flex-col justify-between group hover:border-indigo-400 transition-colors">
                      <div className="w-full h-4 bg-neutral-800 rounded-md mb-2 flex items-center px-2 gap-1">
                         <div className="w-2 h-2 rounded-full bg-red-500" />
                         <div className="w-2 h-2 rounded-full bg-yellow-500" />
                         <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1 border border-neutral-800 rounded border-dashed opacity-50 flex items-center justify-center bg-indigo-500/5">
                         <svg className="w-16 h-16 text-indigo-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3 */}
              <div className="animate-scroll-up w-[300px] mt-10">
                <div className="flex flex-col gap-6 pb-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={`col3-a-${i}`} className="w-[300px] h-[180px] bg-neutral-900/80 backdrop-blur-md rounded-xl border border-cyan-500/30 p-4 shadow-2xl flex flex-col justify-between group hover:border-cyan-400 transition-colors">
                      <div className="w-full h-4 bg-neutral-800 rounded-md mb-2 flex items-center px-2 gap-1">
                         <div className="w-2 h-2 rounded-full bg-red-500" />
                         <div className="w-2 h-2 rounded-full bg-yellow-500" />
                         <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1 border border-neutral-800 rounded border-dashed opacity-50 flex items-center justify-center bg-cyan-500/5">
                         <svg className="w-12 h-12 text-cyan-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-6 pb-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={`col3-b-${i}`} className="w-[300px] h-[180px] bg-neutral-900/80 backdrop-blur-md rounded-xl border border-cyan-500/30 p-4 shadow-2xl flex flex-col justify-between group hover:border-cyan-400 transition-colors">
                      <div className="w-full h-4 bg-neutral-800 rounded-md mb-2 flex items-center px-2 gap-1">
                         <div className="w-2 h-2 rounded-full bg-red-500" />
                         <div className="w-2 h-2 rounded-full bg-yellow-500" />
                         <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1 border border-neutral-800 rounded border-dashed opacity-50 flex items-center justify-center bg-cyan-500/5">
                         <svg className="w-12 h-12 text-cyan-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Marquee Section */}
      <section className="py-10 overflow-hidden flex whitespace-nowrap relative z-10 bg-transparent border-y border-white/5 backdrop-blur-sm -rotate-2 scale-105 my-20">
        <div className="marquee-content flex gap-10 items-center">
          {[...Array(4)].map((_, i) => (
             <div key={i} className="flex gap-10 items-center">
               <span className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neutral-600 to-neutral-800">PRECISION CAD</span>
               <span className="text-blue-500 text-3xl">✦</span>
               <span className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neutral-600 to-neutral-800">REAL-TIME COLLABORATION</span>
               <span className="text-blue-500 text-3xl">✦</span>
               <span className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neutral-600 to-neutral-800">CLOUD SYNC</span>
               <span className="text-blue-500 text-3xl">✦</span>
               <span className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neutral-600 to-neutral-800">DXF EXPORT</span>
               <span className="text-blue-500 text-3xl">✦</span>
             </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-8 max-w-7xl mx-auto relative z-10">
        <h2 className="text-5xl md:text-7xl font-black text-center mb-24 tracking-tighter">Why EngPlanner?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Web CAD', desc: 'Full DXF support with layers, blocks, and properties native to the browser.' },
            { title: 'Responsive UI', desc: 'Instant feedback and a ribbon-based UI designed for engineers.' },
            { title: 'Secure Access', desc: 'Your intellectual property and designs are protected with enterprise-grade auth.' }
          ].map((feature, i) => (
            <div key={i} className="feature-card group relative bg-neutral-900/40 backdrop-blur-md p-[1px] rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(37,99,235,0.2)]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-neutral-950/80 p-10 rounded-[23px] h-full flex flex-col items-start overflow-hidden">
                {/* Internal Card Grid */}
                <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500" 
                     style={{ 
                       backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', 
                       backgroundSize: '1rem 1rem' 
                     }} 
                />
                <h3 className="text-3xl font-bold mb-4 text-white relative z-10">{feature.title}</h3>
                <p className="text-neutral-400 leading-relaxed relative z-10 text-lg">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works (Horizontal Scroll Pin) */}
      <section className="how-it-works h-screen bg-black/90 backdrop-blur-md flex items-center overflow-hidden relative z-10 group">
        {/* Hover Glow Effect */}
        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors duration-1000 pointer-events-none z-0" />
        
        {/* Structural Grid Background */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.05] group-hover:opacity-20 transition-opacity duration-1000">
          <div className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, #3b82f6 1px, transparent 1px),
                linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
              `,
              backgroundSize: '4rem 4rem',
              maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)'
            }}
          />
        </div>

        {/* Structural Plan SVG Lines */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-10 group-hover:opacity-30 transition-opacity duration-1000 flex justify-center items-center">
          <svg width="100%" height="100%" className="absolute inset-0">
             <line x1="15%" y1="0" x2="15%" y2="100%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="10,10" />
             <line x1="85%" y1="0" x2="85%" y2="100%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="10,10" />
             <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="10,10" />
             <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="10,10" />
             <circle cx="15%" cy="25%" r="6" fill="none" stroke="#3b82f6" strokeWidth="2" />
             <circle cx="85%" cy="25%" r="6" fill="none" stroke="#3b82f6" strokeWidth="2" />
             <circle cx="15%" cy="75%" r="6" fill="none" stroke="#3b82f6" strokeWidth="2" />
             <circle cx="85%" cy="75%" r="6" fill="none" stroke="#3b82f6" strokeWidth="2" />
             
             {/* Center Crosshairs */}
             <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,12" />
             <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,12" />
             <rect x="48%" y="46%" width="4%" height="8%" fill="none" stroke="#3b82f6" strokeWidth="1" />
          </svg>
        </div>

        <div className="w-[300vw] flex h-full how-it-works-content relative z-10">
          <div className="w-screen h-full flex flex-col justify-center items-center px-10 text-center relative group/slide">
            <h2 className="text-6xl font-bold mb-6 text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">1. Upload your DXF</h2>
            <p className="text-2xl text-neutral-300 max-w-2xl bg-black/50 p-6 rounded-xl border border-blue-500/20 backdrop-blur-sm">
              Import your existing CAD files straight into the browser. No installation required.
            </p>
          </div>
          <div className="w-screen h-full flex flex-col justify-center items-center px-10 text-center relative group/slide">
            <h2 className="text-6xl font-bold mb-6 text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">2. Edit & Annotate</h2>
            <p className="text-2xl text-neutral-300 max-w-2xl bg-black/50 p-6 rounded-xl border border-blue-400/20 backdrop-blur-sm">
              Use our powerful workspace to modify layers, adjust properties, and draw new entities.
            </p>
          </div>
          <div className="w-screen h-full flex flex-col justify-center items-center px-10 text-center relative group/slide">
            <h2 className="text-6xl font-bold mb-6 text-blue-300 drop-shadow-[0_0_15px_rgba(147,197,253,0.5)]">3. Save & Share</h2>
            <p className="text-2xl text-neutral-300 max-w-2xl bg-black/50 p-6 rounded-xl border border-blue-300/20 backdrop-blur-sm">
              Export back to DXF or save your progress to the cloud securely.
            </p>
          </div>
        </div>
      </section>

      {/* CTA / Footer */}
      <section className="py-32 flex flex-col justify-center items-center relative z-10 overflow-hidden">
        {/* Floating Background Shapes */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-[20%] left-[15%] w-32 h-32 border-[3px] border-blue-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
          <div className="absolute top-[60%] right-[15%] w-24 h-24 border-[3px] border-blue-400/20 rotate-45 animate-[pulse_4s_ease-in-out_infinite]" />
          <div className="absolute bottom-[10%] left-[25%] w-16 h-16 border-[3px] border-blue-300/20 rounded-lg animate-bounce" style={{ animationDuration: '3s' }} />
        </div>

        {/* Glassmorphism Card */}
        <div className="relative z-10 bg-neutral-900/40 backdrop-blur-2xl border border-white/10 p-16 md:p-24 rounded-[3rem] shadow-2xl flex flex-col items-center max-w-4xl mx-auto w-[90%] group overflow-hidden">
          {/* Subtle gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          <h2 className="text-5xl md:text-7xl font-black mb-6 text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400 tracking-tight">Ready to start?</h2>
          
          <p className="text-xl text-neutral-400 mb-12 text-center max-w-lg">
            Join thousands of engineers building the future with EngPlanner.
          </p>

          <button 
            onClick={() => navigate('/login')}
            className="relative overflow-hidden px-10 py-5 bg-blue-600 text-white font-bold rounded-full text-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] hover:-translate-y-1 transition-all duration-300 group/btn"
          >
            <span className="relative z-10 flex items-center gap-2">
              Create an Account
              <svg className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </button>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 text-center text-neutral-600 relative z-10 bg-black">
        <p>© 2026 EngPlanner. All rights reserved.</p>
      </footer>
    </div>
  );
}
