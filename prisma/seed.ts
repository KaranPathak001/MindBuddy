import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CIRCLES = [
  {
    name: "Exam & Academic Pressure",
    slug: "exam-academic-pressure",
    description: "Support space for entrance exams, college grades, burnout, and career anxiety in India.",
    icon: "book-open",
  },
  {
    name: "Loneliness & Social Anxiety",
    slug: "loneliness-social-anxiety",
    description: "Connect with understanding peers when making friends or feeling isolated feels heavy.",
    icon: "users",
  },
  {
    name: "Mindfulness & Daily Habits",
    slug: "mindfulness-daily-habits",
    description: "Gentle daily routines, meditation, sleep hygiene, and holistic wellness discussions.",
    icon: "sparkles",
  },
  {
    name: "Career & Identity",
    slug: "career-identity",
    description: "Navigating parental expectations, identity struggles, job hunts, and passion discovery.",
    icon: "compass",
  },
  {
    name: "Safe Expression & Venting",
    slug: "safe-expression-venting",
    description: "A respectful, confidential, anonymous space to express whatever is on your heart without judgment.",
    icon: "heart-handshake",
  },
];

async function main() {
  console.log("Seeding default MindHaven Circles...");

  for (const circle of DEFAULT_CIRCLES) {
    await prisma.circle.upsert({
      where: { slug: circle.slug },
      update: {
        name: circle.name,
        description: circle.description,
        icon: circle.icon,
      },
      create: {
        name: circle.name,
        slug: circle.slug,
        description: circle.description,
        icon: circle.icon,
        memberCount: 0,
      },
    });
  }

  console.log(`Successfully seeded ${DEFAULT_CIRCLES.length} MindHaven Circles.`);
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
