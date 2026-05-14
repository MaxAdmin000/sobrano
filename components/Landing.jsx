
// ─── Landing: Hero + Box Selection ───────────────────────────────────────────

const { useState, useEffect, useRef } = React;

// ── Flower art SVG (abstract, decorative) ──
function FlowerArt({ size = 400 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.85 }}>
      {/* Stems */}
      <line x1="200" y1="370" x2="200" y2="180" stroke="#6b7c5a" strokeWidth="3" strokeLinecap="round"/>
      <line x1="155" y1="370" x2="155" y2="220" stroke="#6b7c5a" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="245" y1="370" x2="245" y2="210" stroke="#6b7c5a" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="115" y1="370" x2="115" y2="250" stroke="#6b7c5a" strokeWidth="2" strokeLinecap="round"/>
      <line x1="285" y1="370" x2="285" y2="240" stroke="#6b7c5a" strokeWidth="2" strokeLinecap="round"/>
      {/* Leaves */}
      <ellipse cx="175" cy="290" rx="18" ry="9" fill="#7d9468" transform="rotate(-30 175 290)"/>
      <ellipse cx="225" cy="280" rx="18" ry="9" fill="#7d9468" transform="rotate(30 225 280)"/>
      <ellipse cx="135" cy="310" rx="14" ry="7" fill="#6b7c5a" transform="rotate(-25 135 310)"/>
      {/* Main flower – rose */}
      <circle cx="200" cy="155" r="38" fill="#c06080" opacity="0.9"/>
      <circle cx="200" cy="155" r="28" fill="#d4809a" opacity="0.85"/>
      <circle cx="200" cy="155" r="16" fill="#e8a0b0" opacity="0.9"/>
      <circle cx="200" cy="155" r="8" fill="#f2c0c8"/>
      {/* Left flower – peony */}
      <circle cx="135" cy="230" r="28" fill="#e8a0b0" opacity="0.85"/>
      <circle cx="135" cy="230" r="19" fill="#f0b8c0" opacity="0.9"/>
      <circle cx="135" cy="230" r="10" fill="#fad0d8"/>
      {/* Right flower – iris */}
      <ellipse cx="270" cy="218" rx="16" ry="24" fill="#7986cb" opacity="0.85" transform="rotate(-15 270 218)"/>
      <ellipse cx="270" cy="218" rx="10" ry="15" fill="#9fa8da" transform="rotate(-15 270 218)"/>
      {/* Far left – narcissus */}
      <circle cx="98" cy="242" r="20" fill="#fff176" opacity="0.9"/>
      <circle cx="98" cy="242" r="10" fill="#ffe57f"/>
      <circle cx="98" cy="242" r="6" fill="#ffa000"/>
      {/* Far right – gerbera */}
      <circle cx="300" cy="232" r="22" fill="#ff8a65" opacity="0.85"/>
      <circle cx="300" cy="232" r="12" fill="#ffab91"/>
      <circle cx="300" cy="232" r="6" fill="#bf360c" opacity="0.7"/>
      {/* Gypsophila dots */}
      {[...Array(18)].map((_,i) => {
        const a = (i/18)*Math.PI*2; const r2 = 55 + (i%3)*12;
        return <circle key={i} cx={200+Math.cos(a)*r2} cy={155+Math.sin(a)*r2} r={4} fill="#fce4ec" opacity="0.7"/>;
      })}
      {/* Box outline */}
      <rect x="120" y="340" width="160" height="40" rx="4" fill="#c4a882" opacity="0.5"/>
      <rect x="120" y="335" width="160" height="12" rx="3" fill="#8b7355" opacity="0.4"/>
      <line x1="200" y1="335" x2="200" y2="380" stroke="#8b7355" strokeWidth="1.5" opacity="0.4"/>
    </svg>
  );
}

// ── Box card component ──
function BoxCard({ box, onSelect }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(box)}
      style={{
        position: 'relative', flex: '1 1 0', minWidth: 0,
        height: '82vh', cursor: 'pointer', overflow: 'hidden',
        background: box.gradient,
        transition: 'flex 0.4s ease',
        flex: hovered ? '1.3 1 0' : '1 1 0',
      }}
    >
      {/* Abstract flower art */}
      <div style={{ position:'absolute', inset:0, opacity: hovered ? 0.25 : 0.6, transition:'opacity 0.35s' }}>
        <FlowerArt />
      </div>

      {/* Size letter */}
      <div style={{
        position: 'absolute', bottom: hovered ? '52%' : '24px',
        left: 0, right: 0, textAlign: 'center',
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: hovered ? '160px' : '180px',
        fontWeight: 300,
        lineHeight: 1,
        color: hovered ? '#ffffff' : 'rgba(255,255,255,0.85)',
        letterSpacing: '-0.02em',
        transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        userSelect: 'none',
        textShadow: hovered ? '0 4px 40px rgba(0,0,0,0.3)' : 'none',
      }}>
        {box.size}
      </div>

      {/* Hover overlay info */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(26,26,26,0.75)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '12px',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.35s',
        padding: '40px 24px',
      }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'20px', color:'rgba(255,255,255,0.7)', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'4px' }}>
          {box.tagline}
        </div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'72px', fontWeight:300, color:'#fff', lineHeight:1 }}>
          {box.size}
        </div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'18px', color:'rgba(255,255,255,0.8)', textAlign:'center', maxWidth:'180px', lineHeight:1.5 }}>
          {box.stems} стеблей
        </div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'36px', color:'#C4A882', marginTop:'4px', fontStyle:'italic' }}>
          {box.price.toLocaleString('ru-RU')} ₽
        </div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'13px', color:'rgba(255,255,255,0.5)', textAlign:'center', maxWidth:'160px', lineHeight:1.6, marginBottom:'8px' }}>
          {box.description}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(box); }}
          style={{
            marginTop:'8px', padding:'14px 36px',
            background: '#fff', color: '#1A1A1A',
            border: 'none', borderRadius: '100px',
            fontFamily: "'DM Sans',sans-serif", fontSize:'15px', fontWeight:500,
            cursor: 'pointer', letterSpacing:'0.04em',
            transition: 'background 0.2s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='#C4A882'; e.currentTarget.style.color='#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#1A1A1A'; }}
        >
          Выбрать бокс
        </button>
      </div>

      {/* Bottom label (default) */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        padding:'20px 24px',
        opacity: hovered ? 0 : 1,
        transition: 'opacity 0.2s',
        background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)',
      }}>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'13px', color:'rgba(255,255,255,0.8)', letterSpacing:'0.06em', textTransform:'uppercase' }}>
          {box.stems} стеблей — {box.price.toLocaleString('ru-RU')} ₽
        </div>
      </div>
    </div>
  );
}

// ── Hero ──
function Hero({ onScrollToBoxes }) {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <section id="hero" style={{
      height: '100vh', minHeight: '600px',
      background: '#FAFAF8',
      display: 'flex', alignItems: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Left content */}
      <div style={{
        flex: '0 0 auto', width: '44%', paddingLeft: 'clamp(32px, 6vw, 100px)',
        zIndex: 2,
        transform: `translateY(${scrollY * 0.08}px)`,
        transition: 'transform 0.05s linear',
      }}>
        <div style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: '12px', letterSpacing: '0.3em',
          color: '#8B7355', textTransform: 'uppercase',
          marginBottom: '40px',
        }}>
          Цветочная коробочка
        </div>

        <h1 style={{
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: 'clamp(52px, 6vw, 88px)',
          fontWeight: 400, lineHeight: 1.05,
          color: '#1A1A1A', margin: '0 0 32px',
          letterSpacing: '-0.01em',
        }}>
          Собери<br />
          <em style={{ fontStyle:'italic', color:'#8B7355' }}>свой</em><br />
          букет
        </h1>

        <p style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 'clamp(15px, 1.4vw, 18px)',
          color: '#555', lineHeight: 1.7,
          maxWidth: '360px', marginBottom: '48px',
        }}>
          Выбери бокс. Наполни любыми цветами.<br />
          <strong style={{ color:'#1A1A1A', fontWeight:500 }}>Цена не изменится.</strong>
        </p>

        <button
          onClick={onScrollToBoxes}
          style={{
            padding: '18px 48px',
            background: '#1A1A1A', color: '#FAFAF8',
            border: 'none', borderRadius: '100px',
            fontFamily: "'DM Sans',sans-serif",
            fontSize: '16px', fontWeight: 400,
            cursor: 'pointer', letterSpacing: '0.06em',
            transition: 'background 0.25s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#C4A882'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1A1A1A'; }}
        >
          Выбрать бокс
        </button>
      </div>

      {/* Right: hero art */}
      <div style={{
        flex: '1 1 0', height: '100%',
        position: 'relative', overflow: 'hidden',
        transform: `translateY(${scrollY * -0.05}px)`,
      }}>
        {/* Background gradient art */}
        <div style={{
          position:'absolute', inset:0,
          background: 'linear-gradient(135deg, #e8d5c4 0%, #d4b8c0 35%, #c4c0a8 65%, #b8c4b8 100%)',
          opacity: 0.6,
        }}/>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width: 'min(520px, 90%)', height: 'min(520px, 90%)', position:'relative' }}>
            <FlowerArt size={520} />
            {/* Box label */}
            <div style={{
              position:'absolute', bottom:'10%', left:'50%', transform:'translateX(-50%)',
              fontFamily:"'Cormorant Garamond',serif",
              fontSize:'clamp(80px,12vw,160px)',
              fontWeight:300, color:'rgba(26,26,26,0.08)',
              letterSpacing:'-0.02em', whiteSpace:'nowrap',
              userSelect:'none', pointerEvents:'none',
            }}>СОБРАНО</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position:'absolute', bottom:'32px', left:'50%', transform:'translateX(-50%)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:'8px',
        cursor:'pointer', opacity:0.5,
      }} onClick={onScrollToBoxes}>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'11px', letterSpacing:'0.2em', color:'#8B7355', textTransform:'uppercase' }}>
          Боксы
        </div>
        <div style={{ animation:'bounce 2s ease-in-out infinite' }}>
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
            <path d="M8 4 L8 20 M3 15 L8 20 L13 15" stroke="#8B7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
      `}</style>
    </section>
  );
}

// ── Box Selection Section ──
function BoxSelect({ onSelect }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="boxes" ref={ref} style={{ background:'#FAFAF8' }}>
      {/* Section heading */}
      <div style={{
        padding: 'clamp(48px,6vh,80px) clamp(32px,6vw,100px) 32px',
        opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(24px)',
        transition: 'opacity 0.7s, transform 0.7s',
      }}>
        <h2 style={{
          fontFamily:"'Cormorant Garamond',serif",
          fontSize:'clamp(32px,3.5vw,52px)', fontWeight:400,
          color:'#1A1A1A', margin:0, letterSpacing:'-0.01em',
        }}>
          Выбери свой бокс
        </h2>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'15px', color:'#888', marginTop:'12px', maxWidth:'420px', lineHeight:1.6 }}>
          Фиксированная цена — любые цветы на твой выбор. Никаких доплат, никаких сюрпризов.
        </p>
      </div>

      {/* Cards row */}
      <div style={{
        display:'flex', gap:0,
        height:'82vh', minHeight:'500px',
        opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(40px)',
        transition: 'opacity 0.8s 0.15s, transform 0.8s 0.15s',
      }}>
        {BOXES.map((box, i) => (
          <BoxCard key={box.id} box={box} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

// ── Landing page (Hero + BoxSelect) ──
function Landing({ onSelectBox }) {
  const boxesRef = useRef(null);
  const scrollToBoxes = () => {
    const el = document.getElementById('boxes');
    if (el) window.scrollTo({ top: el.offsetTop - 0, behavior: 'smooth' });
  };

  return (
    <div>
      <Hero onScrollToBoxes={scrollToBoxes} />
      <BoxSelect onSelect={onSelectBox} />
    </div>
  );
}

Object.assign(window, { Landing });
