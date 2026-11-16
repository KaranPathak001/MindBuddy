import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ExpertType, VerificationStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type"); // "STUDENT" | "PSYCHIATRIST"
    const search = searchParams.get("search") || "";
    const specialization = searchParams.get("specialization") || "";
    const language = searchParams.get("language") || "";
    const availableNow = searchParams.get("availableNow") === "true";
    const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!, 10) : undefined;

    const whereClause: any = {
      verificationStatus: VerificationStatus.APPROVED,
    };

    if (typeParam === "STUDENT") {
      whereClause.type = ExpertType.STUDENT;
    } else if (typeParam === "PSYCHIATRIST") {
      whereClause.type = ExpertType.PSYCHIATRIST;
    }

    if (availableNow) {
      whereClause.isAvailableNow = true;
    }

    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      whereClause.consultationPrice = { lte: maxPrice };
    }

    if (search.trim()) {
      whereClause.OR = [
        { fullName: { contains: search.trim(), mode: "insensitive" } },
        { bio: { contains: search.trim(), mode: "insensitive" } },
        { collegeOrHospital: { contains: search.trim(), mode: "insensitive" } },
        { qualifications: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    if (specialization.trim()) {
      whereClause.specializations = { has: specialization.trim() };
    }

    if (language.trim()) {
      whereClause.languages = { has: language.trim() };
    }

    let experts = await prisma.expertProfile.findMany({
      where: whereClause,
      include: {
        availabilities: {
          where: { isActive: true },
        },
        reviews: {
          take: 3,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { name: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: [
        { isAvailableNow: "desc" },
        { averageRating: "desc" },
      ],
    });

    // Provide default curated initial experts if database table is empty for instant demonstration
    if (experts.length === 0 && !search && !specialization && !language) {
      const demoExperts = getDemoExperts(typeParam);
      return NextResponse.json({ experts: demoExperts, isDemo: true });
    }

    return NextResponse.json({ experts, isDemo: false });
  } catch (error) {
    console.error("Fetch Experts Error:", error);
    // Return gracefully with demo data so UI never breaks
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    return NextResponse.json({ experts: getDemoExperts(typeParam), isDemo: true });
  }
}

function getDemoExperts(typeParam: string | null) {
  const allDemo = [
    {
      id: "exp-dr-sharma",
      type: "PSYCHIATRIST",
      fullName: "Dr. Ananya Sharma, MD",
      avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
      bio: "Senior Consultant Psychiatrist with over 11 years of experience in youth mental health, anxiety disorders, and depression management. Clinical Member of Indian Psychiatric Society.",
      collegeOrHospital: "NIMHANS, Bangalore / AIIMS Alumni",
      qualifications: "MBBS, MD (Psychiatry)",
      registrationNumber: "MCI/DMC-74892",
      medicalCouncil: "Delhi Medical Council",
      specializations: ["Depression", "Anxiety & Panic", "Youth Wellness", "Exam Burnout"],
      languages: ["English", "Hindi"],
      yearsOfExperience: 11,
      consultationPrice: 79900, // Rs 799
      isAvailableNow: true,
      verificationStatus: "APPROVED",
      averageRating: 4.95,
      totalReviews: 142,
      availabilities: [
        { id: "av1", dayOfWeek: 1, startTime: "10:00", endTime: "18:00", slotDuration: 30, isActive: true },
        { id: "av2", dayOfWeek: 2, startTime: "10:00", endTime: "18:00", slotDuration: 30, isActive: true },
      ],
      reviews: [
        { id: "r1", rating: 5, comment: "Deeply empathetic, non-judgmental, and prescribed actionable behavioral habits.", user: { name: "Rohan V.", avatarUrl: null } },
      ],
    },
    {
      id: "exp-dr-verma",
      type: "PSYCHIATRIST",
      fullName: "Dr. Vikramaditya Verma",
      avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
      bio: "Consultant Psychiatrist specializing in cognitive behavioral therapy, adolescent emotional regulation, and stress resilience.",
      collegeOrHospital: "Fortis Healthcare / KGMU Lucknow",
      qualifications: "MBBS, DPM (Psychiatry)",
      registrationNumber: "UPMC-89312",
      medicalCouncil: "Uttar Pradesh Medical Council",
      specializations: ["Academic Stress", "ADHD", "Sleep Disorders", "Relationships"],
      languages: ["English", "Hindi"],
      yearsOfExperience: 8,
      consultationPrice: 65000, // Rs 650
      isAvailableNow: false,
      verificationStatus: "APPROVED",
      averageRating: 4.88,
      totalReviews: 89,
      availabilities: [
        { id: "av3", dayOfWeek: 3, startTime: "14:00", endTime: "20:00", slotDuration: 30, isActive: true },
      ],
      reviews: [
        { id: "r2", rating: 5, comment: "Helped me navigate severe college placement anxiety with patience.", user: { name: "Pooja K.", avatarUrl: null } },
      ],
    },
    {
      id: "exp-stu-priya",
      type: "STUDENT",
      fullName: "Priya Nair (MBBS Intern)",
      avatarUrl: "https://images.unsplash.com/photo-1594824813511-2092f6d90cf6?w=150&auto=format&fit=crop&q=80",
      bio: "Final year MBBS Student at Grant Medical College Mumbai. Passionate peer listener focused on general youth wellness, hostel life adjustments, and exam stress management. (Non-clinical support only).",
      collegeOrHospital: "Grant Government Medical College, Mumbai",
      qualifications: "Final Year MBBS Student / Intern",
      registrationNumber: null,
      medicalCouncil: null,
      specializations: ["Peer Listening", "College Life Adjustments", "Hostel Loneliness", "Study Habits"],
      languages: ["English", "Hindi", "Marathi"],
      yearsOfExperience: 2,
      consultationPrice: 14900, // Rs 149
      isAvailableNow: true,
      verificationStatus: "APPROVED",
      averageRating: 4.92,
      totalReviews: 76,
      availabilities: [
        { id: "av4", dayOfWeek: 1, startTime: "16:00", endTime: "22:00", slotDuration: 20, isActive: true },
      ],
      reviews: [
        { id: "r3", rating: 5, comment: "It felt like talking to an understanding elder sister who truly gets campus pressure.", user: { name: "Sameer T.", avatarUrl: null } },
      ],
    },
    {
      id: "exp-stu-arjun",
      type: "STUDENT",
      fullName: "Arjun Mukherjee (MBBS 4th Year)",
      avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
      bio: "4th Year MBBS student passionate about youth preventive health, fitness routines, and overcoming social anxiety on campus. (Non-clinical peer guide).",
      collegeOrHospital: "Medical College Kolkata",
      qualifications: "MBBS 4th Year Student",
      registrationNumber: null,
      medicalCouncil: null,
      specializations: ["Healthy Habits", "Social Anxiety", "Exam Phobia", "Work-Life Balance"],
      languages: ["English", "Hindi", "Bengali"],
      yearsOfExperience: 1,
      consultationPrice: 9900, // Rs 99
      isAvailableNow: false,
      verificationStatus: "APPROVED",
      averageRating: 4.85,
      totalReviews: 54,
      availabilities: [
        { id: "av5", dayOfWeek: 2, startTime: "18:00", endTime: "23:00", slotDuration: 20, isActive: true },
      ],
      reviews: [
        { id: "r4", rating: 5, comment: "Super grounded advice on daily study routines and sleep hygiene.", user: { name: "Aditi S.", avatarUrl: null } },
      ],
    },
  ];

  if (typeParam === "STUDENT") {
    return allDemo.filter((e) => e.type === "STUDENT");
  }
  if (typeParam === "PSYCHIATRIST") {
    return allDemo.filter((e) => e.type === "PSYCHIATRIST");
  }
  return allDemo;
}
