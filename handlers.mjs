var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// app/api/session/route.ts
var route_exports = {};
__export(route_exports, {
  POST: () => POST
});

// portable:portable-binding
var env = { DB: globalThis.__stressPortableDB };

// lib/lab-db.ts
function db() {
  const binding = env.DB;
  if (!binding) throw new Error("Classroom storage is unavailable.");
  return binding;
}
async function hash(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (x) => x.toString(16).padStart(2, "0")).join("");
}
function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
var ApiError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
async function body(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new ApiError("This request is not allowed.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ApiError("JSON is required.");
  const raw = await request.text();
  if (raw.length > 4096) throw new ApiError("Request is too large.", 413);
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new ApiError("Invalid request.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError("Invalid request.");
  return value;
}
function fail(error) {
  if (error instanceof ApiError) return json({ error: error.message }, error.status);
  console.error("Classroom service error", error);
  return json({ error: "Classroom service is unavailable. Your selection has been kept. Please retry." }, 503);
}
async function session(code) {
  if (!/^[A-Z2-9]{6}$/.test(code)) throw new ApiError("Enter a valid six-character room code.");
  const row = await db().prepare("SELECT * FROM sessions WHERE code=?").bind(code).first();
  if (!row || row.expires_at < Date.now()) throw new ApiError("This room does not exist or has expired. Ask your presenter for the current code.", 404);
  return row;
}
async function authorize(request, row) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!/^[a-f0-9]{64}$/.test(token) || await hash(token) !== row.host_hash) throw new ApiError("Host access is required. Return to the browser that created this room.", 403);
}
function participant(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{32}$/.test(value)) throw new ApiError("Rejoin the room to continue.");
  return value;
}

// app/api/session/route.ts
async function POST(request) {
  try {
    await body(request);
    const now = Date.now();
    await db().prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now).run();
    const recent = await db().prepare("SELECT COUNT(*) AS n FROM sessions WHERE created_at>?").bind(now - 36e5).first();
    if ((recent?.n ?? 0) >= 100) throw new ApiError("Too many new rooms. Please try again later.", 429);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => x.toString(16).padStart(2, "0")).join("");
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (x) => alphabet[x % alphabet.length]).join("");
      const exists = await db().prepare("SELECT code FROM sessions WHERE code=?").bind(code).first();
      if (!exists) break;
      code = "";
    }
    if (!code) throw new ApiError("Please try creating the room again.", 503);
    await db().prepare("INSERT INTO sessions(code,host_hash,stage,phase,created_at,expires_at) VALUES(?,?,0,'open',?,?)").bind(code, await hash(token), now, now + 864e5).run();
    return json({ code, token }, 201);
  } catch (e) {
    return fail(e);
  }
}

// app/api/session/[code]/route.ts
var route_exports2 = {};
__export(route_exports2, {
  GET: () => GET,
  POST: () => POST2
});

// lib/lab-content.ts
var bi = (en, zh) => ({ en, zh });
var caseText = bi("I have two exams and three deadlines next week. My family expects top grades. I worry that one disappointing result could ruin my university plans.", "\u4E0B\u5468\u6211\u6709\u4E24\u573A\u8003\u8BD5\u548C\u4E09\u9879\u4F5C\u4E1A\u622A\u6B62\u3002\u5BB6\u4EBA\u5E0C\u671B\u6211\u53D6\u5F97\u9AD8\u5206\u3002\u6211\u62C5\u5FC3\u4E00\u6B21\u4E0D\u7406\u60F3\u7684\u6210\u7EE9\u5C31\u4F1A\u6BC1\u6389\u6211\u7684\u5927\u5B66\u5347\u5B66\u8BA1\u5212\u3002");
var pressure = [
  { id: "workload", label: bi("Workload & deadlines", "\u5DE5\u4F5C\u91CF\u4E0E\u622A\u6B62\u65E5\u671F"), detail: bi("Two exams and three deadlines in one week", "\u540C\u4E00\u5468\u5185\u7684\u8003\u8BD5\u4E0E\u4F5C\u4E1A\u96C6\u4E2D") },
  { id: "expectations", label: bi("Expectations from others", "\u4ED6\u4EBA\u7684\u671F\u5F85"), detail: bi("Pressure to meet the family's expectations", "\u8FBE\u5230\u5BB6\u4EBA\u671F\u5F85\u7684\u538B\u529B") },
  { id: "future", label: bi("Meaning of the results", "\u6210\u7EE9\u6240\u4EE3\u8868\u7684\u610F\u4E49"), detail: bi("What one result might mean for the future", "\u4E00\u6B21\u6210\u7EE9\u4E0E\u672A\u6765\u673A\u4F1A\u7684\u5173\u8054") }
];
var rounds = [
  { label: bi("First impression", "\u7B2C\u4E00\u5224\u65AD"), title: bi("What would you explore first?", "\u4F60\u4F1A\u5148\u4E86\u89E3\u54EA\u4E00\u79CD\u538B\u529B\uFF1F"), prompt: bi("Choose one starting point for a conversation with Alex. There is no single correct priority.", "\u9009\u62E9\u4E00\u4E2A\u4E0E Alex \u4EA4\u6D41\u7684\u5207\u5165\u70B9\u3002\u8FD9\u91CC\u6CA1\u6709\u552F\u4E00\u6B63\u786E\u7684\u4F18\u5148\u987A\u5E8F\u3002"), count: 1, options: pressure, eyebrow: bi("PRESSURE DETECTIVE \xB7 MEMBER 2", "\u538B\u529B\u4FA6\u63A2 \xB7 MEMBER 2"), time: 45 },
  { label: bi("Discuss & reconsider", "\u8BA8\u8BBA\u540E\u518D\u9009\u62E9"), title: bi("Did another perspective change yours?", "\u542C\u5230\u53E6\u4E00\u79CD\u89C2\u70B9\u540E\uFF0C\u4F60\u4F1A\u6539\u53D8\u9009\u62E9\u5417\uFF1F"), prompt: bi("After reading the previous round's posts, vote again and publish why you kept or changed your choice below.", "\u9605\u8BFB\u4E0A\u4E00\u8F6E\u5E16\u5B50\u540E\uFF0C\u518D\u6B21\u6295\u7968\uFF0C\u5E76\u5728\u4E0B\u65B9\u516C\u5F00\u53D1\u5E03\u4F60\u4FDD\u6301\u6216\u6539\u53D8\u9009\u62E9\u7684\u7406\u7531\u3002"), count: 1, options: pressure, eyebrow: bi("PRESSURE DETECTIVE \xB7 SECOND VOTE", "\u538B\u529B\u4FA6\u63A2 \xB7 \u7B2C\u4E8C\u6B21\u9009\u62E9"), time: 45 },
  { label: bi("Educator decisions", "\u6559\u80B2\u8005\u7684\u51B3\u7B56"), title: bi("Which two responses would you prioritise?", "\u4F60\u4F1A\u4F18\u5148\u9009\u62E9\u54EA\u4E24\u9879\u6559\u80B2\u56DE\u5E94\uFF1F"), prompt: bi("Imagine your school can pilot two changes next month. Choose two, then explain what each addresses and what it leaves out.", "\u5047\u8BBE\u5B66\u6821\u4E0B\u4E2A\u6708\u53EA\u80FD\u8BD5\u884C\u4E24\u9879\u6539\u53D8\u3002\u9009\u62E9\u4E24\u9879\uFF0C\u518D\u8BF4\u660E\u5B83\u4EEC\u5206\u522B\u56DE\u5E94\u4E86\u4EC0\u4E48\u3001\u9057\u6F0F\u4E86\u4EC0\u4E48\u3002"), count: 2, options: [
    { id: "assessment", label: bi("Coordinate assessment deadlines", "\u534F\u8C03\u8003\u8BD5\u4E0E\u4F5C\u4E1A\u5B89\u6392"), detail: bi("Review how demands cluster across subjects", "\u68C0\u67E5\u4E0D\u540C\u5B66\u79D1\u4EFB\u52A1\u662F\u5426\u8FC7\u4E8E\u96C6\u4E2D") },
    { id: "feedback", label: bi("Review messages about grades", "\u8C03\u6574\u6709\u5173\u6210\u7EE9\u7684\u6C9F\u901A"), detail: bi("Discuss teacher and family expectations", "\u5BA1\u89C6\u6559\u5E08\u4E0E\u5BB6\u5EAD\u4F20\u8FBE\u7684\u671F\u5F85") },
    { id: "resources", label: bi("Develop student coping resources", "\u53D1\u5C55\u5B66\u751F\u7684\u5E94\u5BF9\u8D44\u6E90"), detail: bi("Support planning, coping and help-seeking", "\u652F\u6301\u8BA1\u5212\u3001\u5E94\u5BF9\u4E0E\u6C42\u52A9") },
    { id: "belonging", label: bi("Strengthen supportive relationships", "\u589E\u5F3A\u652F\u6301\u6027\u5173\u7CFB"), detail: bi("Improve access to peer and teacher support", "\u589E\u52A0\u83B7\u5F97\u540C\u4F34\u4E0E\u6559\u5E08\u652F\u6301\u7684\u673A\u4F1A") }
  ], eyebrow: bi("SCHOOL DECISION ROOM \xB7 MEMBERS 5\u20136", "\u5B66\u6821\u51B3\u7B56\u5BA4 \xB7 MEMBERS 5\u20136"), time: 60 }
];
var evidence = {
  case: bi("The case is fictional. Wuthrich et al. (2020) reviewed 60 studies of students in the final two years of secondary school. Workload, future concerns and perceived pressure provide a basis for this discussion. These categories can overlap.", "\u6848\u4F8B\u4E3A\u865A\u6784\u3002Wuthrich \u7B49\uFF082020\uFF09\u7EFC\u8FF0\u4E86\u4E2D\u5B66\u6700\u540E\u4E24\u5E74\u5B66\u751F\u7684 60 \u9879\u7814\u7A76\u3002\u5DE5\u4F5C\u91CF\u3001\u672A\u6765\u62C5\u5FE7\u4E0E\u611F\u53D7\u5230\u7684\u671F\u5F85\u4E3A\u672C\u8BA8\u8BBA\u63D0\u4F9B\u4F9D\u636E\uFF0C\u8FD9\u4E9B\u7C7B\u522B\u53EF\u80FD\u91CD\u53E0\u3002"),
  response: bi("The readings motivate discussion of both educational demands and student resources. These four choices are proposed responses, not interventions compared in a trial. Xu et al. (2022) reported associations in a cross-sectional study of English learning, not definitive causal effects.", "\u9605\u8BFB\u6750\u6599\u652F\u6301\u540C\u65F6\u8BA8\u8BBA\u6559\u80B2\u8981\u6C42\u4E0E\u5B66\u751F\u8D44\u6E90\u3002\u56DB\u4E2A\u9009\u9879\u662F\u7528\u4E8E\u8BA8\u8BBA\u7684\u53EF\u80FD\u56DE\u5E94\uFF0C\u5E76\u975E\u7814\u7A76\u8BD5\u9A8C\u6BD4\u8F83\u8FC7\u7684\u5E72\u9884\u3002Xu \u7B49\uFF082022\uFF09\u6709\u5173\u82F1\u8BED\u5B66\u4E60\u7684\u6A2A\u65AD\u9762\u7814\u7A76\u62A5\u544A\u7684\u662F\u5173\u8054\uFF0C\u4E0D\u80FD\u786E\u7ACB\u56E0\u679C\u6548\u679C\u3002")
};

// app/api/session/[code]/route.ts
async function GET(request, context) {
  try {
    const { code } = await context.params;
    const row = await session(code);
    const total = await db().prepare("SELECT COUNT(*) AS n FROM participants WHERE code=?").bind(code).first();
    const responses = await db().prepare("SELECT COUNT(*) AS n FROM votes WHERE code=? AND stage=?").bind(code, row.stage).first();
    const counts = {};
    let previous = null;
    let previousTotal = 0;
    if (row.phase === "reveal" || row.phase === "ended") {
      const rows = await db().prepare("SELECT stage,choices FROM votes WHERE code=? AND (stage=? OR stage=0)").bind(code, row.stage).all();
      if (row.stage === 1) previous = {};
      for (const v of rows.results) {
        const choices = JSON.parse(v.choices);
        if (v.stage === row.stage) for (const c of choices) counts[c] = (counts[c] ?? 0) + 1;
        if (previous && v.stage === 0) {
          previousTotal++;
          for (const c of choices) previous[c] = (previous[c] ?? 0) + 1;
        }
      }
    }
    return json({ code, stage: row.stage, phase: row.phase, deadline: row.deadline, expiresAt: row.expires_at, participants: total?.n ?? 0, responses: responses?.n ?? 0, counts, previous, previousTotal, votingOpen: row.phase === "open" && (!row.deadline || row.deadline > Date.now()) });
  } catch (e) {
    return fail(e);
  }
}
async function POST2(request, context) {
  try {
    const { code } = await context.params;
    const row = await session(code);
    const data = await body(request);
    if (data.action === "join") {
      const id = participant(data.participant);
      await db().prepare("INSERT INTO participants(code,participant,joined_at) VALUES(?,?,?) ON CONFLICT(code,participant) DO NOTHING").bind(code, id, Date.now()).run();
      const own = await db().prepare("SELECT stage,choices FROM votes WHERE code=? AND participant=?").bind(code, id).all();
      return json({ ok: true, votes: Object.fromEntries(own.results.map((v) => [v.stage, JSON.parse(v.choices)])) });
    }
    if (data.action === "vote") {
      const id = participant(data.participant);
      if (data.stage !== row.stage) throw new ApiError("The presenter has changed rounds. Please try the current question.", 409);
      if (row.phase !== "open" || row.deadline && row.deadline <= Date.now()) throw new ApiError("Voting has closed for this round.", 409);
      if (!Array.isArray(data.choices) || data.choices.length !== rounds[row.stage].count || new Set(data.choices).size !== data.choices.length || data.choices.some((x) => !rounds[row.stage].options.some((o) => o.id === x))) throw new ApiError("Please choose the requested number of options.");
      const registered = await db().prepare("SELECT participant FROM participants WHERE code=? AND participant=?").bind(code, id).first();
      if (!registered) throw new ApiError("Please join the room before voting.", 403);
      const result = await db().prepare("INSERT INTO votes(code,stage,participant,choices,updated_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sessions WHERE code=? AND stage=? AND phase='open' AND (deadline IS NULL OR deadline>?) AND expires_at>?) ON CONFLICT(code,stage,participant) DO UPDATE SET choices=excluded.choices,updated_at=excluded.updated_at").bind(code, row.stage, id, JSON.stringify(data.choices), Date.now(), code, row.stage, Date.now(), Date.now()).run();
      if (!result.meta.changes) throw new ApiError("Voting has just closed. Please follow the presenter.", 409);
      return json({ ok: true });
    }
    await authorize(request, row);
    if (data.action === "stage") {
      if (!Number.isInteger(data.stage) || Number(data.stage) < 0 || Number(data.stage) > 2) throw new ApiError("Invalid round.");
      await db().prepare("UPDATE sessions SET stage=?,phase='open',deadline=NULL WHERE code=?").bind(data.stage, code).run();
    } else if (data.action === "reveal") await db().prepare("UPDATE sessions SET phase='reveal',deadline=NULL WHERE code=?").bind(code).run();
    else if (data.action === "pause") await db().prepare("UPDATE sessions SET phase='paused',deadline=NULL WHERE code=?").bind(code).run();
    else if (data.action === "open") await db().prepare("UPDATE sessions SET phase='open',deadline=NULL WHERE code=?").bind(code).run();
    else if (data.action === "timer") await db().prepare("UPDATE sessions SET phase='open',deadline=? WHERE code=?").bind(Date.now() + rounds[row.stage].time * 1e3, code).run();
    else if (data.action === "end") await db().prepare("UPDATE sessions SET phase='ended',deadline=NULL WHERE code=?").bind(code).run();
    else if (data.action === "delete") await db().prepare("DELETE FROM sessions WHERE code=?").bind(code).run();
    else throw new ApiError("Unknown action.");
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

// app/api/session/[code]/forum/route.ts
var route_exports3 = {};
__export(route_exports3, {
  GET: () => GET2,
  POST: () => POST3
});
async function GET2(request, context) {
  try {
    const { code } = await context.params;
    await session(code);
    const stage = Number(new URL(request.url).searchParams.get("stage"));
    if (!Number.isInteger(stage) || stage < 0 || stage > 2) throw new ApiError("Invalid round.");
    const own = request.headers.get("x-participant") ?? "";
    const rows = await db().prepare("SELECT p.*, (SELECT COUNT(*) FROM participants a WHERE a.code=p.code AND (a.joined_at<q.joined_at OR (a.joined_at=q.joined_at AND a.participant<=q.participant))) AS author_number FROM posts p JOIN participants q ON q.code=p.code AND q.participant=p.participant WHERE p.code=? AND p.stage=? ORDER BY p.created_at,p.id LIMIT 500").bind(code, stage).all();
    return json({ posts: rows.results.map((p) => ({ id: p.id, parentId: p.parent_id, author: p.author_number, choices: JSON.parse(p.choices), content: p.content, createdAt: p.created_at, mine: p.participant === own })) });
  } catch (e) {
    return fail(e);
  }
}
async function POST3(request, context) {
  try {
    const { code } = await context.params;
    const row = await session(code);
    const data = await body(request);
    if (data.action === "delete") {
      const post = await db().prepare("SELECT participant FROM posts WHERE code=? AND id=?").bind(code, String(data.id)).first();
      if (!post) throw new ApiError("Post not found.", 404);
      if (request.headers.has("authorization")) await authorize(request, row);
      else if (participant(data.participant) !== post.participant) throw new ApiError("You can only delete your own posts.", 403);
      await db().prepare("DELETE FROM posts WHERE code=? AND (id=? OR parent_id=?)").bind(code, String(data.id), String(data.id)).run();
      return json({ ok: true });
    }
    if (data.action !== "post") throw new ApiError("Unknown action.");
    const id = participant(data.participant);
    if (row.phase === "ended") throw new ApiError("Discussion has ended.", 409);
    if (data.stage !== row.stage) throw new ApiError("The presenter has changed rounds. Your draft has been kept.", 409);
    const content = typeof data.content === "string" ? data.content.trim() : "";
    if (content.length < 1 || content.length > 600) throw new ApiError("Write between 1 and 600 characters.");
    const vote = await db().prepare("SELECT choices FROM votes WHERE code=? AND stage=? AND participant=?").bind(code, row.stage, id).first();
    if (!vote) throw new ApiError("Submit your choice for this round before posting.", 403);
    const parentId = typeof data.parentId === "string" ? data.parentId : null;
    if (parentId) {
      const parent = await db().prepare("SELECT id FROM posts WHERE code=? AND stage=? AND id=? AND parent_id IS NULL").bind(code, row.stage, parentId).first();
      if (!parent) throw new ApiError("This discussion no longer exists. Refresh and try again.", 404);
    }
    const recent = await db().prepare("SELECT COUNT(*) AS n FROM posts WHERE code=? AND participant=? AND created_at>?").bind(code, id, Date.now() - 6e4).first();
    if ((recent?.n ?? 0) >= 6) throw new ApiError("Please wait a minute before posting again.", 429);
    const total = await db().prepare("SELECT COUNT(*) AS n FROM posts WHERE code=? AND stage=?").bind(code, row.stage).first();
    if ((total?.n ?? 0) >= 500) throw new ApiError("This round's discussion is full.", 409);
    await db().prepare("INSERT INTO posts(id,code,stage,participant,parent_id,choices,content,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), code, row.stage, id, parentId, vote.choices, content, Date.now()).run();
    return json({ ok: true }, 201);
  } catch (e) {
    return fail(e);
  }
}

// app/api/session/[code]/analytics/route.ts
var route_exports4 = {};
__export(route_exports4, {
  GET: () => GET3
});
async function GET3(request, context) {
  try {
    const { code } = await context.params;
    const row = await session(code);
    await authorize(request, row);
    const votes = await db().prepare("SELECT stage,choices FROM votes WHERE code=?").bind(code).all();
    const discussions = await db().prepare("SELECT stage,COUNT(*) AS messages,COUNT(DISTINCT participant) AS authors,SUM(CASE WHEN parent_id IS NULL THEN 1 ELSE 0 END) AS topics FROM posts WHERE code=? GROUP BY stage").bind(code).all();
    return json({ rounds: rounds.map((_, stage) => {
      const records = votes.results.filter((v) => v.stage === stage);
      const counts = {};
      for (const v of records) for (const choice of JSON.parse(v.choices)) counts[choice] = (counts[choice] ?? 0) + 1;
      const d = discussions.results.find((x) => x.stage === stage);
      return { stage, responses: records.length, counts, topics: d?.topics ?? 0, replies: (d?.messages ?? 0) - (d?.topics ?? 0), authors: d?.authors ?? 0 };
    }) });
  } catch (e) {
    return fail(e);
  }
}
export {
  route_exports4 as analytics,
  route_exports as create,
  route_exports3 as forum,
  route_exports2 as room
};
