// Run against an isolated development database only; creates test data.
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import nextEnv from "@next/env";
const {loadEnvConfig}=nextEnv;
import { neon } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
loadEnvConfig(process.cwd());
if (
  !process.env.CLOSECIRCLE_TEST_DATABASE_HOST ||
  new URL(process.env.DATABASE_URL || "").hostname !==
    process.env.CLOSECIRCLE_TEST_DATABASE_HOST
)
  throw Error(
    "Set CLOSECIRCLE_TEST_DATABASE_HOST to the isolated development hostname.",
  );
const sql = neon(process.env.DATABASE_URL);
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
  const users = [];
  for (const name of ["owner", "member", "outsider"]) {
    const user = {
      name: "Teste " + name,
      email: `test-${name}-${Date.now()}@closecircle.test`,
      password: randomBytes(24).toString("base64url"),
    };
    const signup = await request("/api/auth/sign-up/email", user);
    check(
      "public registration without invite " + name,
      signup.status === 200 && Boolean(signup.cookie),
    );
    users.push(user);
  }
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
    "invalid email rejected",
    (
      await request("/api/auth/sign-up/email", {
        name: "Inválido",
        email: "not-an-email",
        password: "LongEnoughPassword123",
      })
    ).status === 400,
  );
  check(
    "short password rejected",
    (
      await request("/api/auth/sign-up/email", {
        name: "Inválido",
        email: "short-" + Date.now() + "@closecircle.test",
        password: "short",
      })
    ).status === 400,
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
  check(
    "optional invitation remains compatible with signup",
    signup.status === 200,
  );
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
  const secondCircle = (
    await request(
      "/api/circles",
      { name: "Outro círculo", description: "" },
      owner,
    )
  ).data.circle.id;
  const secondPost = (
    await request(
      "/api/posts",
      { circleId: secondCircle, body: "Outro momento privado" },
      owner,
    )
  ).data.post.id;
  const outsideCircle = (
    await request(
      "/api/circles",
      { name: "Fora da rede", description: "" },
      outsider,
    )
  ).data.circle.id;
  const outsidePost = (
    await request(
      "/api/posts",
      { circleId: outsideCircle, body: "Conteúdo de fora" },
      outsider,
    )
  ).data.post.id;
  const unified = (await request("/api/posts", null, owner)).data.posts;
  check(
    "unified feed merges all member circles",
    unified.some((p) => p.id === pid) &&
      unified.some((p) => p.id === secondPost),
  );
  check(
    "unified feed excludes outsider circles",
    !unified.some((p) => p.id === outsidePost),
  );
  check(
    "feed identifies source circle",
    unified.every((p) => p.circle_id && p.circle_name),
  );
  const memberUnified = (await request("/api/posts", null, member)).data.posts;
  check(
    "each member gets a different authorized feed",
    memberUnified.some((p) => p.id === pid) &&
      !memberUnified.some((p) => p.id === secondPost),
  );
  check(
    "anonymous unified feed denied",
    (await request("/api/posts")).status === 401,
  );
  check(
    "invalid feed cursor rejected",
    (await request("/api/posts?cursor=broken", null, owner)).status === 400,
  );
  check(
    "circle filter limits unified feed",
    (
      await request("/api/posts?circleId=" + secondCircle, null, owner)
    ).data.posts.every((p) => p.circle_id === secondCircle),
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
    "removed member loses circle posts in unified feed",
    !(await request("/api/posts", null, member)).data.posts.some(
      (p) => p.circle_id === cid,
    ),
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
  check(
    "owner adds accepted friend without invitation",
    (
      await request(
        "/api/social",
        {
          action: "add-member",
          circleId: secondCircle,
          handle: profiles[1].handle,
        },
        owner,
      )
    ).status === 200,
  );
  check(
    "directly added friend reads new group",
    (await request("/api/posts", null, member)).data.posts.some(
      (p) => p.id === secondPost,
    ),
  );
  check(
    "non-owner cannot add members",
    (
      await request(
        "/api/social",
        {
          action: "add-member",
          circleId: secondCircle,
          handle: profiles[2].handle,
        },
        member,
      )
    ).status === 403,
  );
  check(
    "unaccepted stranger cannot be added",
    (
      await request(
        "/api/social",
        {
          action: "add-member",
          circleId: secondCircle,
          handle: profiles[2].handle,
        },
        owner,
      )
    ).status === 409,
  );
  check(
    "direct addition cannot duplicate membership",
    (
      await request(
        "/api/social",
        {
          action: "add-member",
          circleId: secondCircle,
          handle: profiles[1].handle,
        },
        owner,
      )
    ).status === 409,
  );
  await sql`insert into posts(circle_id,author_id,body,created_at) select ${secondCircle}::uuid,${profiles[0].id}::uuid,'Página de teste #'||g,now() from generate_series(1,30) g`;
  const page1 = (await request("/api/posts", null, owner)).data;
  check(
    "feed first page is bounded",
    page1.posts.length === 25 && typeof page1.nextCursor === "string",
  );
  const page2 = (
    await request(
      "/api/posts?cursor=" + encodeURIComponent(page1.nextCursor),
      null,
      owner,
    )
  ).data;
  const allPosts = [...page1.posts, ...page2.posts];
  check(
    "pagination does not skip equal-timestamp posts",
    allPosts.length === 31 &&
      new Set(allPosts.map((p) => p.id)).size === 31 &&
      page2.nextCursor === null,
  );
  check(
    "pagination keeps circle isolation",
    allPosts.every((p) => p.circle_id === secondCircle),
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
    app.status === 200 && app.data.includes("Seu mundo, em um só feed"),
  );
  check(
    "recovery status requires session",
    (await request("/api/account/recovery")).status === 401,
  );
  check(
    "new account has no recovery key",
    (await request("/api/account/recovery", null, outsider)).data.configured ===
      false,
  );
  check(
    "key generation requires current password",
    (
      await request(
        "/api/account/recovery",
        { action: "generate", password: "WrongPassword123" },
        outsider,
      )
    ).status === 400,
  );
  const generated = await request(
    "/api/account/recovery",
    { action: "generate", password: users[2].password },
    outsider,
  );
  check(
    "recovery key issued to verified session",
    generated.status === 200 && /^CC-/.test(generated.data.code),
  );
  const savedKey = generated.data.code;
  check(
    "invalid key cannot reset password",
    (
      await request("/api/account/recovery", {
        action: "recover",
        email: users[2].email,
        code: "CC-" + "x".repeat(43),
        newPassword: "LongEnoughPassword123",
      })
    ).status === 400,
  );
  const recoveredPassword =
    "  New Password " + randomBytes(12).toString("hex") + "  ";
  const recovered = await request("/api/account/recovery", {
    action: "recover",
    email: users[2].email,
    code: savedKey,
    newPassword: recoveredPassword,
  });
  check(
    "account recovers without email service",
    recovered.status === 200 && Boolean(recovered.data.code),
  );
  check("used recovery key rotates", recovered.data.code !== savedKey);
  check(
    "recovery revokes existing sessions",
    (await request("/api/social?resource=profile", null, outsider)).status ===
      401,
  );
  check(
    "old password no longer signs in",
    (
      await request("/api/auth/sign-in/email", {
        email: users[2].email,
        password: users[2].password,
      })
    ).status === 401,
  );
  check(
    "new password preserves leading and trailing spaces",
    (
      await request("/api/auth/sign-in/email", {
        email: users[2].email,
        password: recoveredPassword,
      })
    ).status === 200,
  );
  check(
    "used recovery key cannot be replayed",
    (
      await request("/api/account/recovery", {
        action: "recover",
        email: users[2].email,
        code: savedKey,
        newPassword: "DifferentPassword12345",
      })
    ).status === 400,
  );
  const stored =
    await sql`select code_hash from account_recovery where profile_id=${profiles[2].id}::uuid`;
  check(
    "database stores only hash of recovery key",
    stored.length === 1 &&
      /^[a-f0-9]{64}$/.test(stored[0].code_hash) &&
      stored[0].code_hash !== recovered.data.code,
  );
  const limitHeaders = {
    "x-forwarded-for": "203.0.113.72",
    "x-real-ip": "203.0.113.72",
  };
  for (let i = 0; i < 5; i++)
    await request(
      "/api/account/recovery",
      {
        action: "recover",
        email: users[2].email,
        code: "invalid",
        newPassword: "LongEnoughPassword123",
      },
      "",
      undefined,
      limitHeaders,
    );
  check(
    "recovery attempts are rate limited",
    (
      await request(
        "/api/account/recovery",
        {
          action: "recover",
          email: users[2].email,
          code: "invalid",
          newPassword: "LongEnoughPassword123",
        },
        "",
        undefined,
        limitHeaders,
      )
    ).status === 429,
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
