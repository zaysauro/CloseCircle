"use client";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
} from "react";
import {
  Home,
  Users,
  MessageCircle,
  CalendarDays,
  Bell,
  UserRound,
  Plus,
  LockKeyhole,
  ArrowUpRight,
  ImagePlus,
  Send,
  Trash2,
  Check,
  Copy,
  Heart,
  LogOut,
  X,
  RefreshCw,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AccountRecovery } from "@/components/account-recovery";
type Circle = { id: string; name: string; description: string; role: string };
type Profile = { id: string; name: string; handle: string; bio: string };
type Post = {
  id: string;
  circle_id: string;
  circle_name: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  comment_count: number;
  attachments: string[];
  reactions: { emoji: string; user_id: string }[];
};
type Comment = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
};
type Member = { id: string; name: string; handle: string; role: string };
type Event = {
  id: string;
  circle_name: string;
  title: string;
  description: string;
  starts_at: string;
  creator_id: string;
};
type Conversation = { id: string; name: string; circle_id: string | null };
type Message = {
  id: string;
  name: string;
  body: string;
  sender_id: string;
  created_at: string;
};
type Friend = {
  id: string;
  name: string;
  handle: string;
  status: string;
  requester_id: string;
  addressee_id: string;
};
type Notice = {
  id: string;
  kind: string;
  body: string;
  read: boolean;
  created_at: string;
};
type Invite = {
  id: string;
  expires_at: string;
  used_at: string | null;
  revoked: boolean;
};
const tabs = [
  { id: "feed", label: "Feed geral", icon: Home },
  { id: "circles", label: "Círculos", icon: Users },
  { id: "messages", label: "Mensagens", icon: MessageCircle },
  { id: "events", label: "Calendário", icon: CalendarDays },
  { id: "friends", label: "Amigos", icon: Heart },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "profile", label: "Meu perfil", icon: UserRound },
];
async function api<T>(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok) throw Error(j.error || "Não foi possível continuar");
  return j;
}
const date = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const initials = (s: string) =>
  s
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
export function SocialApp({ meId, email }: { meId: string; email: string }) {
  const [tab, setTab] = useState("feed"),
    [circles, setCircles] = useState<Circle[]>([]),
    [selected, setSelected] = useState(""),
    [feedCircle, setFeedCircle] = useState(""),
    [nextCursor, setNextCursor] = useState<string | null>(null),
    [feedLoading, setFeedLoading] = useState(false),
    [moreLoading, setMoreLoading] = useState(false),
    [recoveryConfigured, setRecoveryConfigured] = useState<boolean | null>(
      null,
    ),
    [profile, setProfile] = useState<Profile>({
      id: meId,
      name: "",
      handle: "",
      bio: "",
    }),
    [posts, setPosts] = useState<Post[]>([]),
    [members, setMembers] = useState<Member[]>([]),
    [events, setEvents] = useState<Event[]>([]),
    [friends, setFriends] = useState<Friend[]>([]),
    [notices, setNotices] = useState<Notice[]>([]),
    [conversations, setConversations] = useState<Conversation[]>([]),
    [conversation, setConversation] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [body, setBody] = useState(""),
    [image, setImage] = useState(""),
    [newCircle, setNewCircle] = useState(false),
    [inviteLink, setInviteLink] = useState(""),
    [joinToken, setJoinToken] = useState("");
  const fileRef = useRef<HTMLInputElement>(null),
    messageEnd = useRef<HTMLDivElement>(null),
    postRequest = useRef(0),
    messageRequest = useRef(0);
  const current = circles.find((c) => c.id === selected);
  const refresh = useCallback(async () => {
    const [c, p, e, n, f, co] = await Promise.all([
      api<{ circles: Circle[] }>("/api/circles"),
      api<{ profile: Profile }>("/api/social?resource=profile"),
      api<{ events: Event[] }>("/api/social?resource=events"),
      api<{ notifications: Notice[] }>("/api/social?resource=notifications"),
      api<{ friends: Friend[] }>("/api/social?resource=friends"),
      api<{ conversations: Conversation[] }>(
        "/api/social?resource=conversations",
      ),
    ]);
    setCircles(c.circles);
    setSelected((old) =>
      c.circles.some((x) => x.id === old) ? old : c.circles[0]?.id || "",
    );
    setProfile(p.profile);
    setEvents(e.events);
    setNotices(n.notifications);
    setFriends(f.friends);
    setConversations(co.conversations);
  }, []);
  const loadFeedPage = useCallback(
    async (cursor: string | null = null) => {
      const request = ++postRequest.current;
      if (cursor) setMoreLoading(true);
      else setFeedLoading(true);
      try {
        const params = new URLSearchParams();
        if (feedCircle) params.set("circleId", feedCircle);
        if (cursor) params.set("cursor", cursor);
        const result = await api<{ posts: Post[]; nextCursor: string | null }>(
          "/api/posts" + (params.size ? "?" + params.toString() : ""),
        );
        if (request !== postRequest.current) return;
        setPosts((old) =>
          cursor
            ? [
                ...old,
                ...result.posts.filter((p) => !old.some((x) => x.id === p.id)),
              ]
            : result.posts,
        );
        setNextCursor(result.nextCursor);
      } finally {
        if (request === postRequest.current) {
          setFeedLoading(false);
          setMoreLoading(false);
        }
      }
    },
    [feedCircle],
  );
  const loadPosts = useCallback(() => loadFeedPage(), [loadFeedPage]);
  const loadMembers = useCallback(async () => {
    if (!selected) {
      setMembers([]);
      return;
    }
    const result = await api<{ members: Member[] }>(
      "/api/social?resource=members&circleId=" + selected,
    );
    return result.members;
  }, [selected]);
  const loadMessages = useCallback(async () => {
    const request = ++messageRequest.current;
    if (!conversation) {
      setMessages([]);
      return;
    }
    const result = await api<{ messages: Message[] }>(
      "/api/social?resource=messages&conversationId=" + conversation,
    );
    if (request === messageRequest.current) setMessages(result.messages);
  }, [conversation]);
  useEffect(() => {
    let active = true;
    api<{ configured: boolean }>("/api/account/recovery")
      .then((r) => {
        if (active) setRecoveryConfigured(r.configured);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [tab]);
  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const token = new URLSearchParams(window.location.search).get("convite");
    if (token) {
      setJoinToken(token);
      setTab("circles");
      window.history.replaceState(null, "", "/app");
    }
  }, [refresh]);
  useEffect(() => {
    setPosts([]);
    setNextCursor(null);
    loadPosts().catch((e) => setError(e.message));
    return () => {
      ++postRequest.current;
    };
  }, [loadPosts]);
  useEffect(() => {
    let active = true;
    setMembers([]);
    setInviteLink("");
    loadMembers()
      .then((result) => {
        if (active && result) setMembers(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [loadMembers]);
  useEffect(() => {
    if (feedCircle && !circles.some((c) => c.id === feedCircle))
      setFeedCircle("");
  }, [circles, feedCircle]);
  useEffect(() => {
    let active = true;
    const update = () =>
      loadMessages().catch((e) => {
        if (active) setError(e.message);
      });
    setMessages([]);
    update();
    if (tab !== "messages" || !conversation) return;
    const id = setInterval(update, 8000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [loadMessages, tab, conversation]);
  useEffect(() => {
    messageEnd.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages.length]);
  useEffect(() => {
    if (tab === "circles" && current?.role === "owner")
      api<{ invites: Invite[] }>(
        "/api/social?resource=invites&circleId=" + selected,
      )
        .then((j) => setInvites(j.invites))
        .catch((e) => setError(e.message));
    else setInvites([]);
  }, [tab, selected, current?.role, status]);
  async function run(work: () => Promise<void>, success = "") {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await work();
      setStatus(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível continuar");
    } finally {
      setBusy(false);
    }
  }
  async function action(data: unknown) {
    return api<Record<string, string>>("/api/social", data);
  }
  async function createCircle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run(async () => {
      const j = await api<{ circle: Circle }>("/api/circles", {
        name: f.get("name"),
        description: f.get("description"),
      });
      await refresh();
      setSelected(j.circle.id);
      setFeedCircle("");
      await loadPosts();
      setNewCircle(false);
      setTab("feed");
    }, "Seu círculo está pronto. Você já pode publicar e adicionar seus amigos.");
  }
  async function publish(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      await api("/api/posts", {
        circleId: selected,
        body,
        image: image || undefined,
      });
      setBody("");
      setImage("");
      if (fileRef.current) fileRef.current.value = "";
      await loadPosts();
    }, "Momento compartilhado com seu círculo.");
  }
  async function pickImage(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Escolha uma foto de até 2 MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use PNG, JPEG ou WebP");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }
  async function chat(circleId?: string, userId?: string) {
    await run(async () => {
      const j = await action({ action: "conversation", circleId, userId });
      await refresh();
      setConversation(j.id);
      setTab("messages");
    });
  }
  async function join(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const token = joinToken.includes("convite=")
        ? new URL(joinToken).searchParams.get("convite")
        : joinToken.trim();
      const j = await action({ action: "join", token });
      await refresh();
      setSelected(j.circleId);
      setFeedCircle("");
      await loadPosts();
      setJoinToken("");
      setTab("feed");
    }, "Você entrou no círculo.");
  }
  function nav(id: string) {
    if (id === "feed") setFeedCircle("");
    setTab(id);
    setError("");
    setStatus("");
  }
  const unread = notices.filter((n) => !n.read).length;
  return (
    <div className="cc-shell">
      <aside className="cc-sidebar">
        <a href="/app" className="cc-brand">
          <span>◎</span> CloseCircle<span className="cc-dot">.</span>
        </a>
        <p className="cc-eyebrow">SEU PEQUENO UNIVERSO</p>
        <nav>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => nav(id)}
              className={tab === id ? "active" : ""}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "notifications" && unread > 0 && <b>{unread}</b>}
            </button>
          ))}
        </nav>
        <div className="cc-side-circles">
          <div className="cc-section-label">
            MEUS CÍRCULOS{" "}
            <button
              aria-label="Criar círculo"
              onClick={() => setNewCircle(true)}
            >
              <Plus size={16} />
            </button>
          </div>
          {circles.map((c, i) => (
            <button
              key={c.id}
              className={selected === c.id ? "selected" : ""}
              onClick={() => {
                setSelected(c.id);
                setFeedCircle(c.id);
                setTab("feed");
              }}
            >
              <span className={"cc-circle-icon color-" + (i % 4)}>
                {c.name[0].toUpperCase()}
              </span>
              {c.name}
              <LockKeyhole size={12} />
            </button>
          ))}
          {!loading && !circles.length && (
            <p className="cc-muted text-sm">
              Seu primeiro círculo começa com você.
            </p>
          )}
        </div>
        <div className="cc-sidebar-bottom">
          <div className="cc-lock-note">
            <LockKeyhole size={15} />
            <span>
              Fechado para o mundo.
              <br />
              Aberto para os seus.
            </span>
          </div>
          <button className="cc-me" onClick={() => nav("profile")}>
            <span className="cc-avatar">{initials(profile.name) || "EU"}</span>
            <span>
              <strong>{profile.name || "Seu perfil"}</strong>
              <small>@{profile.handle}</small>
            </span>
          </button>
        </div>
      </aside>
      <div className="cc-workspace">
        <header className="cc-topbar">
          <a href="/app" className="cc-mobile-brand">
            ◎ CloseCircle
          </a>
          <span className="cc-desktop-label">
            <LockKeyhole size={13} /> Seu espaço privado
          </span>
          <div>
            <button
              title="Atualizar"
              aria-label="Atualizar"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await refresh();
                  await loadPosts();
                  const m = await loadMembers();
                  if (m) setMembers(m);
                  await loadMessages();
                })
              }
            >
              <RefreshCw size={17} />
            </button>
            <button
              aria-label="Notificações"
              onClick={() => nav("notifications")}
            >
              <Bell size={18} />
              {unread > 0 && <i />}
            </button>
            <span className="cc-avatar small" title={profile.name}>
              {initials(profile.name)}
            </span>
          </div>
        </header>
        <div className="cc-columns">
          <main className="cc-main">
            <div className="cc-page-heading">
              <div>
                <p className="cc-eyebrow">MENOS EXPOSIÇÃO. MAIS CONEXÃO.</p>
                <h1>
                  {tab === "feed"
                    ? feedCircle
                      ? circles.find((c) => c.id === feedCircle)?.name ||
                        "Seu círculo"
                      : "Seu mundo, em um só feed."
                    : tabs.find((t) => t.id === tab)?.label}
                </h1>
                <p>
                  {tab === "feed"
                    ? "Os momentos de todos os seus círculos, reunidos só para você."
                    : "Tudo acontece dentro do seu CloseCircle."}
                </p>
              </div>
              <button
                className="cc-icon-button"
                aria-label="Criar círculo"
                onClick={() => setNewCircle(true)}
              >
                <Plus size={22} />
              </button>
            </div>
            {error && (
              <div role="alert" className="cc-alert error">
                {error}
                <button aria-label="Fechar erro" onClick={() => setError("")}>
                  <X size={16} />
                </button>
              </div>
            )}
            {status && (
              <div role="status" className="cc-alert success">
                {status}
              </div>
            )}
            {loading ? (
              <div className="cc-card cc-empty">
                Abrindo seu espaço privado…
              </div>
            ) : (
              <>
                {tab === "feed" && (
                  <>
                    <div className="cc-circle-tabs">
                      <button
                        className={!feedCircle ? "active" : ""}
                        onClick={() => setFeedCircle("")}
                      >
                        <Home size={13} /> Todos os círculos
                      </button>
                      {circles.map((c) => (
                        <button
                          className={feedCircle === c.id ? "active" : ""}
                          onClick={() => {
                            setFeedCircle(c.id);
                            setSelected(c.id);
                          }}
                          key={c.id}
                        >
                          <LockKeyhole size={12} />
                          {c.name}
                        </button>
                      ))}
                      <button onClick={() => setNewCircle(true)}>
                        <Plus size={14} /> Novo círculo
                      </button>
                    </div>
                    {recoveryConfigured === false && (
                      <div className="cc-card cc-recovery-banner">
                        <div>
                          <strong>Uma conta só sua, protegida por você.</strong>
                          <p>
                            Guarde sua chave de recuperação para redefinir a
                            senha mesmo sem receber e-mails.
                          </p>
                        </div>
                        <button
                          className="cc-secondary"
                          onClick={() => nav("profile")}
                        >
                          Proteger minha conta
                        </button>
                      </div>
                    )}
                    {current ? (
                      <>
                        <form
                          onSubmit={publish}
                          className="cc-card cc-composer"
                        >
                          <label className="cc-publish-destination">
                            Compartilhar em
                            <select
                              aria-label="Círculo da publicação"
                              value={selected}
                              onChange={(e) => setSelected(e.target.value)}
                            >
                              {circles.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <LockKeyhole size={13} />
                            <span>Somente integrantes</span>
                          </label>
                          <div className="flex gap-3">
                            <span className="cc-avatar">
                              {initials(profile.name)}
                            </span>
                            <textarea
                              aria-label="Sua publicação"
                              rows={3}
                              maxLength={5000}
                              value={body}
                              onChange={(e) => setBody(e.target.value)}
                              placeholder={
                                "O que você quer dividir com " +
                                current.name +
                                "?"
                              }
                            />
                          </div>
                          {image && (
                            <div className="cc-image-preview">
                              <img src={image} alt="Prévia da foto" />
                              <button
                                type="button"
                                aria-label="Remover foto"
                                onClick={() => setImage("")}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                          <footer>
                            <label className="cc-photo-button">
                              <ImagePlus size={17} /> Foto
                              <input
                                ref={fileRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(e) => pickImage(e.target.files?.[0])}
                              />
                            </label>
                            <span className="cc-private-label">
                              <LockKeyhole size={12} /> Só neste círculo
                            </span>
                            <button
                              className="cc-primary"
                              disabled={busy || (!body.trim() && !image)}
                            >
                              Compartilhar <ArrowUpRight size={15} />
                            </button>
                          </footer>
                        </form>
                        <div className="cc-feed-label">
                          <span>
                            {feedCircle ? "NESTE CÍRCULO" : "NO SEU FEED GERAL"}
                          </span>
                          <span>Mais recentes</span>
                        </div>
                        {feedLoading ? (
                          <div className="cc-card cc-empty" role="status">
                            Reunindo os momentos dos seus círculos…
                          </div>
                        ) : posts.length ? (
                          posts.map((p) => (
                            <PostCard
                              key={p.id}
                              post={p}
                              meId={meId}
                              circleName={p.circle_name}
                              busy={busy}
                              run={run}
                              reload={loadPosts}
                            />
                          ))
                        ) : (
                          <div className="cc-card cc-empty">
                            <span>✦</span>
                            <h2>As melhores histórias começam aqui.</h2>
                            <p>
                              {feedCircle
                                ? "Compartilhe o primeiro momento deste círculo."
                                : "Publique seu primeiro momento ou adicione amigos aos seus círculos. As novidades deles aparecerão aqui."}
                            </p>
                          </div>
                        )}
                        {nextCursor && (
                          <button
                            className="cc-secondary cc-load-more"
                            disabled={busy || moreLoading}
                            onClick={() => run(() => loadFeedPage(nextCursor))}
                          >
                            {moreLoading ? "Carregando…" : "Ver mais momentos"}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="cc-card cc-empty">
                        <span>◎</span>
                        <h2>Um lugar para as suas pessoas.</h2>
                        <p>
                          Crie seu primeiro círculo agora, sem convite, e comece
                          a compartilhar com seus amigos.
                        </p>
                        <button
                          className="cc-primary"
                          onClick={() => setNewCircle(true)}
                        >
                          Criar meu círculo
                        </button>
                        <button
                          className="cc-secondary"
                          onClick={() => nav("circles")}
                        >
                          Tenho um convite
                        </button>
                      </div>
                    )}
                  </>
                )}
                {tab === "circles" && (
                  <>
                    <div className="cc-card cc-form">
                      <h2>Seus grupos, do seu jeito.</h2>
                      <p>
                        Crie um círculo e adicione amigos pelo @. Cada grupo tem
                        publicações e conversas privadas.
                      </p>
                      <button
                        className="cc-primary"
                        onClick={() => setNewCircle(true)}
                      >
                        <Plus size={15} /> Criar um círculo
                      </button>
                      <button
                        className="cc-secondary"
                        onClick={() => nav("friends")}
                      >
                        Encontrar um amigo pelo @
                      </button>
                    </div>
                    <details
                      className="cc-card"
                      open={joinToken ? true : undefined}
                    >
                      <summary>Tenho um link de convite (opcional)</summary>
                      <form onSubmit={join} className="cc-form mt-4">
                        <h2>Recebeu um convite?</h2>
                        <p>Cole o link ou código para entrar no círculo.</p>
                        <label>
                          Convite
                          <input
                            required
                            value={joinToken}
                            onChange={(e) => setJoinToken(e.target.value)}
                            placeholder="Link ou código do convite"
                          />
                        </label>
                        <button className="cc-primary" disabled={busy}>
                          Entrar no círculo
                        </button>
                      </form>
                    </details>
                    <div className="cc-circle-tabs">
                      {circles.map((c) => (
                        <button
                          key={c.id}
                          className={c.id === selected ? "active" : ""}
                          onClick={() => setSelected(c.id)}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                    {current && (
                      <div className="cc-card cc-form">
                        <div className="cc-split">
                          <h2>{current.name}</h2>
                          <LockKeyhole size={18} />
                        </div>
                        <p>
                          {current.description ||
                            "Um espaço reservado às suas pessoas."}
                        </p>
                        <div className="cc-split">
                          <span>
                            {members.length} integrante
                            {members.length !== 1 ? "s" : ""}
                          </span>
                          <button
                            className="cc-secondary"
                            disabled={busy}
                            onClick={() => chat(selected)}
                          >
                            Conversar com o grupo
                          </button>
                        </div>
                        {current.role === "owner" ? (
                          <>
                            <form
                              className="cc-form cc-add-member"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.currentTarget,
                                  f = new FormData(form);
                                run(async () => {
                                  await action({
                                    action: "add-member",
                                    circleId: selected,
                                    handle: f.get("handle"),
                                  });
                                  form.reset();
                                  const m = await loadMembers();
                                  if (m) setMembers(m);
                                  await refresh();
                                }, "Amigo adicionado ao círculo, sem convite.");
                              }}
                            >
                              <label>
                                Adicionar amigo ao círculo
                                <input
                                  name="handle"
                                  required
                                  maxLength={41}
                                  placeholder="@identificador do amigo"
                                  list="cc-circle-friends"
                                />
                              </label>
                              <datalist id="cc-circle-friends">
                                {friends
                                  .filter(
                                    (f) =>
                                      f.status === "accepted" &&
                                      !members.some((m) => m.id === f.id),
                                  )
                                  .map((f) => (
                                    <option value={f.handle} key={f.id}>
                                      {f.name}
                                    </option>
                                  ))}
                              </datalist>
                              <small className="cc-muted">
                                A amizade precisa estar aceita na aba Amigos.
                                Quem entrar verá as publicações e conversas
                                deste círculo.
                              </small>
                              <button className="cc-primary" disabled={busy}>
                                Adicionar ao círculo
                              </button>
                            </form>
                            <button
                              className="cc-secondary"
                              disabled={busy}
                              onClick={() =>
                                run(async () => {
                                  const j = await action({
                                    action: "invite",
                                    circleId: selected,
                                  });
                                  setInviteLink(
                                    window.location.origin +
                                      "/entrar?convite=" +
                                      j.token,
                                  );
                                }, "Convite criado: uso único, válido por 7 dias.")
                              }
                            >
                              Criar convite privado <Plus size={16} />
                            </button>
                            {inviteLink && (
                              <div className="cc-invite-link">
                                <input
                                  aria-label="Link de convite"
                                  readOnly
                                  value={inviteLink}
                                />
                                <button
                                  aria-label="Copiar convite"
                                  onClick={() =>
                                    run(async () => {
                                      await navigator.clipboard.writeText(
                                        inviteLink,
                                      );
                                    }, "Convite copiado.")
                                  }
                                >
                                  <Copy size={17} />
                                </button>
                              </div>
                            )}
                            <small className="cc-muted">
                              Compartilhe o link apenas com quem você quer por
                              perto.
                            </small>
                          </>
                        ) : (
                          <button
                            className="cc-secondary"
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Sair deste círculo? Você perderá acesso ao conteúdo.",
                                )
                              )
                                run(async () => {
                                  await action({
                                    action: "leave",
                                    circleId: selected,
                                  });
                                  await refresh();
                                });
                            }}
                          >
                            Sair do círculo
                          </button>
                        )}
                        {members.map((m) => (
                          <div className="cc-person" key={m.id}>
                            <span className="cc-avatar small">
                              {initials(m.name)}
                            </span>
                            <div>
                              <strong>{m.name}</strong>
                              <small>
                                @{m.handle} ·{" "}
                                {m.role === "owner"
                                  ? "Responsável"
                                  : "Integrante"}
                              </small>
                            </div>
                            {current.role === "owner" && m.id !== meId && (
                              <button
                                className="cc-danger"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Remover " + m.name + " do círculo?",
                                    )
                                  )
                                    run(async () => {
                                      await action({
                                        action: "remove-member",
                                        circleId: selected,
                                        userId: m.id,
                                      });
                                      const updatedMembers =
                                        await loadMembers();
                                      if (updatedMembers)
                                        setMembers(updatedMembers);
                                      await loadPosts();
                                    });
                                }}
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        ))}
                        {invites.length > 0 && (
                          <div>
                            <h3>Convites emitidos</h3>
                            {invites.map((i) => (
                              <div className="cc-person" key={i.id}>
                                <small>
                                  {i.used_at
                                    ? "Utilizado"
                                    : i.revoked
                                      ? "Revogado"
                                      : new Date(i.expires_at) < new Date()
                                        ? "Expirado"
                                        : "Válido até " + date(i.expires_at)}
                                </small>
                                {!i.used_at && !i.revoked && (
                                  <button
                                    disabled={busy}
                                    onClick={() =>
                                      run(async () => {
                                        await action({
                                          action: "revoke-invite",
                                          id: i.id,
                                        });
                                      }, "Convite revogado.")
                                    }
                                  >
                                    Revogar
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {tab === "events" && (
                  <>
                    <form
                      className="cc-card cc-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget,
                          f = new FormData(form);
                        run(async () => {
                          await action({
                            action: "event",
                            circleId: f.get("circleId"),
                            title: f.get("title"),
                            description: f.get("description"),
                            startsAt: new Date(
                              String(f.get("startsAt")),
                            ).toISOString(),
                          });
                          form.reset();
                          await refresh();
                        }, "Plano adicionado ao calendário.");
                      }}
                    >
                      <h2>Vamos fazer planos?</h2>
                      <label>
                        Círculo
                        <select
                          name="circleId"
                          required
                          defaultValue={selected}
                        >
                          {circles.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        O que vamos fazer?
                        <input
                          required
                          name="title"
                          maxLength={120}
                          placeholder="Um café, um jantar, uma viagem…"
                        />
                      </label>
                      <label>
                        Quando?
                        <input name="startsAt" type="datetime-local" required />
                      </label>
                      <label>
                        Detalhes
                        <textarea
                          name="description"
                          maxLength={2000}
                          rows={2}
                        />
                      </label>
                      <button
                        className="cc-primary"
                        disabled={busy || !circles.length}
                      >
                        Adicionar ao calendário
                      </button>
                    </form>
                    {events.length ? (
                      events.map((e) => (
                        <article className="cc-card cc-event" key={e.id}>
                          <div className="cc-event-date">
                            {new Date(e.starts_at).getDate()}
                            <small>
                              {new Date(e.starts_at).toLocaleString("pt-BR", {
                                month: "short",
                              })}
                            </small>
                          </div>
                          <div>
                            <small>
                              {e.circle_name} · {date(e.starts_at)}
                            </small>
                            <h2>{e.title}</h2>
                            <p>{e.description}</p>
                          </div>
                          {e.creator_id === meId && (
                            <button
                              aria-label="Excluir evento"
                              disabled={busy}
                              onClick={() => {
                                if (confirm("Excluir este evento?"))
                                  run(async () => {
                                    await action({
                                      action: "delete-event",
                                      id: e.id,
                                    });
                                    await refresh();
                                  });
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </article>
                      ))
                    ) : (
                      <div className="cc-card cc-empty">
                        <CalendarDays />
                        <h2>A agenda está aberta.</h2>
                        <p>Marque o próximo encontro do seu círculo.</p>
                      </div>
                    )}
                  </>
                )}
                {tab === "messages" && (
                  <>
                    <div className="cc-circle-tabs">
                      {circles.map((c) => (
                        <button
                          disabled={busy}
                          key={c.id}
                          onClick={() => chat(c.id)}
                        >
                          {c.name} <MessageCircle size={13} />
                        </button>
                      ))}
                    </div>
                    <div className="cc-card cc-chat">
                      <label>
                        Conversa
                        <select
                          value={conversation}
                          onChange={(e) => setConversation(e.target.value)}
                        >
                          <option value="">Escolha uma conversa</option>
                          {conversations.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="cc-message-list" aria-live="polite">
                        {messages.map((m) => (
                          <div
                            className={
                              "cc-bubble " +
                              (m.sender_id === meId ? "mine" : "")
                            }
                            key={m.id}
                          >
                            <strong>{m.name}</strong>
                            <p>{m.body}</p>
                            <small>{date(m.created_at)}</small>
                          </div>
                        ))}
                        {!messages.length && (
                          <p className="cc-muted cc-empty">
                            {conversation
                              ? "Comece a conversa."
                              : "Escolha um grupo acima ou inicie uma conversa na aba Amigos."}
                          </p>
                        )}
                        <div ref={messageEnd} />
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget,
                            f = new FormData(form);
                          run(async () => {
                            await action({
                              action: "message",
                              conversationId: conversation,
                              body: f.get("body"),
                            });
                            form.reset();
                            await loadMessages();
                          });
                        }}
                      >
                        <input
                          name="body"
                          aria-label="Mensagem"
                          required
                          maxLength={5000}
                          autoComplete="off"
                          placeholder="Escreva uma mensagem…"
                          disabled={!conversation}
                        />
                        <button
                          className="cc-primary"
                          disabled={busy || !conversation}
                          aria-label="Enviar mensagem"
                        >
                          <Send size={18} />
                        </button>
                      </form>
                      <small className="cc-muted">
                        Atualização automática a cada 8 segundos enquanto esta
                        conversa estiver aberta.
                      </small>
                    </div>
                  </>
                )}
                {tab === "friends" && (
                  <>
                    <form
                      className="cc-card cc-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget,
                          f = new FormData(form);
                        run(async () => {
                          await action({
                            action: "friend",
                            handle: f.get("handle"),
                          });
                          form.reset();
                          await refresh();
                        }, "Solicitação enviada.");
                      }}
                    >
                      <h2>Mais perto, pelo nome.</h2>
                      <div className="cc-invite-link">
                        <input
                          aria-label="Meu identificador"
                          readOnly
                          value={"@" + profile.handle}
                        />
                        <button
                          type="button"
                          className="cc-secondary"
                          onClick={() =>
                            run(async () => {
                              await navigator.clipboard.writeText(
                                "@" + profile.handle,
                              );
                            }, "Seu @ foi copiado. Compartilhe com seus amigos.")
                          }
                        >
                          Copiar meu @
                        </button>
                      </div>
                      <p>
                        Peça o @ de uma pessoa para adicioná-la. Não há uma
                        lista pública de usuários.
                      </p>
                      <label>
                        Identificador
                        <input
                          name="handle"
                          required
                          placeholder="@identificador"
                          maxLength={41}
                        />
                      </label>
                      <button className="cc-primary" disabled={busy}>
                        Enviar solicitação
                      </button>
                    </form>
                    <div className="cc-card">
                      {friends.length ? (
                        friends.map((f) => (
                          <div className="cc-person" key={f.id}>
                            <span className="cc-avatar">
                              {initials(f.name)}
                            </span>
                            <div>
                              <strong>{f.name}</strong>
                              <small>
                                @{f.handle} ·{" "}
                                {f.status === "accepted"
                                  ? "Amigos"
                                  : "Solicitação pendente"}
                              </small>
                            </div>
                            {f.status === "accepted" ? (
                              <button
                                aria-label={"Conversar com " + f.name}
                                disabled={busy}
                                onClick={() => chat(undefined, f.id)}
                              >
                                <MessageCircle size={18} />
                              </button>
                            ) : f.addressee_id === meId ? (
                              <button
                                className="cc-secondary"
                                disabled={busy}
                                onClick={() =>
                                  run(async () => {
                                    await action({
                                      action: "accept-friend",
                                      userId: f.id,
                                    });
                                    await refresh();
                                  })
                                }
                              >
                                Aceitar
                              </button>
                            ) : null}
                            <button
                              aria-label="Remover amizade ou solicitação"
                              disabled={busy}
                              onClick={() => {
                                if (confirm("Remover amizade ou solicitação?"))
                                  run(async () => {
                                    await action({
                                      action: "remove-friend",
                                      userId: f.id,
                                    });
                                    await refresh();
                                  });
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="cc-empty">
                          <Heart />
                          <p>Suas conexões vão aparecer aqui.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {tab === "notifications" && (
                  <div className="cc-card cc-form">
                    <div className="cc-split">
                      <h2>Seu círculo em dia</h2>
                      <button
                        disabled={busy}
                        className="cc-secondary"
                        onClick={() =>
                          run(async () => {
                            await action({ action: "read-notifications" });
                            await refresh();
                          })
                        }
                      >
                        <Check size={15} /> Marcar como lidas
                      </button>
                    </div>
                    {notices.length ? (
                      notices.map((n) => (
                        <div
                          className={"cc-notice " + (!n.read ? "unread" : "")}
                          key={n.id}
                        >
                          <Bell size={17} />
                          <div>
                            <p>{n.body}</p>
                            <small>{date(n.created_at)}</small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="cc-empty">
                        <Bell />
                        <p>Tudo tranquilo por aqui.</p>
                      </div>
                    )}
                  </div>
                )}
                {tab === "profile" && (
                  <>
                    <form
                      className="cc-card cc-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(async () => {
                          await action({ action: "profile", ...profile });
                          await refresh();
                        }, "Perfil atualizado.");
                      }}
                    >
                      <div className="cc-profile-heading">
                        <span className="cc-avatar large">
                          {initials(profile.name)}
                        </span>
                        <div>
                          <h2>Do seu jeito.</h2>
                          <p>Seu perfil aparece para as suas conexões.</p>
                        </div>
                      </div>
                      <label>
                        Nome
                        <input
                          required
                          maxLength={100}
                          value={profile.name}
                          onChange={(e) =>
                            setProfile({ ...profile, name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Seu @
                        <input
                          required
                          minLength={3}
                          maxLength={40}
                          pattern="[a-z0-9_]{3,40}"
                          value={profile.handle}
                          onChange={(e) =>
                            setProfile({
                              ...profile,
                              handle: e.target.value.toLowerCase(),
                            })
                          }
                        />
                      </label>
                      <label>
                        Sobre você
                        <textarea
                          maxLength={500}
                          value={profile.bio || ""}
                          onChange={(e) =>
                            setProfile({ ...profile, bio: e.target.value })
                          }
                        />
                      </label>
                      <p className="cc-muted">Conta: {email}</p>
                      <div className="cc-circle-tabs">
                        <button type="button" onClick={() => nav("friends")}>
                          Amigos
                        </button>
                        <button
                          type="button"
                          onClick={() => nav("notifications")}
                        >
                          Notificações {unread > 0 ? "(" + unread + ")" : ""}
                        </button>
                      </div>
                      <button disabled={busy} className="cc-primary">
                        Salvar perfil
                      </button>
                      <button
                        type="button"
                        className="cc-secondary"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            const r = await authClient.signOut();
                            if (r.error) throw Error("Não foi possível sair");
                            window.location.assign("/entrar");
                          })
                        }
                      >
                        <LogOut size={16} /> Sair da conta
                      </button>
                    </form>
                    <AccountRecovery />
                  </>
                )}
              </>
            )}
          </main>
          <aside className="cc-right">
            <div className="cc-right-intro">
              <span>✦</span>
              <p>
                O mundo pode esperar.
                <br />
                <strong>As suas pessoas estão aqui.</strong>
              </p>
            </div>
            <section className="cc-card">
              <div className="cc-split">
                <h2>Próximos encontros</h2>
                <CalendarDays size={17} />
              </div>
              {events.slice(0, 3).map((e) => (
                <button
                  key={e.id}
                  className="cc-upcoming"
                  onClick={() => nav("events")}
                >
                  <span>
                    {new Date(e.starts_at).getDate()}
                    <small>
                      {new Date(e.starts_at).toLocaleString("pt-BR", {
                        month: "short",
                      })}
                    </small>
                  </span>
                  <div>
                    <strong>{e.title}</strong>
                    <small>
                      {e.circle_name} ·{" "}
                      {new Date(e.starts_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                </button>
              ))}
              {!events.length && (
                <p className="cc-muted">
                  Um encontro começa com uma ideia. Que tal combinar algo?
                </p>
              )}
              <button className="cc-text-button" onClick={() => nav("events")}>
                Abrir calendário <ArrowUpRight size={14} />
              </button>
            </section>
            {current && (
              <section className="cc-card">
                <div className="cc-split">
                  <h2>Dentro do círculo</h2>
                  <span className="cc-count">{members.length}</span>
                </div>
                {members.slice(0, 6).map((m) => (
                  <div key={m.id} className="cc-person">
                    <span className="cc-avatar small">{initials(m.name)}</span>
                    <div>
                      <strong>{m.name}</strong>
                      <small>
                        {m.id === meId
                          ? "Você"
                          : m.role === "owner"
                            ? "Responsável"
                            : "Integrante"}
                      </small>
                    </div>
                  </div>
                ))}
                <button
                  className="cc-text-button"
                  onClick={() => nav("circles")}
                >
                  Cuidar do círculo <ArrowUpRight size={14} />
                </button>
              </section>
            )}
            <div className="cc-privacy">
              <LockKeyhole size={19} />
              <h3>Privado, de verdade.</h3>
              <p>
                Publicações, fotos e conversas só são entregues a quem tem
                acesso. Você escolhe quem entra.
              </p>
            </div>
            <footer>CloseCircle · Feito para estar perto.</footer>
          </aside>
        </div>
      </div>
      <nav className="cc-mobile-nav">
        {tabs.slice(0, 4).map(({ id, label, icon: Icon }) => (
          <button
            aria-label={label}
            className={tab === id ? "active" : ""}
            onClick={() => nav(id)}
            key={id}
          >
            <Icon size={20} />
            <small>{label}</small>
          </button>
        ))}
        <button
          aria-label="Meu perfil"
          className={
            ["profile", "friends", "notifications"].includes(tab)
              ? "active"
              : ""
          }
          onClick={() => nav("profile")}
        >
          <UserRound size={20} />
          <small>Perfil</small>
        </button>
      </nav>
      {newCircle && (
        <div className="cc-modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="circle-title"
            className="cc-card cc-modal"
          >
            <div className="cc-split">
              <h2 id="circle-title">Um novo círculo.</h2>
              <button aria-label="Fechar" onClick={() => setNewCircle(false)}>
                <X />
              </button>
            </div>
            <p>
              Família, amigos de sempre, um projeto em comum. Você decide quem
              faz parte.
            </p>
            <form onSubmit={createCircle} className="cc-form">
              <label>
                Nome
                <input
                  autoFocus
                  required
                  name="name"
                  minLength={2}
                  maxLength={80}
                  placeholder="Como vamos chamar esse grupo?"
                />
              </label>
              <label>
                Sobre o círculo
                <textarea
                  name="description"
                  maxLength={500}
                  placeholder="O que aproxima vocês?"
                />
              </label>
              <button className="cc-primary" disabled={busy}>
                Criar círculo privado <LockKeyhole size={14} />
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function PostCard({
  post: p,
  meId,
  circleName,
  busy,
  run,
  reload,
}: {
  post: Post;
  meId: string;
  circleName: string;
  busy: boolean;
  run: (f: () => Promise<void>, success?: string) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [comments, setComments] = useState<Comment[]>([]);
  async function loadComments() {
    setComments(
      (await api<{ comments: Comment[] }>("/api/posts/" + p.id + "/comments"))
        .comments,
    );
  }
  return (
    <article className="cc-card cc-post">
      <header>
        <span className="cc-avatar">{initials(p.author_name)}</span>
        <div>
          <strong>{p.author_name}</strong>
          <small>
            {date(p.created_at)} <span>·</span> <LockKeyhole size={10} />{" "}
            {circleName}
          </small>
        </div>
        {p.author_id === meId && (
          <button
            aria-label="Excluir publicação"
            disabled={busy}
            onClick={() => {
              if (confirm("Excluir este momento e suas interações?"))
                run(async () => {
                  await api("/api/posts/" + p.id, undefined, "DELETE");
                  await reload();
                });
            }}
          >
            <Trash2 size={15} />
          </button>
        )}
      </header>
      {p.body && <p className="cc-post-body">{p.body}</p>}
      {p.attachments.map((id) => (
        <img
          key={id}
          className="cc-post-image"
          src={"/api/attachments/" + id}
          alt={"Foto compartilhada por " + p.author_name}
          loading="lazy"
        />
      ))}
      <footer>
        <div>
          {["💜", "👍", "😂", "🎉"].map((emoji) => (
            <button
              aria-label={"Reagir com " + emoji}
              aria-pressed={p.reactions.some(
                (r) => r.emoji === emoji && r.user_id === meId,
              )}
              className={
                p.reactions.some((r) => r.emoji === emoji && r.user_id === meId)
                  ? "reacted"
                  : ""
              }
              key={emoji}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("/api/social", {
                    action: "react",
                    postId: p.id,
                    emoji,
                    remove: p.reactions.some(
                      (r) => r.emoji === emoji && r.user_id === meId,
                    ),
                  });
                  await reload();
                })
              }
            >
              {emoji}
              <small>
                {p.reactions.filter((r) => r.emoji === emoji).length || ""}
              </small>
            </button>
          ))}
        </div>
        <button
          onClick={() =>
            run(async () => {
              if (!open) await loadComments();
              setOpen(!open);
            })
          }
        >
          <MessageCircle size={16} />
          <span>{p.comment_count}</span>
        </button>
      </footer>
      {open && (
        <div className="cc-comments">
          {comments.map((c) => (
            <div key={c.id}>
              <strong>{c.author_name}</strong>
              <p>{c.body}</p>
              <small>{date(c.created_at)}</small>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = new FormData(form);
              run(async () => {
                await api("/api/posts/" + p.id + "/comments", {
                  body: f.get("body"),
                });
                form.reset();
                await loadComments();
                await reload();
              });
            }}
          >
            <input
              aria-label="Comentário"
              name="body"
              placeholder="Deixe um comentário…"
              required
              maxLength={2000}
            />
            <button aria-label="Enviar comentário" disabled={busy}>
              <Send size={17} />
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
