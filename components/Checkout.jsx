
// ─── Checkout: cart + order form ─────────────────────────────────────────────

const { useState: useStateC, useRef: useRefC } = React;

function Accordion({ question, answer }) {
  const [open, setOpen] = useStateC(false);
  return (
    <div style={{ borderBottom:'1px solid #ede8e0' }}>
      <button onClick={() => setOpen(!open)} style={{
        width:'100%', textAlign:'left', padding:'16px 0',
        background:'none', border:'none', cursor:'pointer',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        fontFamily:"'DM Sans',sans-serif", fontSize:'14px', color:'#1A1A1A',
      }}>
        {question}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.25s', flexShrink:0 }}>
          <path d="M3 6L8 11L13 6" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding:'0 0 16px', fontFamily:"'DM Sans',sans-serif", fontSize:'13px', color:'#888', lineHeight:1.7 }}>
          {answer}
        </div>
      )}
    </div>
  );
}

function Input({ label, type='text', required, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom:'16px' }}>
      <label style={{ display:'block', fontFamily:"'DM Sans',sans-serif", fontSize:'12px', color:'#888', marginBottom:'6px', letterSpacing:'0.04em', textTransform:'uppercase' }}>
        {label}{required && <span style={{ color:'#C4A882' }}> *</span>}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:'100%', padding:'13px 16px', border:'1px solid #e0ddd8',
          borderRadius:'4px', background:'#fff',
          fontFamily:"'DM Sans',sans-serif", fontSize:'14px', color:'#1A1A1A',
          outline:'none', boxSizing:'border-box',
          transition:'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor='#C4A882'; }}
        onBlur={e => { e.target.style.borderColor='#e0ddd8'; }}
      />
    </div>
  );
}

function Checkout({ box, flowers, selectedExtras, onBack }) {
  const [delivery, setDelivery] = useStateC('own');
  const [contact, setContact] = useStateC('whatsapp');
  const [form, setForm] = useStateC({ name:'', phone:'', email:'', address:'', date:'' });
  const [submitted, setSubmitted] = useStateC(false);

  const flowerList = FLOWERS.filter(f => (flowers[f.id] || 0) > 0);
  const extraList = EXTRAS.filter(e => selectedExtras.has(e.id));
  const extrasTotal = extraList.reduce((s, e) => s + e.price, 0);
  const deliveryPrice = delivery === 'own' ? 500 : 0;
  const total = (box?.price || 0) + extrasTotal + deliveryPrice;

  const setField = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name || !form.phone || !form.address || !form.date) {
      alert('Пожалуйста, заполните обязательные поля');
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ minHeight:'100vh', background:'#FAFAF8', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', padding:'40px', maxWidth:'480px' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'80px', marginBottom:'24px', lineHeight:1 }}>✦</div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'40px', fontWeight:400, color:'#1A1A1A', marginBottom:'16px' }}>Заказ принят</h2>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'15px', color:'#888', lineHeight:1.7, marginBottom:'32px' }}>
            Свяжемся с вами через {contact === 'whatsapp' ? 'WhatsApp' : contact === 'telegram' ? 'Telegram' : 'звонок'} в течение 30 минут для подтверждения заказа на <strong style={{color:'#1A1A1A'}}>{total.toLocaleString('ru-RU')} ₽</strong>.
          </p>
          <button onClick={() => { window.scrollTo({top:0, behavior:'smooth'}); window.location.reload(); }} style={{
            padding:'16px 40px', background:'#1A1A1A', color:'#fff',
            border:'none', borderRadius:'100px',
            fontFamily:"'DM Sans',sans-serif", fontSize:'15px', cursor:'pointer',
          }}>Собрать новый букет</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#FAFAF8' }}>
      {/* Header */}
      <div style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(250,250,248,0.96)', backdropFilter:'blur(8px)',
        borderBottom:'1px solid #ede8e0',
        padding:'16px clamp(20px,5vw,80px)',
        display:'flex', alignItems:'center', gap:'12px',
      }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'13px', color:'#888', display:'flex', alignItems:'center', gap:'6px', padding:0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Назад
        </button>
        <div style={{ width:'1px', height:'20px', background:'#ddd' }}/>
        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'14px', color:'#555' }}>Оформление заказа</span>
      </div>

      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:'60px',
        padding:'clamp(32px,5vh,64px) clamp(20px,5vw,80px)',
        maxWidth:'1200px', margin:'0 auto',
      }}>

        {/* LEFT: Order summary */}
        <div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'32px', fontWeight:400, color:'#1A1A1A', marginBottom:'32px', marginTop:0 }}>
            Ваш заказ
          </h2>

          {/* Box */}
          <div style={{ background:'#fff', border:'1px solid #ede8e0', borderRadius:'4px', padding:'20px 24px', marginBottom:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'22px', color:'#1A1A1A' }}>Бокс {box?.size}</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'12px', color:'#999', marginTop:'2px' }}>{box?.stems} стеблей</div>
              </div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'22px', color:'#1A1A1A' }}>{box?.price?.toLocaleString('ru-RU')} ₽</div>
            </div>

            {/* Flowers list */}
            {flowerList.length > 0 && (
              <div style={{ borderTop:'1px solid #f5f2ee', marginTop:'12px', paddingTop:'12px', display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {flowerList.map(f => (
                  <span key={f.id} style={{
                    fontFamily:"'DM Sans',sans-serif", fontSize:'12px', color:'#666',
                    background:'#f5f2ee', padding:'4px 10px', borderRadius:'100px',
                  }}>{f.name} × {flowers[f.id]}</span>
                ))}
              </div>
            )}
          </div>

          {/* Extras */}
          {extraList.length > 0 && (
            <div style={{ background:'#fff', border:'1px solid #ede8e0', borderRadius:'4px', padding:'16px 24px', marginBottom:'16px' }}>
              {extraList.map(e => (
                <div key={e.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontFamily:"'DM Sans',sans-serif", fontSize:'13px', color:'#555', borderBottom:'1px solid #f5f2ee' }}>
                  <span>{e.name}</span>
                  <span>{e.price === 0 ? 'бесплатно' : `${e.price} ₽`}</span>
                </div>
              ))}
            </div>
          )}

          {/* Delivery */}
          <div style={{ background:'#fff', border:'1px solid #ede8e0', borderRadius:'4px', padding:'20px 24px', marginBottom:'24px' }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'12px', color:'#888', letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:'14px' }}>Доставка</div>
            {[
              { id:'own', label:'Наша доставка', sub:'от 500 ₽ по районам города' },
              { id:'yandex', label:'Яндекс Go', sub:'Рассчитывается при оформлении' },
            ].map(opt => (
              <label key={opt.id} style={{ display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', padding:'8px 0', borderBottom:'1px solid #f5f2ee' }}>
                <div style={{
                  width:'18px', height:'18px', borderRadius:'50%',
                  border:`2px solid ${delivery === opt.id ? '#1A1A1A' : '#ccc'}`,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  transition:'border-color 0.2s',
                }}>
                  {delivery === opt.id && <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#1A1A1A' }}/>}
                </div>
                <div onClick={() => setDelivery(opt.id)}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'14px', color:'#1A1A1A' }}>{opt.label}</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'12px', color:'#999' }}>{opt.sub}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Total */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'20px 0', borderTop:'2px solid #1A1A1A' }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'14px', color:'#888' }}>Итого</span>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'40px', fontWeight:400, color:'#1A1A1A' }}>{total.toLocaleString('ru-RU')} ₽</span>
          </div>

          {/* FAQ */}
          <div style={{ marginTop:'32px' }}>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'22px', fontWeight:400, color:'#1A1A1A', marginBottom:'8px' }}>Частые вопросы</h3>
            {[
              { q:'Когда доставят?', a:'Доставляем в день заказа при оформлении до 14:00, или выбирайте удобную дату.' },
              { q:'Могу ли я изменить заказ?', a:'Да, до момента сборки букета — свяжитесь с нами.' },
              { q:'Как долго стоят цветы?', a:'При правильном уходе — 7–14 дней. К каждому боксу прилагается инструкция.' },
              { q:'Есть ли гарантия на цветы?', a:'Если цветок завял в первые 24 часа — заменим бесплатно.' },
            ].map(faq => <Accordion key={faq.q} question={faq.q} answer={faq.a} />)}
          </div>
        </div>

        {/* RIGHT: Form */}
        <div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'32px', fontWeight:400, color:'#1A1A1A', marginBottom:'32px', marginTop:0 }}>
            Данные для доставки
          </h2>

          <Input label="ФИО" required value={form.name} onChange={setField('name')} placeholder="Иван Иванов" />
          <Input label="Телефон" type="tel" required value={form.phone} onChange={setField('phone')} placeholder="+7 (___) ___-__-__" />
          <Input label="Email" type="email" value={form.email} onChange={setField('email')} placeholder="mail@example.com" />
          <Input label="Адрес доставки" required value={form.address} onChange={setField('address')} placeholder="Улица, дом, квартира" />
          <Input label="Дата доставки" type="date" required value={form.date} onChange={setField('date')} />

          {/* Contact channel */}
          <div style={{ marginBottom:'28px' }}>
            <label style={{ display:'block', fontFamily:"'DM Sans',sans-serif", fontSize:'12px', color:'#888', marginBottom:'10px', letterSpacing:'0.04em', textTransform:'uppercase' }}>
              Способ связи <span style={{ color:'#C4A882' }}>*</span>
            </label>
            <div style={{ display:'flex', gap:'10px' }}>
              {[
                { id:'whatsapp', label:'WhatsApp' },
                { id:'telegram', label:'Telegram' },
                { id:'call', label:'Звонок' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setContact(opt.id)} style={{
                  flex:'1 1 0', padding:'12px 8px',
                  background: contact === opt.id ? '#1A1A1A' : '#fff',
                  color: contact === opt.id ? '#fff' : '#1A1A1A',
                  border:`1px solid ${contact === opt.id ? '#1A1A1A' : '#e0ddd8'}`,
                  borderRadius:'4px', cursor:'pointer',
                  fontFamily:"'DM Sans',sans-serif", fontSize:'13px',
                  transition:'all 0.2s',
                }}>{opt.label}</button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            style={{
              width:'100%', padding:'18px',
              background:'#1A1A1A', color:'#fff',
              border:'none', borderRadius:'4px',
              fontFamily:"'DM Sans',sans-serif", fontSize:'16px',
              cursor:'pointer', letterSpacing:'0.04em',
              transition:'background 0.2s',
              marginBottom:'12px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='#C4A882'; }}
            onMouseLeave={e => { e.currentTarget.style.background='#1A1A1A'; }}
          >
            Оплатить через Robokassa
          </button>

          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'11px', color:'#aaa', lineHeight:1.6, textAlign:'center', margin:0 }}>
            Нажимая «Оплатить», вы соглашаетесь с{' '}
            <a href="#" style={{ color:'#8B7355' }}>Политикой конфиденциальности</a> и{' '}
            <a href="#" style={{ color:'#8B7355' }}>Публичной офертой</a>
          </p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Checkout });
