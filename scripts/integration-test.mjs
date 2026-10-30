// Run against an isolated development database only; creates test data.
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:3100";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    env: { ...process.env, BETTER_AUTH_URL: base },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
server.stdout.on("data", (x) => (logs += x));
server.stderr.on("data", (x) => (logs += x));
const tests = [];
function check(name, condition) {
  assert.ok(condition, name);
  tests.push(name);
  console.log("PASS " + name);
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function request(
  path,
  body,
  cookie = "",
  method = body ? "POST" : "GET",
  extra = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "x-forwarded-for": "192.0.2." + (Math.floor(Math.random() * 250) + 1),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await r.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }
  return {
    status: r.status,
    data,
    cookie: r.headers
      .getSetCookie()
      .map((x) => x.split(";")[0])
      .join("; "),
    headers: r.headers,
  };
}
try {
  for (let i = 0; i < 50 && !logs.includes("Ready"); i++) await pause(200);
  check("server starts", logs.includes("Ready"));
  const users = JSON.parse(await readFile("/tmp/cc-test-users.json", "utf8"));
  const sessions = [];
  for (const u of users) {
    const r = await request("/api/auth/sign-in/email", {
      email: u.email,
      password: u.password,
    });
    if (r.status !== 200) console.log("Login failure", r.status, r.data);
    check(
      "real email login " + u.email.split("-")[1],
      r.status === 200 && r.cookie.includes("session_token"),
    );
    sessions.push(r.cookie);
  }
  const [owner, member, outsider] = sessions;
  check(
    "unauthenticated feed denied",
    (await request("/api/circles")).status === 401,
  );
  check(
    "open signup blocked",
    (
      await request("/api/auth/sign-up/email", {
        name: "Intruder",
        email: "intruder@closecircle.test",
        password: "InvalidAccess123456",
      })
    ).status === 403,
  );
  const profiles = [];
  for (const cookie of sessions) {
    const r = await request("/api/social?resource=profile", null, cookie);
    check(
      "profile initialized " + profiles.length,
      r.status === 200 && !!r.data.profile,
    );
    profiles.push(r.data.profile);
  }
  const created = await request(
    "/api/circles",
    {
      name: "Integração " + Date.now(),
      description: "Grupo privado de testes",
    },
    owner,
  );
  console.log("Circle response", JSON.stringify(created.data));
  const circle = created.data.circle;
  check("circle created", Boolean(circle.id));
  const cid = circle.id;
  check(
    "outsider cannot read feed",
    (await request("/api/posts?circleId=" + cid, null, outsider)).status ===
      403,
  );
  check(
    "outsider cannot post",
    (
      await request(
        "/api/posts",
        { circleId: cid, body: "forbidden" },
        outsider,
      )
    ).status === 403,
  );
  check(
    "outsider cannot list members",
    (
      await request(
        "/api/social?resource=members&circleId=" + cid,
        null,
        outsider,
      )
    ).status === 403,
  );
  const invitation = (
    await request("/api/social", { action: "invite", circleId: cid }, owner)
  ).data;
  check("invite has secure token", invitation.token.length === 64);
  const signup = await request(
    "/api/auth/sign-up/email",
    {
      name: "Invited Signup",
      email: "invited-" + Date.now() + "@closecircle.test",
      password: "VeryStrong-Test-Password123",
    },
    "",
    undefined,
    { "x-circle-invite": invitation.token },
  );
  check("valid invite permits registration", signup.status === 200);
  check(
    "invite joins group",
    (
      await request(
        "/api/social",
        { action: "join", token: invitation.token },
        member,
      )
    ).status === 200,
  );
  check(
    "single-use invite rejects replay",
    (
      await request(
        "/api/social",
        { action: "join", token: invitation.token },
        outsider,
      )
    ).status === 410,
  );
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1sAAAAASUVORK5CYII=";
  const p = await request(
    "/api/posts",
    { circleId: cid, body: "Momento privado", image: png },
    owner,
  );
  check("post and photo created", p.status === 200 && p.data.post.id);
  const pid = p.data.post.id;
  let feed = await request("/api/posts?circleId=" + cid, null, member);
  check(
    "member reads private post",
    feed.data.posts[0].body === "Momento privado",
  );
  const photo = feed.data.posts[0].attachments[0];
  check(
    "private photo denied to outsider",
    (await request("/api/attachments/" + photo, null, outsider)).status === 404,
  );
  check(
    "private photo delivered to member",
    (await request("/api/attachments/" + photo, null, member)).status === 200,
  );
  check(
    "member comments",
    (
      await request(
        "/api/posts/" + pid + "/comments",
        { body: "Comentário privado" },
        member,
      )
    ).status === 201,
  );
  check(
    "outsider cannot comment",
    (await request("/api/posts/" + pid + "/comments", { body: "No" }, outsider))
      .status === 404,
  );
  check(
    "member reaction works",
    (
      await request(
        "/api/social",
        { action: "react", postId: pid, emoji: "💜" },
        member,
      )
    ).status === 200,
  );
  check(
    "reaction is idempotent",
    (
      await request(
        "/api/social",
        { action: "react", postId: pid, emoji: "💜" },
        member,
      )
    ).status === 200,
  );
  check(
    "non-owner cannot delete post",
    (await request("/api/posts/" + pid, null, member, "DELETE")).status === 403,
  );
  check(
    "event created",
    (
      await request(
        "/api/social",
        {
          action: "event",
          circleId: cid,
          title: "Encontro",
          description: "Privado",
          startsAt: new Date(Date.now() + 3600000).toISOString(),
        },
        member,
      )
    ).status === 200,
  );
  check(
    "event invisible to outsider",
    !(
      await request("/api/social?resource=events", null, outsider)
    ).data.events.some((e) => e.circle_id === cid),
  );
  check(
    "notification generated",
    (
      await request("/api/social?resource=notifications", null, owner)
    ).data.notifications.some((n) => n.kind === "event"),
  );
  const conv = (
    await request(
      "/api/social",
      { action: "conversation", circleId: cid },
      owner,
    )
  ).data.id;
  check(
    "group message sent",
    (
      await request(
        "/api/social",
        { action: "message", conversationId: conv, body: "Mensagem privada" },
        member,
      )
    ).status === 200,
  );
  check(
    "member reads group chat",
    (
      await request(
        "/api/social?resource=messages&conversationId=" + conv,
        null,
        owner,
      )
    ).data.messages[0].body === "Mensagem privada",
  );
  check(
    "outsider denied group chat",
    (
      await request(
        "/api/social?resource=messages&conversationId=" + conv,
        null,
        outsider,
      )
    ).status === 403,
  );
  check(
    "only owner invites",
    (await request("/api/social", { action: "invite", circleId: cid }, member))
      .status === 403,
  );
  const revoke = (
    await request("/api/social", { action: "invite", circleId: cid }, owner)
  ).data;
  await request(
    "/api/social",
    { action: "revoke-invite", id: revoke.invite.id },
    owner,
  );
  check(
    "revoked invite rejected",
    (
      await request(
        "/api/social",
        { action: "join", token: revoke.token },
        outsider,
      )
    ).status === 410,
  );
  check(
    "remove member",
    (
      await request(
        "/api/social",
        { action: "remove-member", circleId: cid, userId: profiles[1].id },
        owner,
      )
    ).status === 200,
  );
  check(
    "removed member loses feed",
    (await request("/api/posts?circleId=" + cid, null, member)).status === 403,
  );
  check(
    "removed member loses photos",
    (await request("/api/attachments/" + photo, null, member)).status === 404,
  );
  check(
    "removed member loses chat",
    (
      await request(
        "/api/social?resource=messages&conversationId=" + conv,
        null,
        member,
      )
    ).status === 403,
  );
  check(
    "owner deletes post with interactions",
    (await request("/api/posts/" + pid, null, owner, "DELETE")).status === 200,
  );
  check(
    "deleted photo unavailable",
    (await request("/api/attachments/" + photo, null, owner)).status === 404,
  );
  check(
    "friend request",
    (
      await request(
        "/api/social",
        { action: "friend", handle: profiles[1].handle },
        owner,
      )
    ).status === 200,
  );
  check(
    "friend acceptance",
    (
      await request(
        "/api/social",
        { action: "accept-friend", userId: profiles[0].id },
        member,
      )
    ).status === 200,
  );
  const dm = (
    await request(
      "/api/social",
      { action: "conversation", userId: profiles[1].id },
      owner,
    )
  ).data.id;
  check(
    "private message sent",
    (
      await request(
        "/api/social",
        { action: "message", conversationId: dm, body: "DM privada" },
        owner,
      )
    ).status === 200,
  );
  check(
    "outsider denied private conversation",
    (
      await request(
        "/api/social?resource=messages&conversationId=" + dm,
        null,
        outsider,
      )
    ).status === 403,
  );
  check(
    "CSRF origin rejected",
    (
      await request(
        "/api/social",
        { action: "read-notifications" },
        owner,
        undefined,
        { Origin: "https://evil.test" },
      )
    ).status === 403,
  );
  const app = await request("/app", null, owner);
  check(
    "authenticated application renders",
    app.status === 200 && app.data.includes("Perto de quem importa"),
  );
  const logout = await request("/api/auth/sign-out", {}, owner);
  check(
    "logout invalidates session",
    logout.status === 200 &&
      (await request("/api/social?resource=profile", null, owner)).status ===
        401,
  );
  await writeFile(
    "/tmp/cc-integration-results.json",
    JSON.stringify({ passed: tests.length, tests }),
  );
  console.log("ALL " + tests.length + " CHECKS PASSED");
} catch (e) {
  console.error(e.message);
  console.error("Server tail:", logs.slice(-2000));
  process.exitCode = 1;
} finally {
  server.kill();
}
