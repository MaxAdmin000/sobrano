
// ─── FlowerPicker: Step 3-5 ───────────────────────────────────────────────────

const { useState, useEffect, useRef, useCallback } = React;

// ── Flower card ──
function FlowerCard({ flower, count, onAdd, onRemove, disabled }) {
  const [pulse, setPulse] = useState(false);
  const handleAdd = () => {
    if (disabled) return;
    onAdd(flower.id);
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
  };
  return (
    <div style={{
      background: '#fff', borderRadius:'4px',
      overflow:'hidden', border:'1px solid #eee',
      opacity: (disabled && count === 0) ? 0.38 : 1,
      pointerEvents: (disabled && count === 0) ? 'none' : 'auto',
      transition: 'opacity 0.3s, transform 0.25s, box-shadow 0.25s',
      transform: pulse ? 'scale(1.04)' : 'scale(1)',
      boxShadow: count > 0 ? '0 4px 20px rgba(196,168,130,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Flower image */}
      <div style={{ position:'relative', paddingBottom:'85%', background: flower.gradient }}>
        {/* Petal art */}
        <div style={{
          position:'absolute', inset:0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {[0,60,120,180,240,300].map((deg,i) => (
              <ellipse key={i}
                cx={40 + Math.cos(deg*Math.PI/180)*16}
                cy={40 + Math.sin(deg*Math.PI/180)*16}
                rx="11" ry="16"
                fill="rgba(255,255,255,0.22)"
                transform={`rotate(${deg} ${40 + Math.cos(deg*Math.PI/180)*16} ${40 + Math.sin(deg*Math.PI/180)*16})`}
              />
            ))}
            <circle cx="40" cy="40" r="10" fill="rgba(255,255,255,0.35)"/>
          </svg>
        </div>

        {/* Count badge */}
        {count > 0 && (
          <div style={{
            position:'absolute', top:'8px', right:'8px',
            width:'26px', height:'26px', borderRadius:'50%',
            background:'#1A1A1A', color:'#fff',
            fontFamily:"'DM Sans',sans-serif", fontSize:'12px', fontWeight:500,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{count}</div>
        )}
      </div>

      {/* Name + controls */}
      <div style={{ padding:'10px 12px 12px' }}>
        <div style={{
          fontFamily:"'DM Sans',sans-serif", fontSize:'13px',
          color:'#1A1A1A', marginBottom:'10px', lineHeight:1.3,
          minHeight:'32px',
        }}>{flower.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button
            onClick={() => onRemove(flower.id)}
            disabled={count === 0}
            style={{
              width:'30px', height:'30px', borderRadius:'50%',
              border:'1px solid #ddd', background:'#fff',
              fontFamily:"'DM Sans',sans-serif", fontSize:'16px',
              color: count === 0 ? '#ccc' : '#1A1A1A',
              cursor: count === 0 ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'border-color 0.2s',
              lineHeight:1, padding:0,
            }}
          >−</button>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'15px', fontWeight:500, color:'#1A1A1A', minWidth:'20px', textAlign:'center' }}>
            {count}
          </span>
          <button
            onClick={handleAdd}
            disabled={disabled}
            style={{
              width:'30px', height:'30px', borderRadius:'50%',
              border:'none', background: disabled ? '#eee' : '#1A1A1A',
              color: disabled ? '#999' : '#fff',
              fontFamily:"'DM Sans',sans-serif", fontSize:'16px',
              cursor: disabled ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'background 0.2s',
              lineHeight:1, padding:0,
            }}
          >+</button>
        </div>
      </div>
    </div>
  );
}

// ── Florist set card ──
function FloristSetCard({ set, box, onApply }) {
  const [hovered, setHovered] = useState(false);
  const stems = Object.values(set.flowers).reduce((a,b)=>a+b,0);
  const fits = stems <= (box ? box.stems : 999);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:'#fff', borderRadius:'4px', overflow:'hidden',
        border:`1px solid ${hovered ? '#C4A882' : '#eee'}`,
        transition:'border-color 0.25s, box-shadow 0.25s',
        boxShadow: hovered ? '0 6px 24px rgba(196,168,130,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
        cursor:'pointer',
      }}
    >
      <div style={{ height:'140px', background: set.gradient, position:'relative' }}>
        <div style={{
          position:'absolute', inset:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(255,255,255,0.08)',
        }}>
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
            {[0,45,90,135,180,225,270,315].map((deg,i) => (
              <ellipse key={i}
                cx={50 + Math.cos(deg*Math.PI/180)*18}
                cy={50 + Math.sin(deg*Math.PI/180)*18}
                rx="10" ry="18"
                fill="rgba(255,255,255,0.2)"
                transform={`rotate(${deg} ${50+Math.cos(deg*Math.PI/180)*18} ${50+Math.sin(deg*Math.PI/180)*18})`}
              />
            ))}
            <circle cx="50" cy="50" r="14" fill="rgba(255,255,255,0.3)"/>
          </svg>
        </div>
      </div>
      <div style={{ padding:'16px' }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'20px', color:'#1A1A1A', marginBottom:'4px' }}>{set.name}</div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'12px', color:'#888', marginBottom:'12px', lineHeight:1.5 }}>{set.description} · {stems} стеблей</div>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'11px', color:'#aaa', marginBottom:'14px', lineHeight:1.6 }}>
          {Object.entries(set.flowers).map(([id, cnt]) => {
            const f = FLOWERS.find(x => x.id === id);
            return f ? `${f.name} ${cnt} шт` : '';
          }).filter(Boolean).join(' · ')}
        </div>
        <button
          onClick={() => onApply(set)}
          disabled={!fits}
          style={{
            width:'100%', padding:'10px',
            background: fits ? '#1A1A1A' : '#eee',
            color: fits ? '#fff' : '#aaa',
            border:'none', borderRadius:'100px',
            fontFamily:"'DM Sans',sans-serif", fontSize:'13px',
            cursor: fits ? 'pointer' : 'not-allowed',
            transition:'background 0.2s',
          }}
        >{fits ? 'Добавить подборку' : `Нужен бокс от ${stems} стеблей`}</button>
      </div>
    </div>
  );
}

// ── Animated counter ──
function AnimatedCount({ value, total }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  const done = value >= total;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'16px', flex:'1 1 auto' }}>
      <div style={{
        fontFamily:"'DM Sans',sans-serif", fontSize:'14px',
        color: done ? '#4CAF50' : '#1A1A1A',
        whiteSpace:'nowrap', transition:'color 0.3s',
        minWidth:'180px',
      }}>
        {done
          ? <span>✓ Бокс заполнен — <strong>{value}</strong> из {total}</span>
          : <span>Добавлено <strong>{value}</strong> из {total} стеблей</span>
        }
      </div>
      <div style={{
        flex:'1 1 auto', height:'4px',
        background:'#f0ede8', borderRadius:'2px',
        overflow:'hidden', minWidth:'80px',
      }}>
        <div style={{
          height:'100%', borderRadius:'2px',
          width:`${pct}%`,
          background: done ? '#4CAF50' : '#C4A882',
          transition:'width 0.35s cubic-bezier(0.4,0,0.2,1), background 0.3s',
        }}/>
      </div>
    </div>
  );
}

// ── Main FlowerPicker ──
function FlowerPicker({ box, flowers, onFlowerChange, onNext, onBack }) {
  const totalSelected = Object.values(flowers).reduce((a,b)=>a+b,0);
  const limit = box ? box.stems : 0;
  const full = totalSelected >= limit;

  const handleAdd = (id) => {
    if (totalSelected >= limit) return;
    onFlowerChange(id, (flowers[id] || 0) + 1);
  };
  const handleRemove = (id) => {
    const cur = flowers[id] || 0;
    if (cur > 0) onFlowerChange(id, cur - 1);
  };
  const handleApplySet = (set) => {
    const newFlowers = {};
    Object.entries(set.flowers).forEach(([id, cnt]) => { newFlowers[id] = cnt; });
    // Fill all, then call parent
    Object.keys(flowers).forEach(id => { if (!newFlowers[id]) newFlowers[id] = 0; });
    Object.entries(newFlowers).forEach(([id, cnt]) => onFlowerChange(id, cnt));
  };

  return (
    <div style={{ minHeight:'100vh', background:'#FAFAF8', paddingBottom:'120px' }}>

      {/* Sticky header */}
      <div style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(250,250,248,0.96)',
        backdropFilter:'blur(8px)',
        borderBottom:'1px solid #ede8e0',
        padding:'16px clamp(20px,5vw,80px)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
          <button onClick={onBack} style={{
            background:'none', border:'none', cursor:'pointer',
            fontFamily:"'DM Sans',sans-serif", fontSize:'13px',
            color:'#888', display:'flex', alignItems:'center', gap:'6px',
            padding:0, whiteSpace:'nowrap',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Бокс {box?.size}
          </button>
          <div style={{ width:'1px', height:'20px', background:'#ddd', flexShrink:0 }}/>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'14px', color:'#555', whiteSpace:'nowrap' }}>
            Выбери цветы
          </div>
          <AnimatedCount value={totalSelected} total={limit} />
          <button
            onClick={onNext}
            disabled={totalSelected === 0}
            style={{
              padding:'10px 28px',
              background: totalSelected > 0 ? '#1A1A1A' : '#e0ddd8',
              color: totalSelected > 0 ? '#fff' : '#aaa',
              border:'none', borderRadius:'100px',
              fontFamily:"'DM Sans',sans-serif", fontSize:'13px',
              cursor: totalSelected > 0 ? 'pointer' : 'not-allowed',
              whiteSpace:'nowrap', transition:'background 0.2s',
              flexShrink:0,
            }}
          >
            {full ? 'Далее →' : 'Пропустить →'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:'40px clamp(20px,5vw,80px) 0' }}>
        {/* Status message when full */}
        {full && (
          <div style={{
            background:'#f0faf0', border:'1px solid #c8e6c9',
            borderRadius:'4px', padding:'16px 20px', marginBottom:'32px',
            fontFamily:"'DM Sans',sans-serif", fontSize:'14px', color:'#388e3c',
            display:'flex', alignItems:'center', gap:'10px',
          }}>
            <span>✓</span>
            <span>Бокс заполнен! Нажми «Далее» чтобы выбрать дополнения, или измени состав.</span>
          </div>
        )}

        {/* Flowers grid */}
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'28px', fontWeight:400, color:'#1A1A1A', marginBottom:'24px', marginTop:0 }}>
          Цветы
        </h2>
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',
          gap:'16px', marginBottom:'64px',
        }}>
          {FLOWERS.map(flower => (
            <FlowerCard
              key={flower.id}
              flower={flower}
              count={flowers[flower.id] || 0}
              onAdd={handleAdd}
              onRemove={handleRemove}
              disabled={full && (flowers[flower.id] || 0) === 0}
            />
          ))}
        </div>

        {/* Florist recommendations */}
        <div style={{ borderTop:'1px solid #ede8e0', paddingTop:'48px' }}>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'28px', fontWeight:400, color:'#1A1A1A', marginBottom:'6px', marginTop:0 }}>
            Не знаете что выбрать?
          </h2>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'14px', color:'#888', marginBottom:'28px', marginTop:0 }}>
            Флорист уже собрал — просто добавь подборку одним нажатием
          </p>
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',
            gap:'20px',
          }}>
            {FLORIST_SETS.map(set => (
              <FloristSetCard key={set.id} set={set} box={box} onApply={handleApplySet} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FlowerPicker });
