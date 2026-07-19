const { PrismaClient, UserRole, UserStatus } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function optionalEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

async function main() {
  const email = requireEnv("PROD_MASTER_EMAIL").toLowerCase();
  const password = requireEnv("PROD_MASTER_PASSWORD");
  const companyName = requireEnv("PROD_COMPANY_NAME");

  if (password.length < 8) {
    throw new Error("PROD_MASTER_PASSWORD must have at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const companyProfileData = {
    companyName,
    legalName: optionalEnv("PROD_COMPANY_LEGAL_NAME") ?? companyName,
    industry: optionalEnv("PROD_COMPANY_INDUSTRY"),
    email: optionalEnv("PROD_COMPANY_EMAIL") ?? email,
    phone: optionalEnv("PROD_COMPANY_PHONE"),
    website: optionalEnv("PROD_COMPANY_WEBSITE"),
    addressLine1: optionalEnv("PROD_COMPANY_ADDRESS_LINE_1"),
    addressLine2: optionalEnv("PROD_COMPANY_ADDRESS_LINE_2"),
    city: optionalEnv("PROD_COMPANY_CITY"),
    state: optionalEnv("PROD_COMPANY_STATE"),
    zipCode: optionalEnv("PROD_COMPANY_ZIP"),
    country: optionalEnv("PROD_COMPANY_COUNTRY") ?? "USA",
    licenseNumber: optionalEnv("PROD_COMPANY_LICENSE"),
    contactFirstName: optionalEnv("PROD_CONTACT_FIRST_NAME"),
    contactLastName: optionalEnv("PROD_CONTACT_LAST_NAME"),
    contactTitle: optionalEnv("PROD_CONTACT_TITLE"),
    contactEmail: optionalEnv("PROD_CONTACT_EMAIL") ?? email,
    contactPhone: optionalEnv("PROD_CONTACT_PHONE"),
  };

  const existingCompanyProfile = await prisma.companyProfile.findFirst({
    where: {
      companyName,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const companyProfile = existingCompanyProfile
    ? await prisma.companyProfile.update({
        where: { id: existingCompanyProfile.id },
        data: companyProfileData,
      })
    : await prisma.companyProfile.create({
        data: companyProfileData,
      });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      companyProfileId: companyProfile.id,
      passwordHash,
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    },
    create: {
      companyProfileId: companyProfile.id,
      email,
      passwordHash,
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    },
    include: {
      companyProfile: {
        select: {
          id: true,
          companyName: true,
        },
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        message: "Production master bootstrap completed successfully",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        companyProfile: user.companyProfile,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
