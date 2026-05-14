
// ─── Extras: add-ons selection ────────────────────────────────────────────────

const { useState: useStateE } = React;

function ExtraCard({ extra, selected, onToggle }) {
  return (
    <div
      onClick={() => onToggle(extra.id)}
      style={{
        background:'#fff', borderRadius:'4px', overflow:'hidden',
        border:`1.5px solid ${selected ? '#1A1A1A' : '#eee'}`,
        cursor:'pointer', transition:'border-color 0.2s, box-shadow 0.2s',
        boxShadow: selected ? '0 4px 20px rgba(26,26,26,0.12)' : '0 1px 4px rgba(0,0,0,0.05)',
        position:'relative',
      }}
    >
      {/* Image area */}
      <div style={{ height:'180px', background: extra.gradient, position:'relative' }}>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            {extra.id === 'vase' && <>
              <ellipse cx="36" cy="20" rx="18" ry="8" fill="rgba(255,255,255,0.3)"/>
              <path d="M18 20 Q14 50 22 60 L50 60 Q58 50 54 20Z" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
              <ellipse cx="36" cy="60" rx="14" ry="4" fill="rgba(255,255,255,0.2)"/>
            </>}
            {extra.id === 'greens' && <>
              {[...Array(5)].map((_,i) => {
                const x = 20 + i * 8; const h = 30 + (i%2)*12;
                return <ellipse key={i} cx={x} cy={50-h/2} rx="5" ry={h/2} fill="rgba(255,255,255,0.3)" transform={`rotate(${-20+i*10} ${x} ${50-h/2})`}/>;
              })}
            </>}
            {extra.id === 'feed' && <>
              <rect x="24" y="20" width="24" height="32" rx="4" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
              <rect x="29" y="14" width="14" height="8" rx="3" fill="rgba(255,255,255,0.3)"/>
              <line x1="30" y1="32" x2="42" y2="32" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
              <line x1="30" y1="38" x2="42" y2="38" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
            </>}
            {extra.id === 'ribbon' && <>
              <path d="M36 36 Q20 20 24 12 Q28 4 36 20" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
              <path d="M36 36 Q52 20 48 12 Q44 4 36 20" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
              <path d="M36 36 L28 56" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M36 36 L44 56" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="36" cy="36" r="5" fill="rgba(255,255,255,0.4)"/>
            </>}
            {extra.id === 'postcard' && <>
              <rect x="14" y="22" width="44" height="30" rx="3" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
              <path d="M14 22 L36 38 L58 22" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
              <line x1="22" y1="42" x2="50" y2="42" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <line x1="22" y1="47" x2="40" y2="47" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
            </>}
          </svg>
        </div>
        {selected && (
          <div style={{
            position:'absolute', top:'10px', right:'10px',
            width:'24px', height:'24px', borderRadius:'50%',
            background:'#1A1A1A', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      <div style={{ padding:'16px 18px 20px' }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'20px', color:'#1A1A1A', marginBottom:'4px' }}>{extra.name}</div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'12px', color:'#999', marginBottom:'10px' }}>{extra.description}</div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'16px', fontWeight:500, color: extra.price === 0 ? '#8B7355' : '#1A1A1A' }}>
          {extra.price === 0 ? 'Бесплатно' : `+ ${extra.price} ₽`}
        </div>
      </div>
    </div>
  );
}

function Extras({ selectedExtras, onToggle, onNext, onBack }) {
  return (
    <div style={{ minHeight:'100vh', background:'#FAFAF8' }}>
      {/* Header */}
      <div style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(250,250,248,0.96)',
        backdropFilter:'blur(8px)',
        borderBottom:'1px solid #ede8e0',
        padding:'16px clamp(20px,5vw,80px)',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'13px', color:'#888', display:'flex', alignItems:'center', gap:'6px', padding:0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Назад
          </button>
          <div style={{ width:'1px', height:'20px', background:'#ddd' }}/>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'14px', color:'#555' }}>Дополнения</span>
        </div>
        <button onClick={onNext} style={{
          padding:'10px 28px', background:'#1A1A1A', color:'#fff',
          border:'none', borderRadius:'100px',
          fontFamily:"'DM Sans',sans-serif", fontSize:'13px', cursor:'pointer',
        }}>Перейти к оформлению →</button>
      </div>

      <div style={{ padding:'clamp(32px,5vh,64px) clamp(20px,5vw,80px)' }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(32px,3.5vw,52px)', fontWeight:400, color:'#1A1A1A', marginBottom:'6px', marginTop:0 }}>
          Завершить букет?
        </h2>
        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'18px', fontStyle:'italic', color:'#8B7355', marginBottom:'40px', marginTop:0 }}>
          Необязательно, но красиво
        </p>

        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',
          gap:'20px',
        }}>
          {EXTRAS.map(extra => (
            <ExtraCard
              key={extra.id}
              extra={extra}
              selected={selectedExtras.has(extra.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Extras });
