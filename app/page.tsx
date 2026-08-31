"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import {
  acceptFamilyInvitation,
  createBirthday,
  createCategory,
  createDetailedTransaction,
  createEvent,
  createFamily,
  createFamilyInvite,
  createMeal,
  createMessage,
  createRecurring,
  createRoutine,
  createShoppingItem,
  createShoppingList,
  createTask,
  createTransaction,
  deleteBirthday,
  deleteDocument,
  deleteEvent,
  deleteMeal,
  deleteMessage,
  deleteRoutine,
  deleteShoppingItem,
  deleteShoppingList,
  deleteTask,
  deleteTransaction,
  getDocumentUrl,
  loadFamilies,
  loadBirthdays,
  loadBudgets,
  loadCategories,
  loadDocuments,
  loadEvents,
  loadLists,
  loadMeals,
  loadMembers,
  loadMessages,
  loadNotifications,
  loadRecurring,
  loadRoutines,
  loadTasks,
  loadTransactions,
  markNotificationRead,
  removeFamilyMember,
  setShoppingItemChecked,
  setTaskCompleted,
  updateFamilyMemberRole,
  updateTransaction,
  uploadDocument,
  uploadFinanceReceipt,
  upsertBudget,
  type AppBirthday,
  type AppBudget,
  type AppCategory,
  type AppDocument,
  type AppEvent,
  type AppFamily,
  type AppList,
  type AppMeal,
  type AppMember,
  type AppMessage,
  type AppNotification,
  type AppRecurring,
  type AppRoutine,
  type AppTask,
  type AppTransaction,
} from "./lib/family-data";

type View =
  | "Visão geral"
  | "Calendário"
  | "Tarefas"
  | "Listas"
  | "Orçamento"
  | "Refeições"
  | "Documentos"
  | "Mensagens"
  | "Localização"
  | "Rotinas"
  | "Aniversários"
  | "Família"
  | "Notificações"
  | "Assistente"
  | "Configurações";

async function sendEmailNotification(
  title: string,
  body: string,
  idempotencyKey?: string,
) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  await fetch("/api/email/notify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body, idempotencyKey }),
  }).catch(() => undefined);
}
const nav: [string, View][] = [
  ["⌂", "Visão geral"],
  ["▣", "Calendário"],
  ["✓", "Tarefas"],
  ["☷", "Listas"],
  ["◔", "Orçamento"],
  ["◒", "Refeições"],
  ["▤", "Documentos"],
  ["✉", "Mensagens"],
  ["⌖", "Localização"],
];
const moreNav: [string, View][] = [
  ["♧", "Rotinas"],
  ["★", "Aniversários"],
];

const viewRoutes: Record<View, string> = {
  "Visão geral": "/",
  Calendário: "/calendario",
  Tarefas: "/tarefas",
  Listas: "/listas",
  Orçamento: "/orcamento",
  Refeições: "/refeicoes",
  Documentos: "/documentos",
  Mensagens: "/mensagens",
  Localização: "/localizacao",
  Rotinas: "/rotinas",
  Aniversários: "/aniversarios",
  Família: "/familia",
  Notificações: "/notificacoes",
  Assistente: "/assistente",
  Configurações: "/configuracoes",
};

function viewFromPathname(pathname: string): View {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return (
    (Object.entries(viewRoutes).find(([, route]) => route === normalized)?.[0] as View) ??
    "Visão geral"
  );
}

function memberRoleLabel(role: string) {
  return role === "owner"
    ? "Proprietário"
    : role === "admin"
      ? "Administrador"
      : role === "adult"
        ? "Adulto"
        : role === "teen"
          ? "Adolescente"
          : role === "child"
            ? "Criança"
            : role === "caregiver"
              ? "Cuidador"
              : "Convidado";
}

function formatDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

export default function Home() {
  return <WebAuthGate />;
}

function WebAuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  if (loading)
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <span className="brand-mark">n</span>
          <p>Carregando seu Ninho…</p>
        </div>
      </div>
    );
  return session ? (
    <HomeContent session={session} onSignOut={() => supabase.auth.signOut()} />
  ) : (
    <AuthScreen />
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    if (!email || !password) return setMessage("Informe e-mail e senha.");
    setBusy(true);
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup")
      setMessage("Conta criada. Confirme seu e-mail para continuar.");
  }
  async function googleLogin() {
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setMessage(error.message);
  }
  async function recover() {
    if (!email) return setMessage("Informe seu e-mail para receber o link.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setMessage(
      error?.message ?? "Enviamos um link de recuperação para seu e-mail.",
    );
  }
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">n</span>
          <strong>Ninho</strong>
        </div>
        <p className="eyebrow">ORGANIZAÇÃO FAMILIAR</p>
        <h1>
          {mode === "signin"
            ? "Que bom ter você de volta."
            : "Crie seu espaço familiar."}
        </h1>
        <p className="auth-copy">
          Agenda, tarefas e decisões da casa em um só lugar — com seus dados
          protegidos.
        </p>
        <button className="social-button" onClick={googleLogin}>
          Continuar com Google
        </button>
        <div className="auth-divider">
          <span>ou continue com e-mail</span>
        </div>
        <label className="auth-label">
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
          />
        </label>
        <label className="auth-label">
          Senha
          <input
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
          />
        </label>
        {message && <p className="auth-message">{message}</p>}
        <button
          className="dark-button auth-submit"
          disabled={busy}
          onClick={submit}
        >
          {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
        </button>
        {mode === "signin" && (
          <button className="auth-link" onClick={recover}>
            Esqueci minha senha
          </button>
        )}
        <p className="auth-switch">
          {mode === "signin" ? "Ainda não tem uma conta?" : "Já tem uma conta?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMessage("");
            }}
          >
            {mode === "signin" ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </section>
    </main>
  );
}

function FamilySetup({
  email,
  onCreated,
}: {
  email: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    if (!name.trim()) return setMessage("Informe um nome para a família.");
    setBusy(true);
    try {
      await createFamily(name);
      onCreated();
    } catch (error: any) {
      setMessage(error?.message ?? "Não foi possível criar a família.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <section className="auth-card setup-card">
        <div className="auth-brand">
          <span className="brand-mark">n</span>
          <strong>Ninho</strong>
        </div>
        <p className="eyebrow">PRIMEIRO ACESSO</p>
        <h1>Crie o espaço da sua família.</h1>
        <p className="auth-copy">
          Você está conectado como <strong>{email}</strong>. Dê um nome à
          família para começar.
        </p>
        <label className="auth-label">
          Nome da família
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Família Silva"
          />
        </label>
        {message && <p className="auth-message">{message}</p>}
        <button
          className="dark-button auth-submit"
          disabled={busy}
          onClick={submit}
        >
          {busy ? "Criando…" : "Criar família"}
        </button>
      </section>
    </main>
  );
}

function NewFamilyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (family: AppFamily) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    if (!name.trim()) return setMessage("Informe um nome para o grupo.");
    setBusy(true);
    try {
      const id = await createFamily(name);
      await onCreated({ id, name: name.trim() });
    } catch (error: any) {
      setMessage(error?.message ?? "Não foi possível criar o grupo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="finance-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="preview-header"><div><p className="eyebrow">NOVO GRUPO</p><h2>Adicionar família</h2></div><button className="more-button" onClick={onClose}>×</button></div>
        <label className="auth-label">Nome do grupo<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Pessoal" /></label>
        {message && <p className="auth-message">{message}</p>}
        <div className="modal-actions"><button className="outline-button" onClick={onClose}>Cancelar</button><button className="dark-button" disabled={busy} onClick={submit}>{busy ? "Criando…" : "Criar grupo"}</button></div>
      </section>
    </div>
  );
}

type ConfirmRequest = { message: string; action: () => Promise<void> | void };
type DataProps = {
  session: Session;
  familyId: string;
  familyName: string;
  userName: string;
  tasks: AppTask[];
  lists: AppList[];
  events: AppEvent[];
  transactions: AppTransaction[];
  categories: AppCategory[];
  recurring: AppRecurring[];
  budgets: AppBudget[];
  messages: AppMessage[];
  members: AppMember[];
  documents: AppDocument[];
  meals: AppMeal[];
  routines: AppRoutine[];
  birthdays: AppBirthday[];
  notifications: AppNotification[];
  refresh: () => Promise<void>;
  flash: (text: string) => void;
  setActive: (view: View) => void;
  confirm: (message: string, action: () => Promise<void> | void) => void;
  enableBrowserNotifications: () => Promise<void>;
};

function HomeContent({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  const [active, setActiveState] = useState<View>(() =>
    typeof window === "undefined"
      ? "Visão geral"
      : viewFromPathname(window.location.pathname),
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState("Minha família");
  const [families, setFamilies] = useState<AppFamily[]>([]);
  const [familyMenuOpen, setFamilyMenuOpen] = useState(false);
  const [newFamilyOpen, setNewFamilyOpen] = useState(false);
  const [userName, setUserName] = useState(() =>
    String(
      session.user.user_metadata?.full_name ??
        session.user.user_metadata?.name ??
        session.user.email?.split("@")[0] ??
        "você",
    ),
  );
  const [tasks, setTasks] = useState<AppTask[]>([]);
  const [lists, setLists] = useState<AppList[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [transactions, setTransactions] = useState<AppTransaction[]>([]);
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [recurring, setRecurring] = useState<AppRecurring[]>([]);
  const [budgets, setBudgets] = useState<AppBudget[]>([]);
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [members, setMembers] = useState<AppMember[]>([]);
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [meals, setMeals] = useState<AppMeal[]>([]);
  const [routines, setRoutines] = useState<AppRoutine[]>([]);
  const [birthdays, setBirthdays] = useState<AppBirthday[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [notice, setNotice] = useState("");
  const [composer, setComposer] = useState("");
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(
    null,
  );
  const setActive = (next: View) => {
    setActiveState(next);
    if (typeof window !== "undefined") {
      const route = viewRoutes[next];
      if (window.location.pathname !== route)
        window.history.pushState({}, "", route);
    }
  };
  useEffect(() => {
    const onPopState = () => setActiveState(viewFromPathname(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2600);
  };
  const confirm = (message: string, action: () => Promise<void> | void) =>
    setConfirmRequest({ message, action });
  const selectFamily = async (family: AppFamily) => {
    setFamilyMenuOpen(false);
    if (family.id === familyId) return;
    setFamilyId(family.id);
    setFamilyName(family.name);
    window.localStorage.setItem("ninho-active-family", family.id);
    await refresh(family.id);
  };
  const refresh = async (id: string) => {
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .slice(0, 10);
    const [t, l, e, tx, c, rr, bb, m, mm, d, ml, r, b, n] = await Promise.all([
      loadTasks(id),
      loadLists(id),
      loadEvents(id),
      loadTransactions(id),
      loadCategories(id, session.user.id),
      loadRecurring(id),
      loadBudgets(id, monthStart),
      loadMessages(id),
      loadMembers(id),
      loadDocuments(id),
      loadMeals(id),
      loadRoutines(id),
      loadBirthdays(id),
      loadNotifications(session.user.id, id),
    ]);
    setTasks(t);
    setLists(l);
    setEvents(e);
    setTransactions(tx);
    setCategories(c);
    setRecurring(rr);
    setBudgets(bb);
    setMessages(m);
    setMembers(mm);
    setDocuments(d);
    setMeals(ml);
    setRoutines(r);
    setBirthdays(b);
    setNotifications(n);
  };
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const profile = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", session.user.id)
          .maybeSingle();
        if (mounted && profile.data?.display_name?.trim())
          setUserName(profile.data.display_name.trim());
        const inviteToken = new URLSearchParams(window.location.search).get(
          "invite",
        );
        const availableFamilies = await loadFamilies(session.user.id);
        if (mounted) setFamilies(availableFamilies);
        const savedId = window.localStorage.getItem("ninho-active-family");
        let id = availableFamilies.find((family) => family.id === savedId)?.id ?? availableFamilies[0]?.id ?? null;
        if (inviteToken) {
          id = await acceptFamilyInvitation(inviteToken);
          window.history.replaceState({}, "", window.location.pathname);
          flash("Convite aceito. Bem-vindo à família.");
          const refreshedFamilies = await loadFamilies(session.user.id);
          if (mounted) setFamilies(refreshedFamilies);
        }
        if (!id) {
          if (mounted) setNeedsSetup(true);
          return;
        }
        const { data: family } = await supabase
          .from("families")
          .select("id,name")
          .eq("id", id)
          .single();
        if (mounted) {
          setFamilyId(id);
          setFamilyName(family?.name ?? "Minha família");
          window.localStorage.setItem("ninho-active-family", id);
          await refresh(id);
        }
      } catch (error: any) {
        console.error(error);
        flash(error?.message ?? "Não foi possível carregar seus dados.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session.user.id]);
  useEffect(() => {
    if (!familyId) return;
    const channel = supabase
      .channel(`family-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `family_id=eq.${familyId}`,
        },
        () => refresh(familyId),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_items" },
        () => refresh(familyId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_transactions",
          filter: `family_id=eq.${familyId}`,
        },
        () => refresh(familyId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_members",
          filter: `family_id=eq.${familyId}`,
        },
        () => refresh(familyId),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "family_notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload: any) => {
          void refresh(familyId);
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const item = payload.new as {
              title?: string;
              body?: string | null;
            };
            new Notification(item.title ?? "Ninho", {
              body: item.body ?? "Nova atualização na família.",
            });
          } else flash("Você recebeu uma nova notificação.");
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_lists",
          filter: `family_id=eq.${familyId}`,
        },
        () => refresh(familyId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_events",
          filter: `family_id=eq.${familyId}`,
        },
        () => refresh(familyId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_messages",
          filter: `family_id=eq.${familyId}`,
        },
        () => refresh(familyId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_meals",
          filter: `family_id=eq.${familyId}`,
        },
        () => refresh(familyId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_routines",
          filter: `family_id=eq.${familyId}`,
        },
        () => refresh(familyId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_birthdays",
          filter: `family_id=eq.${familyId}`,
        },
        () => refresh(familyId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId]);
  const pending = useMemo(
    () => tasks.filter((task) => !task.done).length,
    [tasks],
  );
  async function addTask() {
    if (!familyId || !composer.trim()) return;
    try {
      const task = await createTask(familyId, session.user.id, composer);
      setTasks((current) => [...current, task]);
      setComposer("");
      void sendEmailNotification("Nova tarefa", task.title, `task-created:${task.id}`);
      flash("Tarefa sincronizada.");
    } catch (error: any) {
      flash(error?.message ?? "Não foi possível criar a tarefa.");
    }
  }
  async function toggleTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    try {
      await setTaskCompleted(id, !task.done);
      setTasks((current) =>
        current.map((item) =>
          item.id === id ? { ...item, done: !item.done } : item,
        ),
      );
    } catch {
      flash("Não foi possível atualizar a tarefa.");
    }
  }
  async function enableBrowserNotifications() {
    if (!("Notification" in window))
      return flash("Este navegador não oferece notificações.");
    const permission = await Notification.requestPermission();
    flash(
      permission === "granted"
        ? "Notificações ativadas."
        : "Notificações não autorizadas.",
    );
  }
  useEffect(() => {
    if (!familyId) return;
    const checkUpcoming = () => {
      if (!("Notification" in window) || Notification.permission !== "granted")
        return;
      const now = Date.now();
      const upcoming = [
        ...tasks
          .filter((task) => !task.done && task.dueAt)
          .map((task) => ({
            id: `task:${task.id}`,
            title: "Tarefa se aproximando",
            body: task.title,
            at: new Date(task.dueAt as string).getTime(),
          })),
        ...events.map((event) => ({
          id: `event:${event.id}`,
          title: "Compromisso se aproximando",
          body: event.title,
          at: new Date(event.startsAt).getTime(),
        })),
      ];
      const sent = JSON.parse(
        window.localStorage.getItem("ninho_reminders_sent") ?? "{}",
      );
      for (const item of upcoming) {
        if (
          item.at >= now &&
          item.at - now <= 15 * 60 * 1000 &&
          !sent[item.id]
        ) {
          new Notification(item.title, { body: item.body });
          void sendEmailNotification(item.title, item.body, item.id);
          sent[item.id] = new Date().toISOString();
        }
      }
      window.localStorage.setItem("ninho_reminders_sent", JSON.stringify(sent));
    };
    checkUpcoming();
    const timer = window.setInterval(checkUpcoming, 60_000);
    return () => window.clearInterval(timer);
  }, [familyId, tasks, events]);
  if (loading)
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <span className="brand-mark">n</span>
          <p>Carregando…</p>
        </div>
      </div>
    );
  if (needsSetup)
    return (
      <FamilySetup
        email={session.user.email ?? ""}
        onCreated={() => window.location.reload()}
      />
    );
  if (!familyId) return null;
  const props: DataProps = {
    session,
    familyId,
    familyName,
    userName,
    tasks,
    lists,
    events,
    transactions,
    categories,
    recurring,
    budgets,
    messages,
    members,
    documents,
    meals,
    routines,
    birthdays,
    notifications,
    refresh: () => refresh(familyId),
    flash,
    setActive,
    confirm,
    enableBrowserNotifications,
  };
  return (
    <main className="app-shell">
      {mobileMenuOpen && (
        <button
          className="mobile-menu-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside className={`sidebar${mobileMenuOpen ? " mobile-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">n</span>
          <span>Ninho</span>
        </div>
        <div className="family-switcher-wrap">
        <button
          className="family-switcher"
          onClick={() => setFamilyMenuOpen((open) => !open)}
          aria-expanded={familyMenuOpen}
          aria-haspopup="menu"
        >
          <span className="family-dot">⌂</span>
          <span>
            <small>Família</small>
            <strong>{familyName}</strong>
          </span>
          <span className="family-chevron">⌄</span>
        </button>
        {familyMenuOpen && (
          <div className="family-menu" role="menu">
            {families.map((family) => (
              <button key={family.id} className={family.id === familyId ? "active" : ""} onClick={() => void selectFamily(family)} role="menuitem">
                <span>⌂</span>{family.name}
              </button>
            ))}
            <button className="family-menu-add" onClick={() => { setFamilyMenuOpen(false); setNewFamilyOpen(true); }}>
              ＋ Adicionar grupo
            </button>
          </div>
        )}
        </div>
        <nav className="nav-list" aria-label="Navegação principal">
          {nav.map(([icon, label]) => (
            <NavButton
              key={label}
              icon={icon}
              label={label}
              active={active}
              onClick={(next) => {
                setActive(next);
                setMobileMenuOpen(false);
              }}
            />
          ))}
        </nav>
        <div className="nav-label">Mais do Ninho</div>
        {moreNav.map(([icon, label]) => (
          <NavButton
            key={label}
            icon={icon}
            label={label}
            active={active}
            onClick={(next) => {
              setActive(next);
              setMobileMenuOpen(false);
            }}
          />
        ))}
        <div className="sidebar-bottom">
          <NavButton
            icon="◉"
            label="Notificações"
            active={active}
            onClick={(next) => {
              setActive(next);
              setMobileMenuOpen(false);
            }}
          />
          <NavButton
            icon="⚙"
            label="Configurações"
            active={active}
            onClick={(next) => {
              setActive(next);
              setMobileMenuOpen(false);
            }}
          />
          <div className="profile-row">
            <span className="avatar avatar-you">
              {(session.user.email ?? "VC").slice(0, 2).toUpperCase()}
            </span>
            <span>
              <strong>{session.user.email}</strong>
              <small>Conta conectada</small>
            </span>
            <button className="more" aria-label="Sair" onClick={onSignOut}>
              ↪
            </button>
          </div>
        </div>
      </aside>
      <section className="content">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            aria-label="Abrir menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            ☰
          </button>
          <div className="mobile-brand">
            <span className="brand-mark">n</span>Ninho
          </div>
          <div className="breadcrumbs">
            {familyName} <span>/</span> {active}
          </div>
          <div className="top-actions">
            <button
              className="help-button"
              onClick={() => setActive("Assistente")}
            >
              ?
            </button>
            <button
              className="invite-button"
              onClick={async () => {
                try {
                  const token = await createFamilyInvite(
                    familyId,
                    session.user.email ?? "",
                  );
                  await navigator.clipboard?.writeText(
                    `${window.location.origin}/?invite=${token}`,
                  );
                  flash("Convite copiado.");
                } catch (error: any) {
                  flash(error?.message ?? "Não foi possível criar o convite.");
                }
              }}
            >
              ＋ Convidar
            </button>
          </div>
        </header>
        <div className="page-wrap">
          <MainView
            {...props}
            active={active}
            pending={pending}
            composer={composer}
            setComposer={setComposer}
            addTask={addTask}
            toggleTask={toggleTask}
          />
        </div>
      </section>
      {notice && <div className="toast">✦ &nbsp; {notice}</div>}
      {confirmRequest && (
        <ConfirmModal
          request={confirmRequest}
          onClose={() => setConfirmRequest(null)}
          flash={flash}
        />
      )}
      {newFamilyOpen && (
        <NewFamilyModal
          onClose={() => setNewFamilyOpen(false)}
          onCreated={async (family) => {
            setFamilies((current) => [...current, family]);
            setNewFamilyOpen(false);
            await selectFamily(family);
            flash("Novo grupo criado.");
          }}
        />
      )}
    </main>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: View;
  active: View;
  onClick: (view: View) => void;
}) {
  return (
    <button
      className={`nav-item ${active === label ? "selected" : ""}`}
      onClick={() => onClick(label)}
    >
      <span className="nav-icon">{icon}</span>
      {label}
    </button>
  );
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="panel empty-state">
      <h2>{title}</h2>
      <p>{detail}</p>
    </section>
  );
}
function Header({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="module-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
    </div>
  );
}
function MainView({
  active,
  pending,
  composer,
  setComposer,
  addTask,
  toggleTask,
  ...props
}: DataProps & {
  active: View;
  pending: number;
  composer: string;
  setComposer: (value: string) => void;
  addTask: () => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
}) {
  return (
    <ViewRouter
      {...props}
      pending={pending}
      composer={composer}
      setComposer={setComposer}
      addTask={addTask}
      toggleTask={toggleTask}
      active={active}
    />
  );
}
function ViewRouter({
  active,
  pending,
  composer,
  setComposer,
  addTask,
  toggleTask,
  setActive,
  ...props
}: DataProps & {
  active: View;
  pending: number;
  composer: string;
  setComposer: (value: string) => void;
  addTask: () => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  setActive: (view: View) => void;
}) {
  const view = active;
  if (view === "Visão geral")
    return (
      <Dashboard
        {...props}
        pending={pending}
        toggleTask={toggleTask}
        setActive={setActive}
      />
    );
  if (view === "Tarefas")
    return (
      <TasksView
        {...props}
        composer={composer}
        setComposer={setComposer}
        addTask={addTask}
        toggleTask={toggleTask}
      />
    );
  if (view === "Listas") return <ListsView {...props} />;
  if (view === "Calendário") return <EventsView {...props} />;
  if (view === "Orçamento") return <BudgetView {...props} />;
  if (view === "Mensagens")
    return (
      <MessagesView {...props} composer={composer} setComposer={setComposer} />
    );
  if (view === "Documentos") return <DocumentsView {...props} />;
  if (view === "Família") return <FamilyView {...props} />;
  if (view === "Refeições")
    return <FamilyRecordsView {...props} kind="meals" />;
  if (view === "Rotinas")
    return <FamilyRecordsView {...props} kind="routines" />;
  if (view === "Aniversários")
    return <FamilyRecordsView {...props} kind="birthdays" />;
  if (view === "Localização") return <LocationView {...props} />;
  if (view === "Notificações")
    return (
      <NotificationsView
        notifications={props.notifications}
        refresh={props.refresh}
        flash={props.flash}
        enableBrowserNotifications={props.enableBrowserNotifications}
      />
    );
  if (view === "Assistente")
    return (
      <AssistantView
        tasks={props.tasks}
        events={props.events}
        transactions={props.transactions}
        setActive={setActive}
      />
    );
  if (view === "Configurações") return <SettingsView {...props} />;
  return (
    <Empty
      title={`${view} ainda não tem dados`}
      detail="Esta área está pronta para receber registros reais. Nenhum conteúdo de demonstração é exibido."
    />
  );
}

function NotificationsView({
  notifications,
  refresh,
  flash,
  enableBrowserNotifications,
}: any) {
  async function read(notification: AppNotification) {
    if (notification.readAt) return;
    try {
      await markNotificationRead(notification.id);
      await refresh();
    } catch (e: any) {
      flash(e.message);
    }
  }
  return (
    <>
      <Header eyebrow="NOTIFICAÇÕES" title="O que merece sua atenção." />
      <section className="notification-settings panel">
        <div>
          <p className="eyebrow">ALERTAS</p>
          <strong>Receba avisos de tarefas, mensagens e eventos</strong>
          <small>
            Ative as notificações do navegador para ver alertas enquanto o Ninho
            estiver aberto.
          </small>
        </div>
        <button className="outline-button" onClick={enableBrowserNotifications}>
          Ativar notificações
        </button>
      </section>
      <section className="panel">
        {notifications.length ? (
          notifications.map((notification: AppNotification) => (
            <button
              className={`notification-row ${notification.readAt ? "read" : ""}`}
              key={notification.id}
              onClick={() => read(notification)}
            >
              <span className="notification-dot" />
              <span>
                <strong>{notification.title}</strong>
                <small>
                  {notification.body ?? "Atualização da família"} ·{" "}
                  {new Date(notification.createdAt).toLocaleString("pt-BR")}
                </small>
              </span>
              {!notification.readAt && <b>Nova</b>}
            </button>
          ))
        ) : (
          <Empty
            title="Nenhuma notificação"
            detail="Novos convites e atualizações aparecerão aqui."
          />
        )}
      </section>
    </>
  );
}
function AssistantView({ tasks, events, transactions, setActive }: any) {
  const pending = tasks.filter((task: AppTask) => !task.done).length;
  const upcoming = events.filter(
    (event: AppEvent) => new Date(event.startsAt) >= new Date(),
  ).length;
  const expenses = transactions
    .filter((transaction: AppTransaction) => transaction.kind === "expense")
    .reduce(
      (sum: number, transaction: AppTransaction) => sum + transaction.amount,
      0,
    );
  return (
    <>
      <Header eyebrow="NINHO AJUDA" title="Uma visão rápida da sua casa." />
      <div className="assistant-layout">
        <section className="panel assistant-panel">
          <h2>O que você quer organizar?</h2>
          <p className="body-copy">
            Aqui estão os próximos passos com base no que foi registrado pela
            sua família.
          </p>
          <div className="assistant-suggestions">
            <button onClick={() => setActive("Tarefas")}>
              Você tem {pending} tarefa(s) pendente(s) →
            </button>
            <button onClick={() => setActive("Calendário")}>
              {upcoming} compromisso(s) próximo(s) →
            </button>
            <button onClick={() => setActive("Orçamento")}>
              Despesas registradas: R$ {expenses.toFixed(2).replace(".", ",")} →
            </button>
          </div>
        </section>
        <section className="panel">
          <h2>Ações rápidas</h2>
          <button
            className="dark-button full"
            onClick={() => setActive("Tarefas")}
          >
            Adicionar tarefa
          </button>
          <button
            className="outline-button"
            onClick={() => setActive("Calendário")}
          >
            Criar evento
          </button>
          <button
            className="outline-button"
            onClick={() => setActive("Mensagens")}
          >
            Enviar mensagem
          </button>
        </section>
      </div>
    </>
  );
}

function PanelHeading({ eyebrow, title, action, onClick }: any) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action} →
        </button>
      )}
    </div>
  );
}
function Dashboard({
  userName,
  tasks,
  lists,
  events,
  members,
  pending,
  toggleTask,
  setActive,
}: any) {
  const list = lists[0];
  const firstName = String(userName ?? "").trim().split(/\s+/)[0] || "você";
  return (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">VISÃO GERAL</p>
          <h1>
            Olá, {firstName} <span className="wave">✦</span>
          </h1>
          <p className="subcopy">
            Tudo o que a sua família precisa, em um só lugar.
          </p>
        </div>
      </div>
      <div className="quick-grid">
        <QuickCard
          tone="peach"
          icon="✦"
          title="Novo evento"
          subtitle="Adicione à agenda da família"
          onClick={() => setActive("Calendário")}
        />
        <QuickCard
          tone="lavender"
          icon="✓"
          title="Nova tarefa"
          subtitle="Divida o que precisa ser feito"
          onClick={() => setActive("Tarefas")}
        />
        <QuickCard
          tone="mint"
          icon="◔"
          title="Lançar despesa"
          subtitle="Controle o orçamento da casa"
          onClick={() => setActive("Orçamento")}
        />
      </div>
      <div className="dashboard-grid">
        <div className="main-column">
          <section className="panel agenda-panel">
            <PanelHeading
              eyebrow="AGENDA DA FAMÍLIA"
              title="Próximos compromissos"
              action="Ver calendário"
              onClick={() => setActive("Calendário")}
            />
            {events.length ? (
              events.slice(0, 5).map((event: AppEvent) => (
                <Event
                  key={event.id}
                  time={new Date(event.startsAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  title={event.title}
                  tag={event.location ?? ""}
                  color="orange"
                />
              ))
            ) : (
              <p className="empty-copy">Nenhum compromisso cadastrado.</p>
            )}
          </section>
          <section className="panel tasks-panel">
            <PanelHeading
              eyebrow="TAREFAS"
              title={
                <>
                  Tarefas pendentes{" "}
                  <span className="count-pill">{pending}</span>
                </>
              }
              action="Ver todas"
              onClick={() => setActive("Tarefas")}
            />
            {tasks.length ? (
              tasks
                .slice(0, 3)
                .map((task: AppTask) => (
                  <TaskRow key={task.id} task={task} toggleTask={toggleTask} />
                ))
            ) : (
              <p className="empty-copy">Nenhuma tarefa cadastrada.</p>
            )}
          </section>
        </div>
        <aside className="right-column">
          <section className="panel family-panel">
            <PanelHeading
              eyebrow="NA FAMÍLIA"
              title="Membros"
              action="Gerenciar"
              onClick={() => setActive("Família")}
            />
            {members.length ? (
              members.slice(0, 5).map((member: AppMember) => (
                <div className="member" key={member.userId}>
                  <span
                    className="member-avatar"
                    style={{ background: "#8ec0a7" }}
                  >
                    {member.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <strong>{member.displayName}</strong>
                    <small>{memberRoleLabel(member.role)}</small>
                  </span>
                </div>
              ))
            ) : (
              <p className="empty-copy">Nenhum membro cadastrado.</p>
            )}
          </section>
          <section className="panel list-panel">
            <PanelHeading
              eyebrow="LISTA COMPARTILHADA"
              title={list?.name ?? "Listas"}
              action="Abrir listas"
              onClick={() => setActive("Listas")}
            />
            {list ? (
              <>
                {list.items.length ? (
                  list.items.slice(0, 5).map((item: string) => (
                    <p className="empty-copy" key={item}>
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="empty-copy">Lista vazia.</p>
                )}
              </>
            ) : (
              <p className="empty-copy">Nenhuma lista criada.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
function QuickCard({ tone, icon, title, subtitle, onClick }: any) {
  return (
    <button className={`quick-card ${tone}`} onClick={onClick}>
      <span className="quick-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <span className="arrow">↗</span>
    </button>
  );
}
function ConfirmModal({
  request,
  onClose,
  flash,
}: {
  request: ConfirmRequest;
  onClose: () => void;
  flash: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    try {
      await request.action();
      onClose();
    } catch (error: any) {
      flash(error?.message ?? "Não foi possível concluir a ação.");
      onClose();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <p className="eyebrow">CONFIRMAR AÇÃO</p>
        <h2 id="confirm-title">Tem certeza?</h2>
        <p>{request.message}</p>
        <div className="modal-actions">
          <button className="outline-button" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button className="dark-button" disabled={busy} onClick={accept}>
            {busy ? "Excluindo…" : "Confirmar"}
          </button>
        </div>
      </section>
    </div>
  );
}
function TaskRow({ task, toggleTask, onDelete }: any) {
  return (
    <div className={`task-row ${task.done ? "completed" : ""}`}>
      <button
        className="check"
        onClick={() => toggleTask(task.id)}
        aria-label={`${task.done ? "Reabrir" : "Concluir"} ${task.title}`}
      >
        {task.done ? "✓" : ""}
      </button>
      <div className="task-copy">
        <strong>{task.title}</strong>
        <small>
          {task.meta} · {task.priority}
        </small>
      </div>
      <span className="assignee orange">
        {task.person.slice(0, 2).toUpperCase()}
      </span>
      {onDelete && (
        <button
          className="more-button"
          onClick={() => onDelete(task)}
          aria-label={`Excluir ${task.title}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
function Event({ time, title, tag, color }: any) {
  return (
    <div className="event-row">
      <span className="event-time">{time}</span>
      <span className={`event-line ${color}`} />
      <div className="event-title">
        <strong>{title}</strong>
        <small>{tag}</small>
      </div>
    </div>
  );
}

function TasksView({
  tasks,
  composer,
  setComposer,
  addTask,
  toggleTask,
  flash,
  refresh,
  confirm,
}: any) {
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const visible = tasks.filter(
    (task: AppTask) =>
      filter === "all" || (filter === "pending" ? !task.done : task.done),
  );
  function remove(task: AppTask) {
    confirm(`Excluir “${task.title}”?`, async () => {
      await deleteTask(task.id);
      await refresh();
      flash("Tarefa excluída.");
    });
  }
  return (
    <>
      <Header eyebrow="TAREFAS" title="O que precisa acontecer." />
      <section className="panel">
        <div className="input-row">
          <input
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Adicione uma tarefa real"
          />
          <button className="dark-button" onClick={addTask}>
            Adicionar
          </button>
        </div>
        <div className="task-filters">
          <button
            className={filter === "all" ? "active-filter" : ""}
            onClick={() => setFilter("all")}
          >
            Todas · {tasks.length}
          </button>
          <button
            className={filter === "pending" ? "active-filter" : ""}
            onClick={() => setFilter("pending")}
          >
            Pendentes · {tasks.filter((task: AppTask) => !task.done).length}
          </button>
          <button
            className={filter === "done" ? "active-filter" : ""}
            onClick={() => setFilter("done")}
          >
            Concluídas · {tasks.filter((task: AppTask) => task.done).length}
          </button>
        </div>
        {visible.length ? (
          visible.map((task: AppTask) => (
            <TaskRow
              key={task.id}
              task={task}
              toggleTask={toggleTask}
              onDelete={remove}
            />
          ))
        ) : (
          <Empty
            title="Nenhuma tarefa neste filtro"
            detail="Altere o filtro ou adicione uma nova tarefa."
          />
        )}
      </section>
    </>
  );
}

function ListsView({ lists, familyId, session, refresh, flash, confirm }: any) {
  const [name, setName] = useState("");
  const [item, setItem] = useState("");
  async function newList() {
    if (!name.trim()) return flash("Informe um nome para a lista.");
    try {
      await createShoppingList(familyId, session.user.id, name);
      setName("");
      await refresh();
      flash("Lista criada.");
    } catch (e: any) {
      flash(e.message);
    }
  }
  async function newItem(listId: string) {
    if (!item.trim()) return flash("Informe o item.");
    try {
      await createShoppingItem(listId, session.user.id, item);
      setItem("");
      await refresh();
      flash("Item adicionado.");
    } catch (e: any) {
      flash(e.message);
    }
  }
  function removeItem(id: string, label: string) {
    confirm(`Excluir “${label}”?`, async () => {
      await deleteShoppingItem(id);
      await refresh();
      flash("Item excluído.");
    });
  }
  function removeList(list: AppList) {
    confirm(`Excluir a lista “${list.name}” e seus itens?`, async () => {
      await deleteShoppingList(list.id);
      await refresh();
      flash("Lista excluída.");
    });
  }
  return (
    <>
      <Header eyebrow="LISTAS" title="Tudo o que a casa precisa." />
      <div className="lists-grid">
        {lists.map((list: AppList) => (
          <section className="panel list-card" key={list.id}>
            <div className="list-card-title">
              <h2>{list.name}</h2>
              <button
                className="more-button"
                onClick={() => removeList(list)}
                aria-label={`Excluir lista ${list.name}`}
              >
                ×
              </button>
            </div>
            <span className="list-progress">{list.items.length} itens</span>
            <div className="progress-track">
              <span
                style={{
                  width: `${list.items.length ? (list.checked.filter(Boolean).length / list.items.length) * 100 : 0}%`,
                }}
              />
            </div>
            {list.items.map((label, i) => (
              <div className="shopping-item" key={list.itemIds[i]}>
                <label>
                  <input
                    type="checkbox"
                    checked={list.checked[i]}
                    onChange={async () => {
                      try {
                        await setShoppingItemChecked(
                          list.itemIds[i],
                          !list.checked[i],
                        );
                        await refresh();
                      } catch (e: any) {
                        flash(e.message);
                      }
                    }}
                  />
                  <span>{label}</span>
                </label>
                <button
                  className="more-button"
                  onClick={() => removeItem(list.itemIds[i], label)}
                  aria-label={`Excluir item ${label}`}
                >
                  ×
                </button>
              </div>
            ))}
            <div className="input-row list-add">
              <input
                value={item}
                onChange={(e) => setItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newItem(list.id)}
                placeholder="Novo item"
              />
              <button className="dark-button" onClick={() => newItem(list.id)}>
                Adicionar
              </button>
            </div>
          </section>
        ))}
        <section className="panel list-card">
          <h2>Nova lista</h2>
          <div className="input-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newList()}
              placeholder="Ex.: Compras"
            />
            <button className="dark-button" onClick={newList}>
              Criar
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function EventsView({
  events,
  familyId,
  session,
  refresh,
  flash,
  confirm,
}: any) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) =>
    index < firstDay ? null : index - firstDay + 1,
  );
  const today = new Date();
  async function add() {
    if (!title.trim() || !date)
      return flash("Informe o nome e a data do evento.");
    try {
      await createEvent(
        familyId,
        session.user.id,
        title,
        new Date(date).toISOString(),
      );
      void sendEmailNotification("Novo compromisso", title, `event-created:${title}:${date}`);
      setTitle("");
      setDate("");
      await refresh();
      flash("Evento criado.");
    } catch (e: any) {
      flash(e.message);
    }
  }
  function remove(event: AppEvent) {
    confirm(`Excluir “${event.title}”?`, async () => {
      await deleteEvent(event.id);
      await refresh();
      flash("Evento excluído.");
    });
  }
  const eventsOn = (day: number) =>
    events.filter((event: AppEvent) => {
      const value = new Date(event.startsAt);
      return (
        value.getFullYear() === year &&
        value.getMonth() === monthIndex &&
        value.getDate() === day
      );
    });
  return (
    <>
      <Header eyebrow="CALENDÁRIO" title="Sua semana, com mais clareza." />
      <section className="panel">
        <div className="calendar-toolbar">
          <button
            onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
            aria-label="Mês anterior"
          >
            ‹
          </button>
          <strong>
            {month.toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </strong>
          <button
            onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
            aria-label="Próximo mês"
          >
            ›
          </button>
          <span className="calendar-spacer" />
          <button
            className="filter-button"
            onClick={() =>
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
            }
          >
            Hoje
          </button>
        </div>
        <div className="calendar-grid">
          <div className="calendar-weekday">DOM</div>
          <div className="calendar-weekday">SEG</div>
          <div className="calendar-weekday">TER</div>
          <div className="calendar-weekday">QUA</div>
          <div className="calendar-weekday">QUI</div>
          <div className="calendar-weekday">SEX</div>
          <div className="calendar-weekday">SÁB</div>
          {cells.map((day, index) => {
            const dayEvents = day ? eventsOn(day) : [];
            const isToday =
              day === today.getDate() &&
              monthIndex === today.getMonth() &&
              year === today.getFullYear();
            return (
              <div
                className={`calendar-cell ${isToday ? "calendar-today" : ""}`}
                key={`${year}-${monthIndex}-${index}`}
              >
                {day && (
                  <>
                    <strong>{day}</strong>
                    {dayEvents.slice(0, 2).map((event: AppEvent) => (
                      <small key={event.id} title={event.title}>
                        {new Date(event.startsAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {event.title}
                      </small>
                    ))}
                    {dayEvents.length > 2 && (
                      <small>+{dayEvents.length - 2} evento(s)</small>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NOVO COMPROMISSO</p>
            <h2>Adicionar ao calendário</h2>
          </div>
        </div>
        <div className="input-row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do evento"
          />
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="dark-button" onClick={add}>
            Adicionar
          </button>
        </div>
        {events.length ? (
          events
            .filter((event: AppEvent) => {
              const value = new Date(event.startsAt);
              return (
                value.getFullYear() === year && value.getMonth() === monthIndex
              );
            })
            .map((event: AppEvent) => (
              <div className="event-action-row" key={event.id}>
                <Event
                  time={new Date(event.startsAt).toLocaleDateString("pt-BR")}
                  title={event.title}
                  tag={new Date(event.startsAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  color="orange"
                />
                <button
                  className="more-button"
                  onClick={() => remove(event)}
                  aria-label={`Excluir evento ${event.title}`}
                >
                  ×
                </button>
              </div>
            ))
        ) : (
          <Empty
            title="Nenhum evento ainda"
            detail="Cadastre compromissos reais da família."
          />
        )}
      </section>
    </>
  );
}

function BudgetView({
  transactions,
  categories,
  recurring,
  budgets,
  members,
  familyId,
  session,
  refresh,
  flash,
  confirm,
}: any) {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [recurringModal, setRecurringModal] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [form, setForm] = useState<any>({
    description: "",
    amount: "",
    kind: "expense",
    category: "Outros",
    purchaseDate: now.toISOString().slice(0, 10),
    dueDate: "",
    status: "paid",
    paymentMethod: "",
    paidBy: "",
    recurrence: "",
    notes: "",
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [recForm, setRecForm] = useState<any>({
    name: "",
    amount: "",
    kind: "expense",
    categoryId: "",
    dayOfMonth: "1",
    nextDue: now.toISOString().slice(0, 10),
    recurrence: "monthly",
    paymentMethod: "",
    payerId: "",
    notes: "",
  });
  const monthStart = `${month}-01`;
  const inMonth = transactions.filter((t: AppTransaction) =>
    t.purchaseDate?.startsWith(month),
  );
  const incomePaid = inMonth
    .filter((t: AppTransaction) => t.kind === "income" && t.status === "paid")
    .reduce((s: number, t: AppTransaction) => s + t.amount, 0);
  const expensePaid = inMonth
    .filter((t: AppTransaction) => t.kind === "expense" && t.status === "paid")
    .reduce((s: number, t: AppTransaction) => s + t.amount, 0);
  const expectedIncome = inMonth
    .filter((t: AppTransaction) => t.kind === "income")
    .reduce((s: number, t: AppTransaction) => s + t.amount, 0);
  const expectedExpense = inMonth
    .filter((t: AppTransaction) => t.kind === "expense")
    .reduce((s: number, t: AppTransaction) => s + t.amount, 0);
  const due = inMonth.filter(
    (t: AppTransaction) => t.kind === "expense" && t.status === "pending",
  );
  const filtered = inMonth.filter(
    (t: AppTransaction) =>
      (!search || t.description.toLowerCase().includes(search.toLowerCase())) &&
      (statusFilter === "all" || t.status === statusFilter) &&
      (categoryFilter === "all" || t.category === categoryFilter) &&
      (kindFilter === "all" || t.kind === kindFilter),
  );
  const visibleTransactions = filtered.slice(0, pageSize);
  const categoryTotals = categories
    .map((category: AppCategory) => ({
      name: category.name,
      value: inMonth
        .filter(
          (t: AppTransaction) =>
            t.kind === "expense" &&
            t.status === "paid" &&
            t.category === category.name,
        )
        .reduce((sum: number, t: AppTransaction) => sum + t.amount, 0),
    }))
    .filter((item: { value: number }) => item.value > 0)
    .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
    .slice(0, 6);
  const maxCategoryTotal = Math.max(
    ...categoryTotals.map((item: { value: number }) => item.value),
    1,
  );
  const setField = (key: string, value: string) =>
    setForm((current: any) => ({ ...current, [key]: value }));
  function openNew() {
    setEditingId(null);
    setReceipt(null);
    setForm({
      description: "",
      amount: "",
      kind: "expense",
      category: categories[0]?.name ?? "Outros",
      purchaseDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      status: "paid",
      paymentMethod: "",
      paidBy: session.user.id,
      recurrence: "",
      notes: "",
    });
    setBudgetModal(true);
  }
  function edit(t: AppTransaction) {
    setEditingId(t.id);
    setReceipt(null);
    setForm({
      description: t.description,
      amount: String(t.amount),
      kind: t.kind,
      category: t.category,
      purchaseDate: t.purchaseDate,
      dueDate: t.dueDate ?? "",
      status: t.status,
      paymentMethod: t.paymentMethod ?? "",
      paidBy: t.paidBy ?? "",
      recurrence: t.recurrence ?? "",
      notes: t.notes ?? "",
    });
    setBudgetModal(true);
  }
  async function save() {
    const value = Number(form.amount);
    if (!form.description.trim() || value <= 0)
      return flash("Informe descrição e valor maior que zero.");
    try {
      let id = editingId;
      if (id) await updateTransaction(id, { ...form, amount: value });
      else {
        const created = await createDetailedTransaction(
          familyId,
          session.user.id,
          { ...form, amount: value },
        );
        id = created.id;
      }
      if (receipt && id)
        await uploadFinanceReceipt(familyId, session.user.id, id, receipt);
      setBudgetModal(false);
      setReceipt(null);
      await refresh();
      flash(editingId ? "Lançamento atualizado." : "Lançamento salvo.");
    } catch (e: any) {
      flash(e.message);
    }
  }
  function duplicate(t: AppTransaction) {
    edit(t);
    setEditingId(null);
    setForm((current: any) => ({
      ...current,
      description: `${t.description} (cópia)`,
      purchaseDate: new Date().toISOString().slice(0, 10),
      status: "pending",
    }));
  }
  function remove(t: AppTransaction) {
    confirm(`Excluir “${t.description}”?`, async () => {
      await deleteTransaction(t.id);
      await refresh();
      flash("Lançamento excluído.");
    });
  }
  async function addCategory() {
    if (!categoryName.trim()) return;
    try {
      await createCategory(familyId, session.user.id, categoryName);
      setCategoryName("");
      await refresh();
      flash("Categoria criada.");
    } catch (e: any) {
      flash(e.message);
    }
  }
  async function saveBudget() {
    if (!budgetCategory || Number(budgetLimit) <= 0)
      return flash("Escolha uma categoria e informe um limite.");
    try {
      await upsertBudget(
        familyId,
        session.user.id,
        budgetCategory,
        monthStart,
        Number(budgetLimit),
      );
      setBudgetEditorOpen(false);
      await refresh();
      flash("Orçamento salvo.");
    } catch (e: any) {
      flash(e.message);
    }
  }
  async function saveRecurring() {
    if (!recForm.name.trim() || Number(recForm.amount) <= 0)
      return flash("Preencha a conta recorrente.");
    try {
      await createRecurring(familyId, session.user.id, {
        ...recForm,
        amount: Number(recForm.amount),
        dayOfMonth: Number(recForm.dayOfMonth),
        active: true,
      });
      setRecurringModal(false);
      await refresh();
      flash("Conta recorrente cadastrada.");
    } catch (e: any) {
      flash(e.message);
    }
  }
  return (
    <>
      <div className="module-header">
        <Header
          eyebrow="ORÇAMENTO"
          title="Dinheiro da casa, sem complicação."
        />
        <div className="budget-header-actions">
          <label className="month-picker">
            Mês
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <button className="dark-button" onClick={openNew}>
            ＋ Novo lançamento
          </button>
        </div>
      </div>
      <div className="metric-grid finance-metrics">
        <Metric
          label="Saldo atual"
          value={incomePaid - expensePaid}
          tone="peach"
        />
        <Metric
          label="Disponível no mês"
          value={expectedIncome - expectedExpense}
          tone="mint"
        />
        <Metric
          label="Receitas do mês"
          value={expectedIncome}
          tone="lavender"
        />
        <Metric label="Despesas do mês" value={expectedExpense} tone="peach" />
        <Metric label="Contas a vencer" value={due.length} tone="mint" />
      </div>
      <section className="panel quick-finance">
        <div>
          <p className="eyebrow">LANÇAMENTO RÁPIDO</p>
          <h2>Algo simples para registrar?</h2>
        </div>
        <div className="input-row">
          <input
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Descrição"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setField("amount", e.target.value)}
            placeholder="Valor"
          />
          <select
            value={form.kind}
            onChange={(e) => setField("kind", e.target.value)}
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
          <button className="dark-button" onClick={save}>
            Lançar
          </button>
        </div>
      </section>
      <div className="finance-actions">
        <button className="dark-button" onClick={openNew}>
          ＋ Nova despesa
        </button>
        <button
          className="outline-button"
          onClick={() => {
            openNew();
            setField("kind", "income");
          }}
        >
          ＋ Nova receita
        </button>
        <button
          className="outline-button"
          onClick={() => setRecurringModal(true)}
        >
          ＋ Conta recorrente
        </button>
      </div>
      <div className="two-col finance-lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ORÇAMENTO POR CATEGORIA</p>
              <h2>
                Limites de{" "}
                {new Date(`${month}-02`).toLocaleDateString("pt-BR", {
                  month: "long",
                })}
              </h2>
            </div>
            <button
              className="text-button"
              onClick={() => setBudgetEditorOpen(true)}
            >
              Definir limite →
            </button>
          </div>
          {budgets.length ? (
            budgets.map((budget: AppBudget) => {
              const category =
                categories.find((c: AppCategory) => c.id === budget.categoryId)
                  ?.name ?? "Categoria";
              const used = inMonth
                .filter(
                  (t: AppTransaction) =>
                    t.category === category &&
                    t.kind === "expense" &&
                    t.status === "paid",
                )
                .reduce((s: number, t: AppTransaction) => s + t.amount, 0);
              const percent = Math.min(100, (used / budget.limitAmount) * 100);
              return (
                <div className="budget-line" key={budget.id}>
                  <div>
                    <span>{category}</span>
                    <strong>
                      R$ {used.toFixed(2).replace(".", ",")} de R${" "}
                      {budget.limitAmount.toFixed(2).replace(".", ",")}
                    </strong>
                  </div>
                  <i>
                    <b
                      style={{
                        width: `${percent}%`,
                        background:
                          percent >= 100
                            ? "#c8755c"
                            : percent >= 80
                              ? "#e5aa60"
                              : undefined,
                      }}
                    />
                  </i>
                </div>
              );
            })
          ) : (
            <Empty
              title="Nenhum limite definido"
              detail="Defina um orçamento por categoria para acompanhar os gastos."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">CONTAS A VENCER</p>
              <h2>Próximos vencimentos</h2>
            </div>
          </div>
          {due.length ? (
            due.slice(0, 5).map((t: AppTransaction) => (
              <div className="transaction-row" key={t.id}>
                <p className="empty-copy">
                  {t.description}
                  <br />
                  <small>
                    vence em{" "}
                    {t.dueDate
                      ? new Date(`${t.dueDate}T12:00:00`).toLocaleDateString(
                          "pt-BR",
                        )
                      : "data não informada"}{" "}
                    · R$ {t.amount.toFixed(2).replace(".", ",")}
                  </small>
                </p>
                <button
                  className="more-button"
                  onClick={() => edit(t)}
                  aria-label={`Editar ${t.description}`}
                >
                  ✎
                </button>
              </div>
            ))
          ) : (
            <p className="empty-copy">Nenhuma conta pendente neste mês.</p>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">LANÇAMENTOS</p>
            <h2>
              Movimentações de{" "}
              {new Date(`${month}-02`).toLocaleDateString("pt-BR", {
                month: "long",
              })}
            </h2>
          </div>
        </div>
        <div className="finance-filters">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar descrição"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {categories.map((c: AppCategory) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
            <option value="transfer">Transferências</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todas as situações</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
          </select>
        </div>
        <div className="finance-table">
          <div className="finance-table-head">
            <span>Data</span>
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Responsável</span>
            <span>Situação</span>
            <span>Valor</span>
            <span />
          </div>
          {filtered.length ? (
            visibleTransactions.map((t: AppTransaction) => (
              <div className="finance-table-row" key={t.id}>
                <span>
                  {new Date(`${t.purchaseDate}T12:00:00`).toLocaleDateString(
                    "pt-BR",
                  )}
                </span>
                <strong>{t.description}</strong>
                <span>{t.category}</span>
                <span>
                  {members.find((m: AppMember) => m.userId === t.paidBy)
                    ?.displayName ?? "Não informado"}
                </span>
                <span className={`status-pill ${t.status}`}>
                  {t.status === "paid" ? "Pago" : "Pendente"}
                </span>
                <span
                  className={t.kind === "expense" ? "negative" : "positive"}
                >
                  {t.kind === "expense" ? "-" : "+"} R${" "}
                  {t.amount.toFixed(2).replace(".", ",")}
                </span>
                <span className="finance-row-actions">
                  <button onClick={() => edit(t)} aria-label="Editar">
                    ✎
                  </button>
                  <button onClick={() => duplicate(t)} aria-label="Duplicar">
                    ⧉
                  </button>
                  <button onClick={() => remove(t)} aria-label="Excluir">
                    ×
                  </button>
                </span>
              </div>
            ))
          ) : (
            <Empty
              title="Nenhum lançamento encontrado"
              detail="Ajuste os filtros ou registre uma nova movimentação."
            />
          )}
        </div>
        {filtered.length > visibleTransactions.length && (
          <button
            className="outline-button finance-load-more"
            onClick={() => setPageSize((size) => size + 20)}
          >
            Carregar mais ({filtered.length - visibleTransactions.length}{" "}
            restantes)
          </button>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">CATEGORIAS E RECORRÊNCIAS</p>
            <h2>Organização automática</h2>
          </div>
        </div>
        <div className="finance-settings-row">
          <div className="input-row">
            <input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Nova categoria"
            />
            <button className="outline-button" onClick={addCategory}>
              Criar categoria
            </button>
          </div>
          <button
            className="outline-button"
            onClick={() => setRecurringModal(true)}
          >
            Gerenciar recorrentes ({recurring.length})
          </button>
        </div>
      </section>
      <section className="finance-chart-grid">
        <div className="panel finance-chart-card">
          <p className="eyebrow">GASTOS DO MÊS</p>
          <h2>Por categoria</h2>
          {categoryTotals.length ? (
            categoryTotals.map((item: { name: string; value: number }) => (
              <div className="chart-bar-row" key={item.name}>
                <span>{item.name}</span>
                <i>
                  <b
                    style={{
                      width: `${(item.value / maxCategoryTotal) * 100}%`,
                    }}
                  />
                </i>
                <strong>R$ {item.value.toFixed(2).replace(".", ",")}</strong>
              </div>
            ))
          ) : (
            <p className="empty-copy">Ainda não há despesas pagas neste mês.</p>
          )}
        </div>
        <div className="panel finance-chart-card">
          <p className="eyebrow">RESUMO DO MÊS</p>
          <h2>Receitas x despesas</h2>
          <div className="chart-summary">
            <div>
              <span>Receitas</span>
              <strong className="positive">
                R$ {expectedIncome.toFixed(2).replace(".", ",")}
              </strong>
            </div>
            <div>
              <span>Despesas</span>
              <strong className="negative">
                R$ {expectedExpense.toFixed(2).replace(".", ",")}
              </strong>
            </div>
            <div>
              <span>Saldo previsto</span>
              <strong>
                R${" "}
                {(expectedIncome - expectedExpense)
                  .toFixed(2)
                  .replace(".", ",")}
              </strong>
            </div>
          </div>
        </div>
      </section>
      {budgetEditorOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setBudgetEditorOpen(false)}
        >
          <section
            className="finance-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-header">
              <div>
                <p className="eyebrow">ORÇAMENTO MENSAL</p>
                <h2>Definir limite por categoria</h2>
              </div>
              <button
                className="more-button"
                onClick={() => setBudgetEditorOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="finance-form-grid">
              <label className="auth-label">
                Categoria
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                >
                  <option value="">Escolha uma categoria</option>
                  {categories.map((c: AppCategory) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="auth-label">
                Limite do mês
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  placeholder="1200,00"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="outline-button"
                onClick={() => setBudgetEditorOpen(false)}
              >
                Cancelar
              </button>
              <button className="dark-button" onClick={saveBudget}>
                Salvar
              </button>
            </div>
          </section>
        </div>
      )}
      {budgetModal && (
        <div className="modal-backdrop" onClick={() => setBudgetModal(false)}>
          <section
            className="finance-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-header">
              <div>
                <p className="eyebrow">
                  {editingId ? "EDITAR" : "NOVO LANÇAMENTO"}
                </p>
                <h2>{editingId ? "Editar lançamento" : "Cadastro completo"}</h2>
              </div>
              <button
                className="more-button"
                onClick={() => setBudgetModal(false)}
              >
                ×
              </button>
            </div>
            <div className="finance-form-grid">
              <label className="auth-label">
                Descrição
                <input
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </label>
              <label className="auth-label">
                Valor
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setField("amount", e.target.value)}
                />
              </label>
              <label className="auth-label">
                Tipo
                <select
                  value={form.kind}
                  onChange={(e) => setField("kind", e.target.value)}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                  <option value="transfer">Transferência</option>
                </select>
              </label>
              <label className="auth-label">
                Categoria
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                >
                  {categories.map((c: AppCategory) => (
                    <option key={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="auth-label">
                Data da compra
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setField("purchaseDate", e.target.value)}
                />
              </label>
              <label className="auth-label">
                Vencimento
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setField("dueDate", e.target.value)}
                />
              </label>
              <label className="auth-label">
                Situação
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                >
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                </select>
              </label>
              <label className="auth-label">
                Forma de pagamento
                <input
                  value={form.paymentMethod}
                  onChange={(e) => setField("paymentMethod", e.target.value)}
                  placeholder="Pix, cartão, dinheiro…"
                />
              </label>
              <label className="auth-label">
                Quem pagou/recebeu
                <select
                  value={form.paidBy}
                  onChange={(e) => setField("paidBy", e.target.value)}
                >
                  <option value="">Não informado</option>
                  {members.map((m: AppMember) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="auth-label">
                Recorrência
                <select
                  value={form.recurrence}
                  onChange={(e) => setField("recurrence", e.target.value)}
                >
                  <option value="">Não recorrente</option>
                  <option value="monthly">Mensal</option>
                  <option value="weekly">Semanal</option>
                  <option value="yearly">Anual</option>
                </select>
              </label>
              <label className="auth-label full-field">
                Observação
                <textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Detalhes opcionais"
                />
              </label>
              <label className="auth-label full-field">
                Comprovante
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="outline-button"
                onClick={() => setBudgetModal(false)}
              >
                Cancelar
              </button>
              <button className="dark-button" onClick={save}>
                Salvar
              </button>
            </div>
          </section>
        </div>
      )}
      {recurringModal && (
        <div
          className="modal-backdrop"
          onClick={() => setRecurringModal(false)}
        >
          <section
            className="finance-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-header">
              <div>
                <p className="eyebrow">RECORRÊNCIA</p>
                <h2>Nova conta recorrente</h2>
              </div>
              <button
                className="more-button"
                onClick={() => setRecurringModal(false)}
              >
                ×
              </button>
            </div>
            <div className="finance-form-grid">
              <label className="auth-label">
                Nome
                <input
                  value={recForm.name}
                  onChange={(e) =>
                    setRecForm({ ...recForm, name: e.target.value })
                  }
                  placeholder="Aluguel, energia, salário…"
                />
              </label>
              <label className="auth-label">
                Valor
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={recForm.amount}
                  onChange={(e) =>
                    setRecForm({ ...recForm, amount: e.target.value })
                  }
                />
              </label>
              <label className="auth-label">
                Tipo
                <select
                  value={recForm.kind}
                  onChange={(e) =>
                    setRecForm({ ...recForm, kind: e.target.value })
                  }
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </label>
              <label className="auth-label">
                Categoria
                <select
                  value={recForm.categoryId}
                  onChange={(e) =>
                    setRecForm({ ...recForm, categoryId: e.target.value })
                  }
                >
                  <option value="">Sem categoria</option>
                  {categories.map((c: AppCategory) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="auth-label">
                Próximo vencimento
                <input
                  type="date"
                  value={recForm.nextDue}
                  onChange={(e) =>
                    setRecForm({ ...recForm, nextDue: e.target.value })
                  }
                />
              </label>
              <label className="auth-label">
                Frequência
                <select
                  value={recForm.recurrence}
                  onChange={(e) =>
                    setRecForm({ ...recForm, recurrence: e.target.value })
                  }
                >
                  <option value="monthly">Mensal</option>
                  <option value="weekly">Semanal</option>
                  <option value="yearly">Anual</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="outline-button"
                onClick={() => setRecurringModal(false)}
              >
                Cancelar
              </button>
              <button className="dark-button" onClick={saveRecurring}>
                Salvar
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
function Metric({ label, value, tone }: any) {
  return (
    <div className={`metric ${tone}`}>
      <small>{label}</small>
      <strong>R$ {Number(value).toFixed(2).replace(".", ",")}</strong>
    </div>
  );
}

function MessagesView({
  messages,
  familyId,
  session,
  refresh,
  composer,
  setComposer,
  flash,
  confirm,
}: any) {
  async function send() {
    if (!composer.trim()) return flash("Escreva uma mensagem.");
    try {
      const message = await createMessage(familyId, session.user.id, composer);
      void sendEmailNotification("Nova mensagem", message.body, `message-created:${message.id}`);
      setComposer("");
      await refresh();
    } catch (e: any) {
      flash(e.message);
    }
  }
  function remove(message: AppMessage) {
    if (message.authorId !== session.user.id) return;
    confirm("Excluir esta mensagem?", async () => {
      await deleteMessage(message.id);
      await refresh();
      flash("Mensagem excluída.");
    });
  }
  return (
    <>
      <Header eyebrow="MENSAGENS" title="Conversem no ritmo da família." />
      <section className="panel chat-card">
        <div className="messages">
          {messages.length ? (
            messages.map((message: AppMessage) => (
              <div
                className={`message ${message.authorId === session.user.id ? "mine" : "other"}`}
                key={message.id}
              >
                <small>
                  {new Date(message.createdAt).toLocaleString("pt-BR")}
                </small>
                {message.body}
                {message.authorId === session.user.id && (
                  <button
                    className="more-button"
                    onClick={() => remove(message)}
                    aria-label="Excluir mensagem"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          ) : (
            <Empty
              title="Nenhuma mensagem ainda"
              detail="Envie o primeiro recado para sua família."
            />
          )}
        </div>
        <div className="message-input">
          <input
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Escreva uma mensagem..."
          />
          <button onClick={send}>Enviar</button>
        </div>
      </section>
    </>
  );
}

function DocumentsView({
  documents,
  familyId,
  session,
  refresh,
  flash,
  confirm,
}: any) {
  const [busy, setBusy] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    doc: AppDocument;
    url: string;
  } | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let mounted = true;
    Promise.all(
      documents.map(
        async (doc: AppDocument) =>
          [doc.id, await getDocumentUrl(doc.storagePath)] as const,
      ),
    )
      .then((entries) => {
        if (mounted) setPreviewUrls(Object.fromEntries(entries));
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [documents]);
  async function saveUpload() {
    if (!name.trim()) return flash("Dê um nome ao documento.");
    if (!selectedFile) return flash("Escolha um arquivo.");
    setBusy(true);
    try {
      await uploadDocument(familyId, session.user.id, selectedFile, name);
      setName("");
      setSelectedFile(null);
      setUploadModal(false);
      await refresh();
      flash("Documento enviado com segurança.");
    } catch (e: any) {
      flash(e.message);
    } finally {
      setBusy(false);
    }
  }
  function cancelUpload() {
    if (busy) return;
    setName("");
    setSelectedFile(null);
    setUploadModal(false);
  }
  async function open(doc: AppDocument) {
    try {
      const url =
        previewUrls[doc.id] ?? (await getDocumentUrl(doc.storagePath));
      setPreview({ doc, url });
    } catch (e: any) {
      flash(e.message);
    }
  }
  function remove(doc: AppDocument) {
    confirm(`Excluir “${doc.originalName}”?`, async () => {
      await deleteDocument(doc.id, doc.storagePath);
      if (preview?.doc.id === doc.id) setPreview(null);
      await refresh();
      flash("Documento excluído.");
    });
  }
  return (
    <>
      <Header
        eyebrow="DOCUMENTOS"
        title="Documentos importantes, protegidos."
      />
      <div className="cards-grid">
        <button
          className="new-list-card"
          onClick={() => setUploadModal(true)}
          disabled={busy}
        >
          <span>＋</span>
          <strong>{busy ? "Enviando…" : "Adicionar documento"}</strong>
          <small>PDF, JPG, PNG ou HEIC · até 10 MB</small>
        </button>
        {documents.length ? (
          documents.map((doc: AppDocument) => (
            <section
              className="document-card"
              key={doc.id}
              onClick={() => open(doc)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && open(doc)}
            >
              <div className="document-thumbnail">
                {previewUrls[doc.id] ? (
                  doc.mimeType === "application/pdf" ? (
                    <iframe
                      title={`Prévia de ${doc.originalName}`}
                      src={`${previewUrls[doc.id]}#page=1&view=FitH`}
                      tabIndex={-1}
                    />
                  ) : (
                    <img src={previewUrls[doc.id]} alt="" />
                  )
                ) : (
                  <span className="doc-icon">▤</span>
                )}
              </div>
              <strong title={doc.originalName}>{doc.originalName}</strong>
              <small>
                {(doc.sizeBytes / 1024).toFixed(0)} KB ·{" "}
                {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
              </small>
              <button
                className="more-button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(doc);
                }}
                aria-label={`Excluir ${doc.originalName}`}
              >
                ×
              </button>
            </section>
          ))
        ) : (
          <Empty
            title="Nenhum documento ainda"
            detail="Envie um documento para sua família."
          />
        )}
      </div>
      {uploadModal && (
        <div className="modal-backdrop" onClick={cancelUpload}>
          <section
            className="upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-header">
              <div>
                <p className="eyebrow">NOVO DOCUMENTO</p>
                <h2 id="upload-title">Adicionar documento</h2>
              </div>
              <button
                className="more-button"
                onClick={cancelUpload}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <label className="auth-label">
              Nome do arquivo
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Contrato do apartamento"
              />
            </label>
            <label className="file-picker">
              <span>
                {selectedFile ? selectedFile.name : "Escolher arquivo"}
              </span>
              <small>
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(0)} KB`
                  : "PDF, JPG, PNG ou HEIC · até 10 MB"}
              </small>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/heic"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="modal-actions">
              <button
                className="outline-button"
                disabled={busy}
                onClick={cancelUpload}
              >
                Cancelar
              </button>
              <button
                className="dark-button"
                disabled={busy}
                onClick={saveUpload}
              >
                {busy ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </section>
        </div>
      )}
      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(null)}>
          <section
            className="document-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label={preview.doc.originalName}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-header">
              <strong>{preview.doc.originalName}</strong>
              <button
                className="more-button"
                onClick={() => setPreview(null)}
                aria-label="Fechar visualização"
              >
                ×
              </button>
            </div>
            {preview.doc.mimeType === "application/pdf" ? (
              <iframe title={preview.doc.originalName} src={preview.url} />
            ) : (
              <img src={preview.url} alt={preview.doc.originalName} />
            )}
          </section>
        </div>
      )}
    </>
  );
}

function FamilyView({
  familyName,
  members,
  familyId,
  session,
  flash,
  refresh,
  confirm,
}: any) {
  const [email, setEmail] = useState("");
  const [roleMember, setRoleMember] = useState<AppMember | null>(null);
  const [role, setRole] = useState("adult");
  const canManageMembers = ["owner", "admin"].includes(
    members.find((member: AppMember) => member.userId === session.user.id)
      ?.role,
  );
  async function invite() {
    if (!email.trim()) return;
    try {
      const token = await createFamilyInvite(familyId, email);
      await navigator.clipboard?.writeText(
        `${window.location.origin}/?invite=${token}`,
      );
      setEmail("");
      flash("Convite copiado.");
    } catch (e: any) {
      flash(e.message);
    }
  }
  function openRole(member: AppMember) {
    setRoleMember(member);
    setRole(member.role === "owner" ? "adult" : member.role);
  }
  async function saveRole() {
    if (!roleMember) return;
    try {
      await updateFamilyMemberRole(familyId, roleMember.userId, role);
      setRoleMember(null);
      await refresh();
      flash("Permissão atualizada.");
    } catch (e: any) {
      flash(e.message);
    }
  }
  function removeMember(member: AppMember) {
    confirm(`Remover “${member.displayName}” da família?`, async () => {
      try {
        await removeFamilyMember(familyId, member.userId);
        await refresh();
        flash("Membro removido.");
      } catch (e: any) {
        flash(e.message);
      }
    });
  }
  return (
    <>
      <Header eyebrow="FAMÍLIA" title={familyName} />
      <section className="panel">
        {canManageMembers && (
          <div className="input-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail para convidar"
            />
            <button className="dark-button" onClick={invite}>
              Convidar
            </button>
          </div>
        )}
        {members.length ? (
          members.map((member: AppMember) => (
            <div className="member-table-row" key={member.userId}>
              <span className="member-cell">
                <span
                  className="member-avatar"
                  style={{ background: "#8ec0a7" }}
                >
                  {member.displayName.slice(0, 2).toUpperCase()}
                </span>
                <b>{member.displayName}</b>
              </span>
              <span className="member-role-actions">
                <span className="access-pill">
                  {memberRoleLabel(member.role)}
                </span>
                {canManageMembers && member.role !== "owner" && (
                  <>
                    <button
                      className="text-button"
                      onClick={() => openRole(member)}
                    >
                      Permissão
                    </button>
                    <button
                      className="member-remove"
                      onClick={() => removeMember(member)}
                    >
                      Remover
                    </button>
                  </>
                )}
              </span>
            </div>
          ))
        ) : (
          <Empty
            title="Nenhum membro encontrado"
            detail="Convide pessoas para participar da família."
          />
        )}
      </section>
      {roleMember && (
        <div className="modal-backdrop" onClick={() => setRoleMember(null)}>
          <section
            className="finance-modal member-role-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-header">
              <div>
                <p className="eyebrow">PERMISSÕES</p>
                <h2>{roleMember.displayName}</h2>
              </div>
              <button
                className="more-button"
                onClick={() => setRoleMember(null)}
              >
                ×
              </button>
            </div>
            <label className="auth-label">
              Nível de acesso
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="admin">Administrador</option>
                <option value="adult">Adulto</option>
                <option value="teen">Adolescente</option>
                <option value="child">Criança</option>
                <option value="caregiver">Cuidador</option>
                <option value="guest">Convidado</option>
              </select>
            </label>
            <p className="setup-note">
              Crianças e convidados não acessam o financeiro por padrão.
            </p>
            <div className="modal-actions">
              <button
                className="outline-button"
                onClick={() => setRoleMember(null)}
              >
                Cancelar
              </button>
              <button className="dark-button" onClick={saveRole}>
                Salvar
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function FamilyRecordsView({
  kind,
  meals,
  routines,
  birthdays,
  familyId,
  session,
  refresh,
  flash,
  confirm,
}: any) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const records =
    kind === "meals" ? meals : kind === "routines" ? routines : birthdays;
  const title =
    kind === "meals"
      ? "Planeje as refeições da família."
      : kind === "routines"
        ? "Rotinas que deixam a casa mais leve."
        : "Datas importantes da família.";
  async function add() {
    if (!first.trim() || !second)
      return flash("Preencha os campos antes de adicionar.");
    try {
      if (kind === "meals")
        await createMeal(familyId, session.user.id, second, first);
      else if (kind === "routines")
        await createRoutine(familyId, session.user.id, first, second);
      else await createBirthday(familyId, session.user.id, first, second);
      setFirst("");
      setSecond("");
      await refresh();
      flash("Registro salvo.");
    } catch (e: any) {
      flash(e.message);
    }
  }
  function remove(record: AppMeal | AppRoutine | AppBirthday) {
    const label = "title" in record ? record.title : record.name;
    confirm(`Excluir “${label}”?`, async () => {
      if (kind === "meals") await deleteMeal(record.id);
      else if (kind === "routines") await deleteRoutine(record.id);
      else await deleteBirthday(record.id);
      await refresh();
      flash("Registro excluído.");
    });
  }
  return (
    <>
      <Header eyebrow={kind.toUpperCase()} title={title} />
      <section className="panel">
        <div className="input-row">
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder={kind === "birthdays" ? "Nome" : "Título"}
          />
          <input
            type={kind === "birthdays" || kind === "meals" ? "date" : "text"}
            value={second}
            onChange={(e) => setSecond(e.target.value)}
            placeholder={
              kind === "routines" ? "Horário ou frequência" : undefined
            }
          />
          <button className="dark-button" onClick={add}>
            Adicionar
          </button>
        </div>
        {records.length ? (
          records.map((record: AppMeal | AppRoutine | AppBirthday) => (
            <div className="event-action-row" key={record.id}>
              <div className="event-row">
                <div className="event-title">
                  <strong>
                    {"title" in record ? record.title : record.name}
                  </strong>
                  <small>
                    {"mealDate" in record
                      ? new Date(record.mealDate).toLocaleDateString("pt-BR")
                      : "schedule" in record
                        ? record.schedule
                        : formatDateOnly(record.birthday)}
                  </small>
                </div>
              </div>
              <button
                className="more-button"
                onClick={() => remove(record)}
                aria-label="Excluir registro"
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <Empty
            title="Nenhum registro ainda"
            detail="Adicione o primeiro item real da família."
          />
        )}
      </section>
    </>
  );
}
function LocationView({ flash }: any) {
  const [status, setStatus] = useState("Localização não compartilhada");
  function share() {
    if (!navigator.geolocation)
      return flash("Seu navegador não oferece geolocalização.");
    navigator.geolocation.getCurrentPosition(
      () => setStatus("Localização autorizada neste aparelho"),
      () => flash("Permissão de localização recusada."),
    );
  }
  return (
    <>
      <Header eyebrow="LOCALIZAÇÃO" title="Cuidado, com consentimento." />
      <section className="panel location-side">
        <h2>Compartilhe somente quando fizer sentido.</h2>
        <p className="body-copy">
          O Ninho pede permissão ao aparelho e não exibe pessoas ou locais
          fictícios.
        </p>
        <p className="empty-copy">{status}</p>
        <button className="dark-button" onClick={share}>
          Permitir localização
        </button>
      </section>
    </>
  );
}
function SettingsView({ session, flash }: any) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);
    setBusy(false);
    flash(error ? error.message : "Perfil atualizado.");
  }
  return (
    <>
      <Header eyebrow="CONFIGURAÇÕES" title="Seu Ninho, do seu jeito." />
      <section className="panel">
        <label className="auth-label">
          Nome de exibição
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como sua família deve chamar você?"
          />
        </label>
        <button className="dark-button" disabled={busy} onClick={save}>
          {busy ? "Salvando…" : "Salvar perfil"}
        </button>
      </section>
    </>
  );
}
