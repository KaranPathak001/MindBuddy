import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExpertType, Role } from "@prisma/client";
import { z } from "zod";

const registerExpertSchema = z.object({
  type: z.enum(["STUDENT", "PSYCHIATRIST"]),
  fullName: z.string().min(2, "Full name is required"),
  bio: z.string().min(10, "Bio should be at least 10 characters"),
  collegeOrHospital: z.string().min(2, "College or hospital affiliation is required"),
  qualifications: z.string().min(2, "Qualifications are required"),
  registrationNumber: z.string().optional(),
  medicalCouncil: z.string().optional(),
  specializations: z.array(z.string()).min(1, "Select at least one specialization"),
  languages: z.array(z.string()).min(1, "Select at least one language"),
  yearsOfExperience: z.number().nonnegative().default(0),
  consultationPrice: z.number().nonnegative().default(0), // in paise
  avatarUrl: z.string().optional(),
  documentType: z.string().min(2, "Document type is required"),
  documentUrl: z.string().min(5, "Proof document URL or identifier is required"),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const validation = registerExpertSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Psychiatrist legal compliance check
    if (data.type === "PSYCHIATRIST" && (!data.registrationNumber || !data.medicalCouncil)) {
      return NextResponse.json(
        {
          error: "Licensed Psychiatrists must provide state/national medical council registration number under Telemedicine Practice Guidelines.",
        },
        { status: 400 }
      );
    }

    // Check if user already registered an expert profile
    const existing = await prisma.expertProfile.findUnique({
      where: { userId: user.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An expert profile already exists for your account" },
        { status: 400 }
      );
    }

    // Create profile + verification document in atomic transaction
    const profile = await prisma.$transaction(async (tx) => {
      const newProfile = await tx.expertProfile.create({
        data: {
          userId: user.id,
          type: data.type as ExpertType,
          fullName: data.fullName,
          bio: data.bio,
          collegeOrHospital: data.collegeOrHospital,
          qualifications: data.qualifications,
          registrationNumber: data.registrationNumber || null,
          medicalCouncil: data.medicalCouncil || null,
          specializations: data.specializations,
          languages: data.languages,
          yearsOfExperience: data.yearsOfExperience,
          consultationPrice: data.consultationPrice,
          avatarUrl: data.avatarUrl || user.avatarUrl,
          verificationStatus: "PENDING",
        },
      });

      await tx.expertVerification.create({
        data: {
          expertProfileId: newProfile.id,
          documentType: data.documentType,
          documentUrl: data.documentUrl,
          status: "PENDING",
        },
      });

      // Update user role to match applicant type
      await tx.user.update({
        where: { id: user.id },
        data: {
          role: data.type === "PSYCHIATRIST" ? Role.PSYCHIATRIST : Role.MEDICAL_STUDENT,
        },
      });

      return newProfile;
    });

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully. It will be reviewed by admin verification team.",
      profile,
    });
  } catch (error: any) {
    console.error("Expert Registration Error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit verification" }, { status: 500 });
  }
}
