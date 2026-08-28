'use client';

import { useMemo, useState } from 'react';

type Task = { id: number; title: string; meta: string; person: string; tone: string; done: boolean };

const nav = [['⌂', 'Visão geral'], ['▣', 'Calendário'], ['✓', 'Tarefas'], ['☷', 'Listas'], ['◔', 'Orçamento']];
const members = [{ name: 'Você', initials: 'VC', color: '#e8a15a' }, { name: 'Ana', initials: 'AN', color: '#9aa6db' }, { name: 'Pedro', initials: 'PE', color: '#8ec0a7' }];
const seedTasks: Task[] = [
  { id: 1, title: 'Levar Pedro à natação', meta: 'Hoje · 17:30', person: 'Você', tone: 'orange', done: false },
  { id: 2, title: 'Comprar ração da Amora', meta: 'Hoje · Lista da casa', person: 'Ana', tone: 'lilac', done: false },
  { id: 3, title: 'Separar uniforme da escola', meta: 'Amanhã · Rotina', person: 'Pedro', tone: 'mint', done: true },
];

export default function Home() {
  const [active, setActive] = useState('Visão geral');
  const [tasks, setTasks] = useState(seedTasks);
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState('');
  const pending = useMemo(() => tasks.filter((task) => !task.done).length, [tasks]);
  const toggleTask = (id: number) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  const quickAction = (label: string) => { setNotice(`${label} pronto para começar`); window.setTimeout(() => setNotice(''), 2400); };

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">n</span><span>Ninho</span></div>
      <div className="family-switcher"><span className="family-dot">⌂</span><span><small>Família</small><strong>Casa Oliveira</strong></span><span className="chevron">⌄</span></div>
      <nav className="nav-list" aria-label="Navegação principal">{nav.map(([icon, label]) => <button key={label} className={`nav-item ${active === label ? 'selected' : ''}`} onClick={() => setActive(label)}><span className="nav-icon">{icon}</span>{label}</button>)}</nav>
      <div className="nav-label">Organizar</div>
      <button className="nav-item" onClick={() => quickAction('Nova lista')}><span className="nav-icon">＋</span>Nova lista</button>
      <button className="nav-item" onClick={() => quickAction('Novo evento')}><span className="nav-icon">＋</span>Novo evento</button>
      <div className="sidebar-bottom"><button className="nav-item"><span className="nav-icon">◉</span>Notificações <span className="badge">3</span></button><button className="nav-item"><span className="nav-icon">⚙</span>Configurações</button><div className="profile-row"><span className="avatar avatar-you">VC</span><span><strong>Vanessa Costa</strong><small>Administrador</small></span><span className="more">•••</span></div></div>
    </aside>
    <section className="content">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">n</span>Ninho</div><div className="breadcrumbs">Casa Oliveira <span>/</span> {active}</div><div className="top-actions"><button className="icon-button" aria-label="Pesquisar">⌕</button><button className="help-button">?</button><button className="invite-button" onClick={() => quickAction('Convite')}>＋ Convidar</button></div></header>
      <div className="page-wrap">
        <div className="welcome-row"><div><p className="eyebrow">QUINTA-FEIRA, 28 DE AGOSTO</p><h1>Bom dia, Vanessa <span className="wave">✦</span></h1><p className="subcopy">Tudo que a sua família precisa, em um só lugar.</p></div><div className="weather"><span>☀</span><div><strong>24°</strong><small>São Paulo, SP</small></div></div></div>
        <div className="quick-grid"><QuickCard tone="peach" icon="✦" title="Novo evento" subtitle="Adicione à agenda da família" onClick={() => quickAction('Novo evento')} /><QuickCard tone="lavender" icon="✓" title="Nova tarefa" subtitle="Divida o que precisa ser feito" onClick={() => quickAction('Nova tarefa')} /><QuickCard tone="mint" icon="◔" title="Lançar despesa" subtitle="Controle o orçamento da casa" onClick={() => quickAction('Nova despesa')} /></div>
        <div className="dashboard-grid"><div className="main-column">
          <section className="panel agenda-panel"><div className="panel-heading"><div><p className="eyebrow">AGENDA DA FAMÍLIA</p><h2>Próximos compromissos</h2></div><button className="text-button" onClick={() => setActive('Calendário')}>Ver calendário <span>→</span></button></div><div className="week-strip">{[['SEG','25'],['TER','26'],['QUA','27'],['QUI','28'],['SEX','29'],['SÁB','30'],['DOM','31']].map(([day, date], i) => <button key={day} className={`day ${i === 3 ? 'today' : ''}`}><span>{day}</span><strong>{date}</strong></button>)}</div><div className="event-list"><Event time="09:00" title="Reunião de pais · Escola Monteiro" tag="Vanessa" color="orange" /><Event time="17:30" title="Natação do Pedro" tag="Pedro" color="mint" /><Event time="19:00" title="Jantar em família" tag="Todos" color="lilac" /></div></section>
          <section className="panel tasks-panel"><div className="panel-heading"><div><p className="eyebrow">PARA HOJE</p><h2>Tarefas pendentes <span className="count-pill">{pending}</span></h2></div><button className="text-button" onClick={() => setShowAll(!showAll)}>{showAll ? 'Mostrar menos' : 'Ver todas'} <span>→</span></button></div><div className="task-list">{tasks.slice(0, showAll ? tasks.length : 3).map((task) => <div className={`task-row ${task.done ? 'completed' : ''}`} key={task.id}><button className="check" onClick={() => toggleTask(task.id)} aria-label={`Concluir ${task.title}`}>{task.done ? '✓' : ''}</button><div className="task-copy"><strong>{task.title}</strong><small>{task.meta}</small></div><span className={`assignee ${task.tone}`}>{task.person === 'Você' ? 'VC' : task.person.slice(0, 2).toUpperCase()}</span></div>)}</div></section>
        </div><aside className="right-column">
          <section className="panel family-panel"><div className="panel-heading"><div><p className="eyebrow">NA FAMÍLIA</p><h2>Quem está por aqui</h2></div><button className="more-button">•••</button></div><div className="members">{members.map((member) => <div className="member" key={member.name}><span className="member-avatar" style={{ background: member.color }}>{member.initials}</span><span><strong>{member.name}</strong><small>{member.name === 'Pedro' ? 'Na escola' : 'Disponível'}</small></span><i className={`status ${member.name === 'Pedro' ? 'away' : ''}`} /></div>)}</div><button className="outline-button" onClick={() => quickAction('Novo convite')}>＋ Adicionar membro</button></section>
          <section className="panel list-panel"><div className="panel-heading"><div><p className="eyebrow">LISTA COMPARTILHADA</p><h2>Compras da semana</h2></div><span className="list-progress">4/8</span></div><div className="progress-track"><span /></div><div className="shopping-list"><label><input type="checkbox" defaultChecked /> <span>Leite</span></label><label><input type="checkbox" defaultChecked /> <span>Bananas</span></label><label><input type="checkbox" /> <span>Café em pó</span></label><label><input type="checkbox" /> <span>Ração da Amora</span></label></div><button className="text-button full-button" onClick={() => setActive('Listas')}>Abrir lista <span>→</span></button></section>
          <section className="assistant-card"><div className="assistant-glow">✦</div><div><p className="eyebrow">NINHO AJUDA</p><h2>Quer organizar a semana?</h2><p>Posso encontrar espaços na agenda ou dividir as tarefas da casa.</p></div><button onClick={() => quickAction('Assistente')}>Conversar com o Ninho <span>→</span></button></section>
        </aside></div>
      </div>
    </section>{notice && <div className="toast">✦ &nbsp; {notice}</div>}
  </main>;
}

function QuickCard({ tone, icon, title, subtitle, onClick }: { tone: string; icon: string; title: string; subtitle: string; onClick: () => void }) { return <button className={`quick-card ${tone}`} onClick={onClick}><span className="quick-icon">{icon}</span><span><strong>{title}</strong><small>{subtitle}</small></span><span className="arrow">↗</span></button>; }
function Event({ time, title, tag, color }: { time: string; title: string; tag: string; color: string }) { return <div className="event-row"><span className="event-time">{time}</span><span className={`event-line ${color}`} /><div className="event-title"><strong>{title}</strong><small><span className={`tag-dot ${color}`} /> {tag}</small></div><button className="event-more">•••</button></div>; }
