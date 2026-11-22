/**
 * prisma/seed-demo.ts
 * ===================
 * Idempotent demo data seed for MindHaven.
 * Safe to run multiple times — uses upsert everywhere.
 *
 * Usage:
 *   npm run db:seed:demo          # seed
 *   npm run db:clean:demo         # delete all @demo.mindhaven.local data
 *
 * Production guard: set ALLOW_DEMO_SEED=true to override.
 */

import { PrismaClient, ConversationPreference, ConnectionStatus, VerificationStatus, ExpertType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// ── Production Guard ──────────────────────────────────────────────────────────
if (
  process.env.NODE_ENV === "production" &&
  process.env.ALLOW_DEMO_SEED !== "true"
) {
  console.error(
    "🚫  REFUSING to run demo seed in production.\n" +
    "    Set ALLOW_DEMO_SEED=true to override (use with extreme caution)."
  );
  process.exit(1);
}

const isClean = process.argv.includes("--clean");
const DEMO_DOMAIN = "@demo.mindhaven.local";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Demo@12345";

const prisma = new PrismaClient({ log: ["warn", "error"] });

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

// ── Clean Mode ────────────────────────────────────────────────────────────────
async function cleanDemo() {
  console.log("🧹  Cleaning all demo data (@demo.mindhaven.local)…");

  // Find all demo users
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
    select: { id: true },
  });
  const demoIds = demoUsers.map((u) => u.id);

  if (demoIds.length === 0) {
    console.log("   Nothing to clean.");
    return;
  }

  // Delete circle posts authored by demo users (cascade handles comments/likes)
  await prisma.circlePost.deleteMany({ where: { userId: { in: demoIds } } });

  // Delete demo users (cascade handles everything else)
  const { count } = await prisma.user.deleteMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
  });

  // Fix circle member counts
  const circles = await prisma.circle.findMany({ select: { id: true } });
  for (const c of circles) {
    const cnt = await prisma.circleMember.count({ where: { circleId: c.id } });
    await prisma.circle.update({
      where: { id: c.id },
      data: { memberCount: cnt },
    });
  }

  console.log(`✅  Deleted ${count} demo user(s) and all related data.`);
}

// ── Main Seed ─────────────────────────────────────────────────────────────────
async function main() {
  if (isClean) {
    await cleanDemo();
    return;
  }

  console.log("🌱  Seeding demo data for MindHaven…");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 0 — Ensure default circles exist
  // ═══════════════════════════════════════════════════════════════════════════
  const defaultCircles = [
    { name: "Exam Stress", slug: "exam-stress", description: "A safe space to talk about academic pressure, board exams, entrance tests, and study burnout.", icon: "book" },
    { name: "Hostel Life", slug: "hostel-life", description: "Share experiences about living away from home — homesickness, roommates, food, and independence.", icon: "home" },
    { name: "Career & Placements", slug: "career-placements", description: "Discussions about internships, job hunting, campus placements, and career anxiety.", icon: "briefcase" },
    { name: "Relationships", slug: "relationships", description: "Talk about friendships, family dynamics, romantic relationships, and social boundaries.", icon: "heart" },
    { name: "Mindfulness & Self-care", slug: "mindfulness", description: "Meditation, journaling, breathing exercises, sleep hygiene, and daily wellness habits.", icon: "leaf" },
  ];

  const circleMap: Record<string, string> = {};
  for (const c of defaultCircles) {
    const circle = await prisma.circle.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, icon: c.icon },
      create: { name: c.name, slug: c.slug, description: c.description, icon: c.icon },
    });
    circleMap[c.slug] = circle.id;
  }
  console.log("   ✓ Default circles ready");

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — 12 Demo Peer Users
  // ═══════════════════════════════════════════════════════════════════════════
  const peerData = [
    { n: 1,  displayName: "StarGazer",   avatarIndex: 1,  lang: "English", pref: ConversationPreference.LISTEN,            interests: ["College Life", "Mindfulness", "Night Owl", "Journaling"],                   bio: "Late-night philosopher who finds peace stargazing on the terrace. Here to listen and understand, not to judge." },
    { n: 2,  displayName: "CalmWave",    avatarIndex: 2,  lang: "Hindi",   pref: ConversationPreference.SHARE,             interests: ["Mindfulness", "Music", "Anxiety Support", "Walking"],                       bio: "संगीत और meditation मेरी दोस्त हैं। Anxiety के साथ जीना सीखा है — share करना अच्छा लगता है।" },
    { n: 3,  displayName: "ZenRunner",   avatarIndex: 3,  lang: "English", pref: ConversationPreference.CASUAL,            interests: ["Fitness", "College Life", "Career Stress", "Walking"],                      bio: "5km every morning keeps the overthinking away. Talk to me about anything — fitness, campus chaos, or just life." },
    { n: 4,  displayName: "MoonJournal", avatarIndex: 4,  lang: "Marathi", pref: ConversationPreference.FRIENDS,           interests: ["Journaling", "Reading", "Art", "Mindfulness", "Night Owl"],                  bio: "रोज रात्री journal लिहितो. Art आणि reading माझे therapy आहे. नवीन मित्र बनवायला आवडतात." },
    { n: 5,  displayName: "QuietCoder",  avatarIndex: 5,  lang: "English", pref: ConversationPreference.SIMILAR_INTERESTS, interests: ["Study Habits", "Career Stress", "College Life", "Night Owl", "Reading"],    bio: "CS final year. Debugging code and feelings simultaneously. DM me if you're also surviving on chai and deadlines." },
    { n: 6,  displayName: "NightOwlDev", avatarIndex: 6,  lang: "English", pref: ConversationPreference.CASUAL,            interests: ["Night Owl", "Study Habits", "Music", "Career Stress"],                      bio: "My commit history says 2 AM every day. If you're awake too, let's chat about anything non-technical for a change." },
    { n: 7,  displayName: "DawnWalker",  avatarIndex: 7,  lang: "Bengali", pref: ConversationPreference.LISTEN,            interests: ["Walking", "Mindfulness", "Journaling", "Fitness", "Reading"],               bio: "আমি সকালের মানুষ। হাঁটতে হাঁটতে মাথা পরিষ্কার হয়। শুনতে ভালোবাসি।" },
    { n: 8,  displayName: "IndigoMind",  avatarIndex: 8,  lang: "Hindi",   pref: ConversationPreference.SHARE,             interests: ["Art", "Anxiety Support", "Mindfulness", "Music"],                           bio: "Art मेरी भाषा है। Anxiety के बारे में खुलकर बात करना ज़रूरी है। यहाँ safe space है।" },
    { n: 9,  displayName: "SilverLake",  avatarIndex: 9,  lang: "English", pref: ConversationPreference.FRIENDS,           interests: ["College Life", "Relationships", "Reading", "Music", "Journaling"],           bio: "Second year student dealing with the gap between expectation and reality. Books and good conversations keep me sane." },
    { n: 10, displayName: "EmberFlow",   avatarIndex: 10, lang: "English", pref: ConversationPreference.CASUAL,            interests: ["Fitness", "Career Stress", "Anxiety Support", "Walking", "Study Habits"],   bio: "Gymrat by day, overthinker by night. Placement season is a lot — let's talk it through together." },
    { n: 11, displayName: "CosmicLeaf",  avatarIndex: 11, lang: "Hindi",   pref: ConversationPreference.SIMILAR_INTERESTS, interests: ["Mindfulness", "Journaling", "Art", "Night Owl"],                           bio: "थोड़ा shy हूँ, यहाँ slowly खुल रहा हूँ। Offline हूँ अभी।",         isAvailable: false },
    { n: 12, displayName: "TerraNote",   avatarIndex: 12, lang: "Marathi", pref: ConversationPreference.LISTEN,            interests: ["Reading", "College Life", "Relationships", "Walking"],                      bio: "सध्या थोडा busy आहे, पण लवकरच परत येईन.", isAvailable: false },
  ];

  const peerUsers: { id: string; email: string }[] = [];
  for (const p of peerData) {
    const email = `demo.peer${p.n}${DEMO_DOMAIN}`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: p.displayName, passwordHash },
      create: {
        email,
        name: p.displayName,
        passwordHash,
        role: Role.USER,
        isSuspended: false,
      },
    });
    await prisma.peerProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: p.displayName,
        avatarIndex: p.avatarIndex,
        bio: p.bio,
        interests: p.interests,
        preferredLanguage: p.lang,
        conversationPreference: p.pref,
        isAvailable: p.isAvailable ?? true,
      },
      create: {
        userId: user.id,
        displayName: p.displayName,
        avatarIndex: p.avatarIndex,
        bio: p.bio,
        interests: p.interests,
        preferredLanguage: p.lang,
        conversationPreference: p.pref,
        isAvailable: p.isAvailable ?? true,
      },
    });
    peerUsers.push({ id: user.id, email });
  }
  console.log("   ✓ 12 demo peer users ready");

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Main demo login user
  // ═══════════════════════════════════════════════════════════════════════════
  const demoEmail = `demo.user${DEMO_DOMAIN}`;
  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { name: "Demo User", passwordHash },
    create: {
      email: demoEmail,
      name: "Demo User",
      passwordHash,
      role: Role.USER,
      isSuspended: false,
    },
  });
  await prisma.peerProfile.upsert({
    where: { userId: demoUser.id },
    update: {
      displayName: "LotusPath",
      avatarIndex: 5,
      bio: "Just a regular student trying to figure things out, one day at a time. Here to connect, listen, and grow.",
      interests: ["College Life", "Mindfulness", "Journaling", "Anxiety Support", "Reading"],
      preferredLanguage: "English",
      conversationPreference: ConversationPreference.FRIENDS,
      isAvailable: true,
    },
    create: {
      userId: demoUser.id,
      displayName: "LotusPath",
      avatarIndex: 5,
      bio: "Just a regular student trying to figure things out, one day at a time. Here to connect, listen, and grow.",
      interests: ["College Life", "Mindfulness", "Journaling", "Anxiety Support", "Reading"],
      preferredLanguage: "English",
      conversationPreference: ConversationPreference.FRIENDS,
      isAvailable: true,
    },
  });
  console.log("   ✓ Main demo.user ready");

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Circle memberships + posts + comments + likes
  // ═══════════════════════════════════════════════════════════════════════════

  // Members per circle: assign demo.user + selected peers
  const membershipPlan: Record<string, string[]> = {
    "exam-stress":       [demoUser.id, peerUsers[0].id, peerUsers[1].id, peerUsers[4].id, peerUsers[5].id, peerUsers[8].id, peerUsers[9].id],
    "hostel-life":       [demoUser.id, peerUsers[2].id, peerUsers[3].id, peerUsers[6].id, peerUsers[8].id],
    "career-placements": [demoUser.id, peerUsers[4].id, peerUsers[5].id, peerUsers[9].id, peerUsers[1].id],
    "relationships":     [demoUser.id, peerUsers[3].id, peerUsers[7].id, peerUsers[8].id, peerUsers[0].id],
    "mindfulness":       [demoUser.id, peerUsers[0].id, peerUsers[1].id, peerUsers[3].id, peerUsers[6].id, peerUsers[7].id, peerUsers[10].id],
  };

  for (const [slug, memberIds] of Object.entries(membershipPlan)) {
    const circleId = circleMap[slug];
    for (const uid of memberIds) {
      await prisma.circleMember.upsert({
        where: { circleId_userId: { circleId, userId: uid } },
        update: {},
        create: { circleId, userId: uid },
      });
    }
    // Update member count
    const cnt = await prisma.circleMember.count({ where: { circleId } });
    await prisma.circle.update({ where: { id: circleId }, data: { memberCount: cnt } });
  }
  console.log("   ✓ Circle memberships ready");

  // Helper: upsert post (by title+circleId+userId to be idempotent)
  async function upsertPost(opts: {
    circleId: string;
    userId: string;
    title: string;
    content: string;
    isAnonymous: boolean;
    createdAt: Date;
  }) {
    const existing = await prisma.circlePost.findFirst({
      where: { circleId: opts.circleId, userId: opts.userId, title: opts.title },
    });
    if (existing) return existing;
    return prisma.circlePost.create({
      data: {
        circleId: opts.circleId,
        userId: opts.userId,
        title: opts.title,
        content: opts.content,
        isAnonymous: opts.isAnonymous,
        createdAt: opts.createdAt,
      },
    });
  }

  async function upsertComment(opts: {
    postId: string;
    userId: string;
    content: string;
    isAnonymous: boolean;
    createdAt: Date;
  }) {
    const existing = await prisma.circleComment.findFirst({
      where: { postId: opts.postId, userId: opts.userId, content: opts.content },
    });
    if (existing) return existing;
    return prisma.circleComment.create({
      data: {
        postId: opts.postId,
        userId: opts.userId,
        content: opts.content,
        isAnonymous: opts.isAnonymous,
        createdAt: opts.createdAt,
      },
    });
  }

  async function upsertLike(postId: string, userId: string) {
    await prisma.circlePostLike.upsert({
      where: { postId_userId: { postId, userId } },
      update: {},
      create: { postId, userId },
    });
  }

  // ── Exam Stress posts ──
  const es = circleMap["exam-stress"];
  const p1 = await upsertPost({ circleId: es, userId: peerUsers[0].id, title: "Finals week is breaking me", content: "I have 4 papers in 5 days and I haven't slept properly in a week. The anxiety is so loud right now. How do you all manage to stay calm?", isAnonymous: true, createdAt: daysAgo(13) });
  const p2 = await upsertPost({ circleId: es, userId: peerUsers[4].id, title: "GATE prep loneliness", content: "Studying for GATE alone in the room while everyone else is hanging out is really getting to me. It's supposed to be worth it but some days I genuinely don't know.", isAnonymous: false, createdAt: daysAgo(9) });
  const p3 = await upsertPost({ circleId: es, userId: demoUser.id, title: "Anyone else feeling imposter syndrome?", content: "I got into this college with a good rank but every single day I feel like I don't belong here. All my classmates seem so much smarter. Is this normal?", isAnonymous: false, createdAt: daysAgo(5) });
  const p4 = await upsertPost({ circleId: es, userId: peerUsers[8].id, title: "Failed an internal — feeling destroyed", content: "Failed my DSA internal today. First time failing anything. I know it's not the end of the world but it feels like it. Just needed to say this somewhere safe.", isAnonymous: true, createdAt: daysAgo(2) });

  await upsertComment({ postId: p1.id, userId: peerUsers[1].id, content: "I completely understand this. Try the Pomodoro method — 25 mins study, 5 mins break. It really helped me during my boards.", isAnonymous: true, createdAt: daysAgo(13) });
  await upsertComment({ postId: p1.id, userId: peerUsers[5].id, content: "You're not alone. Finals week is brutal. Eat something warm, drink water, take it one paper at a time 💙", isAnonymous: false, createdAt: daysAgo(12) });
  await upsertComment({ postId: p2.id, userId: demoUser.id, content: "GATE prep is a marathon not a sprint. The loneliness is real but so is the payoff. Sending strength.", isAnonymous: false, createdAt: daysAgo(8) });
  await upsertComment({ postId: p3.id, userId: peerUsers[0].id, content: "100% normal. Imposter syndrome is rampant at good colleges. Everyone feels this, they just don't say it. You belong there.", isAnonymous: false, createdAt: daysAgo(5) });
  await upsertComment({ postId: p4.id, userId: peerUsers[1].id, content: "One internal doesn't define your journey. Use it to understand where the gap is. You've got this 🌱", isAnonymous: true, createdAt: daysAgo(2) });

  await upsertLike(p1.id, peerUsers[1].id);
  await upsertLike(p1.id, peerUsers[5].id);
  await upsertLike(p1.id, demoUser.id);
  await upsertLike(p3.id, peerUsers[0].id);
  await upsertLike(p3.id, peerUsers[8].id);
  await upsertLike(p4.id, peerUsers[0].id);

  // Sync likesCount
  for (const post of [p1, p2, p3, p4]) {
    const lc = await prisma.circlePostLike.count({ where: { postId: post.id } });
    await prisma.circlePost.update({ where: { id: post.id }, data: { likesCount: lc } });
  }

  // ── Hostel Life posts ──
  const hl = circleMap["hostel-life"];
  const h1 = await upsertPost({ circleId: hl, userId: peerUsers[2].id, title: "Homesickness hit different today", content: "It's my mom's birthday and I couldn't go home. Sat in my room eating maggi alone. This independence everyone talks about doesn't always feel liberating.", isAnonymous: false, createdAt: daysAgo(11) });
  const h2 = await upsertPost({ circleId: hl, userId: peerUsers[6].id, title: "Roommate conflict — help!", content: "My roommate stays up till 3 AM with lights on, talks loudly on calls, and doesn't clean. I'm afraid of confronting them. Any tips?", isAnonymous: true, createdAt: daysAgo(7) });
  const h3 = await upsertPost({ circleId: hl, userId: demoUser.id, title: "First month in hostel — honest review", content: "The room is tiny, the food is questionable, and I cry every Sunday. But I've also made 2 genuinely good friends and learned to do my own laundry. It's something.", isAnonymous: false, createdAt: daysAgo(3) });

  await upsertComment({ postId: h1.id, userId: peerUsers[3].id, content: "Call her! Even 10 minutes will make both of you feel better. Hostel life is hard but it teaches you so much about yourself.", isAnonymous: false, createdAt: daysAgo(11) });
  await upsertComment({ postId: h2.id, userId: demoUser.id, content: "Start with 'Hey, can we talk about some house rules?' — keep it casual and not accusatory. It usually helps.", isAnonymous: false, createdAt: daysAgo(6) });
  await upsertComment({ postId: h3.id, userId: peerUsers[2].id, content: "This is the most accurate hostel post I've ever read 😂 same energy, different room.", isAnonymous: false, createdAt: daysAgo(3) });

  await upsertLike(h1.id, demoUser.id);
  await upsertLike(h1.id, peerUsers[3].id);
  await upsertLike(h3.id, peerUsers[2].id);
  await upsertLike(h3.id, peerUsers[6].id);

  for (const post of [h1, h2, h3]) {
    const lc = await prisma.circlePostLike.count({ where: { postId: post.id } });
    await prisma.circlePost.update({ where: { id: post.id }, data: { likesCount: lc } });
  }

  // ── Career & Placements posts ──
  const cp = circleMap["career-placements"];
  const c1 = await upsertPost({ circleId: cp, userId: peerUsers[4].id, title: "Rejected from 12 companies — still standing", content: "12 rejections in placement season. I won't pretend it doesn't hurt. But I'm still here, still applying. For anyone else in the loop — you're not alone.", isAnonymous: false, createdAt: daysAgo(10) });
  const c2 = await upsertPost({ circleId: cp, userId: peerUsers[9].id, title: "Should I take this offer or wait?", content: "Got a 6 LPA offer from a service company. Everyone says wait for product companies but what if nothing comes? The anxiety is real.", isAnonymous: true, createdAt: daysAgo(6) });
  const c3 = await upsertPost({ circleId: cp, userId: demoUser.id, title: "Interview prep is making me lose sleep", content: "I practice LC problems till midnight, have mock interviews on weekends, and I'm still terrified. Caffeine is the only thing keeping me going. Is this sustainable?", isAnonymous: false, createdAt: daysAgo(1) });

  await upsertComment({ postId: c1.id, userId: demoUser.id, content: "Respect for sharing this. 12 rejections takes guts to talk about. You're stronger than you think.", isAnonymous: false, createdAt: daysAgo(9) });
  await upsertComment({ postId: c1.id, userId: peerUsers[1].id, content: "Same boat. What keeps me going is remembering that one yes is all it takes.", isAnonymous: true, createdAt: daysAgo(9) });
  await upsertComment({ postId: c2.id, userId: peerUsers[4].id, content: "Take the offer if you need financial security. You can always switch in 1-2 years. A bird in hand…", isAnonymous: false, createdAt: daysAgo(5) });

  await upsertLike(c1.id, demoUser.id);
  await upsertLike(c1.id, peerUsers[1].id);
  await upsertLike(c1.id, peerUsers[9].id);
  await upsertLike(c3.id, peerUsers[4].id);

  for (const post of [c1, c2, c3]) {
    const lc = await prisma.circlePostLike.count({ where: { postId: post.id } });
    await prisma.circlePost.update({ where: { id: post.id }, data: { likesCount: lc } });
  }

  // ── Relationships posts ──
  const rl = circleMap["relationships"];
  const r1 = await upsertPost({ circleId: rl, userId: peerUsers[8].id, title: "Long-distance friendship is hard", content: "My best friend from school went to a college in another city. We talk less and less. I know we're both busy but I miss them and I don't know how to say it without sounding needy.", isAnonymous: false, createdAt: daysAgo(8) });
  const r2 = await upsertPost({ circleId: rl, userId: demoUser.id, title: "Setting boundaries with family during exams", content: "Every call home turns into 'study more', 'what's your rank', 'your cousin did better'. I love my family but I need space. How do you all handle this?", isAnonymous: false, createdAt: daysAgo(4) });

  await upsertComment({ postId: r1.id, userId: peerUsers[3].id, content: "Send them a voice note instead of a text — it feels more personal and takes the pressure off a full call.", isAnonymous: false, createdAt: daysAgo(7) });
  await upsertComment({ postId: r2.id, userId: peerUsers[0].id, content: "Tell them: 'I'll call you after my exams, I'm focusing right now.' Once. Clearly. Lovingly. It works.", isAnonymous: false, createdAt: daysAgo(3) });
  await upsertComment({ postId: r2.id, userId: peerUsers[7].id, content: "This resonates so much. Family pressure is real but it comes from love, even when it doesn't feel that way.", isAnonymous: true, createdAt: daysAgo(3) });

  await upsertLike(r1.id, demoUser.id);
  await upsertLike(r2.id, peerUsers[3].id);
  await upsertLike(r2.id, peerUsers[7].id);

  for (const post of [r1, r2]) {
    const lc = await prisma.circlePostLike.count({ where: { postId: post.id } });
    await prisma.circlePost.update({ where: { id: post.id }, data: { likesCount: lc } });
  }

  // ── Mindfulness posts ──
  const mf = circleMap["mindfulness"];
  const m1 = await upsertPost({ circleId: mf, userId: peerUsers[0].id, title: "30 days of journaling — what changed", content: "I started journaling every night 30 days ago as an experiment. I sleep better, I'm less reactive, and I actually caught myself before an anxiety spiral yesterday. Highly recommend.", isAnonymous: false, createdAt: daysAgo(14) });
  const m2 = await upsertPost({ circleId: mf, userId: peerUsers[6].id, title: "5-minute morning walk changed my day", content: "সকালে মাত্র ৫ মিনিটের হাঁটা দিয়ে শুরু করলাম। সারাদিনটা আলাদাই মনে হলো। ছোট ছোট পদক্ষেপ সত্যিই কাজ করে।", isAnonymous: false, createdAt: daysAgo(7) });
  const m3 = await upsertPost({ circleId: mf, userId: demoUser.id, title: "Box breathing saved my presentation", content: "Had a major presentation today. Was shaking in the washroom. Someone in this circle had mentioned box breathing last week — tried it for 3 minutes. It actually worked. Thank you, whoever posted that.", isAnonymous: false, createdAt: daysAgo(2) });
  const m4 = await upsertPost({ circleId: mf, userId: peerUsers[1].id, title: "Affirmations in Hindi — works better for me", content: "'मैं पर्याप्त हूँ।' 'मैं कर सकता हूँ।' अपनी भाषा में affirmations ज़्यादा असर करती हैं। आज़माइए।", isAnonymous: false, createdAt: daysAgo(5) });

  await upsertComment({ postId: m1.id, userId: peerUsers[1].id, content: "30 days! That's amazing. What time do you journal — morning or night?", isAnonymous: false, createdAt: daysAgo(13) });
  await upsertComment({ postId: m1.id, userId: demoUser.id, content: "Starting today. This was the push I needed 🙏", isAnonymous: false, createdAt: daysAgo(12) });
  await upsertComment({ postId: m3.id, userId: peerUsers[0].id, content: "So glad it helped! Box breathing is underrated. 4-4-4-4 is the formula for anyone reading this.", isAnonymous: false, createdAt: daysAgo(1) });
  await upsertComment({ postId: m4.id, userId: peerUsers[6].id, content: "একদম ঠিক কথা। নিজের ভাষায় কথা বললে মনে সরাসরি পৌঁছায়।", isAnonymous: false, createdAt: daysAgo(4) });

  await upsertLike(m1.id, demoUser.id);
  await upsertLike(m1.id, peerUsers[1].id);
  await upsertLike(m1.id, peerUsers[3].id);
  await upsertLike(m1.id, peerUsers[6].id);
  await upsertLike(m2.id, demoUser.id);
  await upsertLike(m2.id, peerUsers[0].id);
  await upsertLike(m3.id, peerUsers[0].id);
  await upsertLike(m3.id, peerUsers[1].id);
  await upsertLike(m4.id, peerUsers[6].id);
  await upsertLike(m4.id, demoUser.id);

  for (const post of [m1, m2, m3, m4]) {
    const lc = await prisma.circlePostLike.count({ where: { postId: post.id } });
    await prisma.circlePost.update({ where: { id: post.id }, data: { likesCount: lc } });
  }

  console.log("   ✓ Circle posts, comments and likes ready");

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4 — Connection data for demo.user
  // ═══════════════════════════════════════════════════════════════════════════

  // 2 incoming PENDING (peer1, peer2 → demo.user)
  for (const peer of [peerUsers[0], peerUsers[1]]) {
    await prisma.connectionRequest.upsert({
      where: { senderId_receiverId: { senderId: peer.id, receiverId: demoUser.id } },
      update: {},
      create: { senderId: peer.id, receiverId: demoUser.id, status: ConnectionStatus.PENDING },
    });
    await prisma.notification.create({
      data: {
        userId: demoUser.id,
        title: "New connection request",
        message: "Someone wants to connect with you on MindHaven.",
        type: "REQUEST",
        link: "/circle?tab=requests",
        isRead: false,
        createdAt: daysAgo(3),
      },
    }).catch(() => {}); // idempotent: ignore duplicates
  }

  // 1 outgoing PENDING (demo.user → peer3)
  await prisma.connectionRequest.upsert({
    where: { senderId_receiverId: { senderId: demoUser.id, receiverId: peerUsers[2].id } },
    update: {},
    create: { senderId: demoUser.id, receiverId: peerUsers[2].id, status: ConnectionStatus.PENDING },
  });

  // 1 ACCEPTED (demo.user ↔ peer4)
  await prisma.connectionRequest.upsert({
    where: { senderId_receiverId: { senderId: demoUser.id, receiverId: peerUsers[3].id } },
    update: { status: ConnectionStatus.ACCEPTED },
    create: { senderId: demoUser.id, receiverId: peerUsers[3].id, status: ConnectionStatus.ACCEPTED },
  });

  // PeerConversation for demo.user ↔ peer4
  let convo = await prisma.peerConversation.findFirst({
    where: {
      members: {
        every: { userId: { in: [demoUser.id, peerUsers[3].id] } },
      },
    },
    include: { members: true },
  });

  if (!convo) {
    convo = await prisma.peerConversation.create({
      data: {
        isAnonymous: false,
        lastActivity: hoursAgo(2),
        members: {
          create: [
            { userId: demoUser.id, unreadCount: 2 },
            { userId: peerUsers[3].id, unreadCount: 0 },
          ],
        },
      },
      include: { members: true },
    });
  } else {
    // Ensure demo user member has unreadCount 2
    const demoMember = convo.members.find((m) => m.userId === demoUser.id);
    if (demoMember) {
      await prisma.peerConversationMember.update({
        where: { id: demoMember.id },
        data: { unreadCount: 2 },
      });
    }
  }

  // 6-8 realistic messages
  const msgExists = await prisma.peerMessage.count({ where: { conversationId: convo.id } });
  if (msgExists === 0) {
    const messages = [
      { senderId: peerUsers[3].id, content: "Hey! I saw you're also into journaling and anxiety support. How long have you been doing it?", createdAt: daysAgo(5) },
      { senderId: demoUser.id, content: "Oh hi! Yeah, about 2 months now. Started when exams were getting to me. It really helps honestly.", createdAt: daysAgo(5) },
      { senderId: peerUsers[3].id, content: "Same here. रोज रात्री लिहितो. Anxiety थोडी कमी झाली आहे. Have you tried any specific prompts?", createdAt: daysAgo(4) },
      { senderId: demoUser.id, content: "Yes! I do '3 things I noticed today' and '1 thing I'm grateful for'. Simple but effective.", createdAt: daysAgo(4) },
      { senderId: peerUsers[3].id, content: "That's beautiful. I'll try the gratitude one tonight. Sometimes I forget the small good things.", createdAt: daysAgo(3) },
      { senderId: demoUser.id, content: "Exactly. And even on bad days, there's usually at least one tiny thing — a good cup of chai, a song you like, anything.", createdAt: daysAgo(3) },
      { senderId: peerUsers[3].id, content: "🍵 You're right. Thanks for this — genuinely made my day a bit lighter.", createdAt: hoursAgo(3) },
      { senderId: peerUsers[3].id, content: "Also — have you heard about the expert connect feature here? Thinking of booking a session.", createdAt: hoursAgo(2) },
    ];
    for (const msg of messages) {
      await prisma.peerMessage.create({
        data: {
          conversationId: convo.id,
          senderId: msg.senderId,
          content: msg.content,
          createdAt: msg.createdAt,
        },
      });
    }
    // Update lastActivity on conversation
    await prisma.peerConversation.update({
      where: { id: convo.id },
      data: { lastActivity: hoursAgo(2) },
    });
  }

  // Notification for accepted connection
  await prisma.notification.create({
    data: {
      userId: demoUser.id,
      title: "Connection accepted!",
      message: "MoonJournal accepted your connection request.",
      type: "MATCH",
      link: "/circle?tab=chats",
      isRead: false,
      createdAt: daysAgo(5),
    },
  }).catch(() => {});

  console.log("   ✓ Connection data and conversation ready");

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5 — 8 Expert Users + ExpertProfiles
  // ═══════════════════════════════════════════════════════════════════════════

  const expertData = [
    // PSYCHIATRISTS (4)
    {
      n: 1,
      type: ExpertType.PSYCHIATRIST,
      fullName: "Dr. Arjun Mehra",
      role: Role.PSYCHIATRIST,
      qualifications: "MBBS, MD Psychiatry",
      collegeOrHospital: "Fictional Metro Hospital, Mumbai",
      registrationNumber: "DEMO-MCI-2024-001",
      specializations: ["Anxiety", "Depression", "Burnout"],
      languages: ["English", "Hindi"],
      yearsOfExperience: 8,
      consultationPrice: 120000,
      isAvailableNow: true,
      bio: "FICTIONAL PROFILE — for demo only. 8 years helping young adults navigate anxiety, depression, and academic burnout in a non-judgmental, evidence-based approach.",
      reviews: [
        { peerIdx: 0, rating: 5, comment: "Very compassionate and clear in his explanations. Felt genuinely heard." },
        { peerIdx: 1, rating: 5, comment: "Helped me understand my anxiety patterns. Highly recommend." },
        { peerIdx: 8, rating: 4, comment: "Professional and kind. Good listener." },
      ],
    },
    {
      n: 2,
      type: ExpertType.PSYCHIATRIST,
      fullName: "Dr. Priya Nair",
      role: Role.PSYCHIATRIST,
      qualifications: "MBBS, DPM",
      collegeOrHospital: "Fictional Wellness Clinic, Bengaluru",
      registrationNumber: "DEMO-MCI-2024-002",
      specializations: ["Sleep", "Relationships", "Depression"],
      languages: ["English", "Marathi"],
      yearsOfExperience: 5,
      consultationPrice: 80000,
      isAvailableNow: true,
      bio: "FICTIONAL PROFILE — for demo only. Specializes in sleep disorders and relationship stress among college students. Warm, approachable style.",
      reviews: [
        { peerIdx: 2, rating: 5, comment: "She made me feel so comfortable talking about my sleep issues." },
        { peerIdx: 3, rating: 4, comment: "Great session. Practical advice that actually helped." },
      ],
    },
    {
      n: 3,
      type: ExpertType.PSYCHIATRIST,
      fullName: "Dr. Rohan Kapoor",
      role: Role.PSYCHIATRIST,
      qualifications: "MBBS, MD Psychiatry, DNB",
      collegeOrHospital: "Fictional Central Institute of Mental Health, Delhi",
      registrationNumber: "DEMO-MCI-2024-003",
      specializations: ["Exam Stress", "Anxiety", "Career Stress"],
      languages: ["English", "Hindi"],
      yearsOfExperience: 12,
      consultationPrice: 150000,
      isAvailableNow: false,
      bio: "FICTIONAL PROFILE — for demo only. 12 years working with students preparing for competitive exams. Known for practical coping strategies and CBT techniques.",
      reviews: [
        { peerIdx: 4, rating: 5, comment: "His CBT techniques actually changed how I approach my study anxiety." },
        { peerIdx: 9, rating: 5, comment: "Excellent session. Worth every rupee." },
        { peerIdx: 5, rating: 4, comment: "Very experienced. Gave me tools I still use daily." },
      ],
    },
    {
      n: 4,
      type: ExpertType.PSYCHIATRIST,
      fullName: "Dr. Sneha Iyer",
      role: Role.PSYCHIATRIST,
      qualifications: "MBBS, MD Psychiatry",
      collegeOrHospital: "Fictional Sunrise Mental Health Centre, Chennai",
      registrationNumber: "DEMO-MCI-2024-004",
      specializations: ["Depression", "Burnout", "Relationships"],
      languages: ["English"],
      yearsOfExperience: 6,
      consultationPrice: 100000,
      isAvailableNow: false,
      bio: "FICTIONAL PROFILE — for demo only. Focused on helping young adults deal with burnout and relationship challenges. Uses a holistic mind-body approach.",
      reviews: [
        { peerIdx: 6, rating: 4, comment: "Very thoughtful approach. Left the session with clarity." },
        { peerIdx: 7, rating: 5, comment: "She truly listens. Best consultation I've had." },
      ],
    },
    // STUDENTS — MBBS Listeners (4)
    {
      n: 5,
      type: ExpertType.STUDENT,
      fullName: "Anika Sharma",
      role: Role.MEDICAL_STUDENT,
      qualifications: "MBBS 4th Year",
      collegeOrHospital: "Fictional Government Medical College, Pune",
      registrationNumber: undefined,
      specializations: ["Anxiety Support", "Exam Stress", "Mindfulness"],
      languages: ["English", "Hindi", "Marathi"],
      yearsOfExperience: 0,
      consultationPrice: 25000,
      isAvailableNow: true,
      bio: "FICTIONAL PROFILE — for demo only. MBBS student and trained active listener. I know firsthand how hard exam stress is. Here to listen without judgment.",
      reviews: [
        { peerIdx: 0, rating: 5, comment: "So warm and understanding. Felt like talking to a knowledgeable friend." },
        { peerIdx: 2, rating: 5, comment: "Great listener, very empathetic. Would talk to her again." },
      ],
    },
    {
      n: 6,
      type: ExpertType.STUDENT,
      fullName: "Kabir Verma",
      role: Role.MEDICAL_STUDENT,
      qualifications: "MBBS 3rd Year",
      collegeOrHospital: "Fictional Rajiv Gandhi Medical College, Bhopal",
      registrationNumber: undefined,
      specializations: ["Career Stress", "Relationships", "Burnout"],
      languages: ["English", "Hindi"],
      yearsOfExperience: 0,
      consultationPrice: 15000,
      isAvailableNow: true,
      bio: "FICTIONAL PROFILE — for demo only. Future doctor, current listener. Went through placement anxiety last year. Happy to chat about career stress and overthinking.",
      reviews: [
        { peerIdx: 4, rating: 4, comment: "Really helpful perspective from someone who went through similar things." },
        { peerIdx: 9, rating: 5, comment: "Great conversation. He's very relatable." },
      ],
    },
    {
      n: 7,
      type: ExpertType.STUDENT,
      fullName: "Divya Menon",
      role: Role.MEDICAL_STUDENT,
      qualifications: "MBBS Final Year",
      collegeOrHospital: "Fictional Amrita Medical College, Kochi",
      registrationNumber: undefined,
      specializations: ["Sleep", "Mindfulness", "Anxiety Support"],
      languages: ["English"],
      yearsOfExperience: 0,
      consultationPrice: 10000,
      isAvailableNow: false,
      bio: "FICTIONAL PROFILE — for demo only. Almost-doctor who loves talking about sleep hygiene and mindfulness. Trained in mental health first aid.",
      reviews: [
        { peerIdx: 6, rating: 5, comment: "She gave me practical sleep tips that actually work." },
        { peerIdx: 7, rating: 4, comment: "Very calm and reassuring presence. Good chat." },
      ],
    },
    {
      n: 8,
      type: ExpertType.STUDENT,
      fullName: "Rahul Desai",
      role: Role.MEDICAL_STUDENT,
      qualifications: "MBBS 2nd Year",
      collegeOrHospital: "Fictional BJ Medical College, Ahmedabad",
      registrationNumber: undefined,
      specializations: ["Depression", "Exam Stress", "College Life"],
      languages: ["English", "Hindi", "Marathi"],
      yearsOfExperience: 0,
      consultationPrice: 30000,
      isAvailableNow: false,
      bio: "FICTIONAL PROFILE — for demo only. Second year med student. Passionate about mental health awareness and peer support in colleges. Here to talk, no labels, no pressure.",
      reviews: [
        { peerIdx: 1, rating: 4, comment: "Very understanding. Easy to open up to." },
        { peerIdx: 3, rating: 5, comment: "Great session. Really helped me sort my thoughts." },
      ],
    },
  ];

  for (const e of expertData) {
    const email = `demo.expert${e.n}${DEMO_DOMAIN}`;
    const expertUser = await prisma.user.upsert({
      where: { email },
      update: { name: e.fullName, passwordHash },
      create: {
        email,
        name: e.fullName,
        passwordHash,
        role: e.role,
        isSuspended: false,
      },
    });

    const expertProfile = await prisma.expertProfile.upsert({
      where: { userId: expertUser.id },
      update: {
        type: e.type,
        fullName: e.fullName,
        bio: e.bio,
        qualifications: e.qualifications,
        collegeOrHospital: e.collegeOrHospital,
        registrationNumber: e.registrationNumber ?? null,
        specializations: e.specializations,
        languages: e.languages,
        yearsOfExperience: e.yearsOfExperience,
        consultationPrice: e.consultationPrice,
        isAvailableNow: e.isAvailableNow,
        verificationStatus: VerificationStatus.APPROVED,
      },
      create: {
        userId: expertUser.id,
        type: e.type,
        fullName: e.fullName,
        bio: e.bio,
        qualifications: e.qualifications,
        collegeOrHospital: e.collegeOrHospital,
        registrationNumber: e.registrationNumber ?? null,
        specializations: e.specializations,
        languages: e.languages,
        yearsOfExperience: e.yearsOfExperience,
        consultationPrice: e.consultationPrice,
        isAvailableNow: e.isAvailableNow,
        verificationStatus: VerificationStatus.APPROVED,
        averageRating: 5.0,
        totalReviews: 0,
      },
    });

    // ExpertVerification row
    const existingVerif = await prisma.expertVerification.findFirst({
      where: { expertProfileId: expertProfile.id },
    });
    if (!existingVerif) {
      await prisma.expertVerification.create({
        data: {
          expertProfileId: expertProfile.id,
          documentType: "REGISTRATION_CERTIFICATE",
          documentUrl: "https://example.com/demo-doc-placeholder.pdf",
          status: VerificationStatus.APPROVED,
          notes: "Demo account — auto-approved for seeding purposes.",
          reviewedAt: new Date(),
        },
      });
    }

    // ExpertAvailability — Mon–Fri 10:00–18:00
    for (let day = 1; day <= 5; day++) {
      const existing = await prisma.expertAvailability.findFirst({
        where: { expertProfileId: expertProfile.id, dayOfWeek: day },
      });
      if (!existing) {
        await prisma.expertAvailability.create({
          data: {
            expertProfileId: expertProfile.id,
            dayOfWeek: day,
            startTime: "10:00",
            endTime: "18:00",
            slotDuration: 30,
            isActive: true,
          },
        });
      }
    }

    // Reviews
    const totalRatings: number[] = [];
    for (const rev of e.reviews) {
      const reviewer = peerUsers[rev.peerIdx];
      await prisma.review.upsert({
        where: { userId_expertProfileId: { userId: reviewer.id, expertProfileId: expertProfile.id } },
        update: { rating: rev.rating, comment: rev.comment },
        create: {
          userId: reviewer.id,
          expertProfileId: expertProfile.id,
          rating: rev.rating,
          comment: rev.comment,
          createdAt: daysAgo(Math.floor(Math.random() * 14) + 1),
        },
      });
      totalRatings.push(rev.rating);
    }

    // Update averageRating + totalReviews
    const avg = totalRatings.length > 0
      ? totalRatings.reduce((a, b) => a + b, 0) / totalRatings.length
      : 5.0;
    await prisma.expertProfile.update({
      where: { id: expertProfile.id },
      data: {
        averageRating: Math.round(avg * 10) / 10,
        totalReviews: totalRatings.length,
      },
    });
  }

  console.log("   ✓ 8 demo experts ready");
  console.log("\n🎉  Demo seed complete!");
  console.log("   Login: demo.user@demo.mindhaven.local / " + DEMO_PASSWORD);
  console.log("   Run again anytime — it's fully idempotent.");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
