// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting comprehensive database seed...");

  // Clear existing data
  await prisma.userInteraction.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.careerSkill.deleteMany();
  await prisma.careerEducationPathway.deleteMany();
  await prisma.companyCareer.deleteMany();
  await prisma.jobMarket.deleteMany();
  await prisma.doeCourse.deleteMany();
  await prisma.nonCreditCourse.deleteMany();
  await prisma.company.deleteMany();
  await prisma.skillCertification.deleteMany();
  await prisma.educationProgram.deleteMany();
  await prisma.career.deleteMany();

  // ========================================
  // CAREERS - Expanded and Diverse
  // ========================================

  const softwareDeveloper = await prisma.career.create({
    data: {
      careerCode: "15-1252",
      title: "Software Developer",
      description:
        "Design, develop, and maintain software applications and systems. Work with programming languages, frameworks, and databases to create solutions for businesses and consumers.",
      salaryMin: 65000,
      salaryMax: 120000,
      salaryMedian: 85000,
      jobOutlook: "Excellent Growth (+22%)",
      growthRate: 22.0,
      requiredEducation: "Bachelor's in Computer Science or related field",
      experienceLevel: "entry_to_senior",
      skills: [
        "JavaScript",
        "Python",
        "React",
        "Node.js",
        "SQL",
        "Git",
        "AWS",
        "Docker",
      ],
      industries: [
        "Technology",
        "Healthcare",
        "Finance",
        "Government",
        "E-commerce",
      ],
      workEnvironment: "Office or Remote",
      typicalTasks: [
        "Writing code",
        "Debugging applications",
        "Testing software",
        "Collaborating with teams",
        "Code reviews",
      ],
      hawaiiSpecificNotes:
        "Growing tech scene in Honolulu with remote opportunities",
    },
  });

  const cybersecurityAnalyst = await prisma.career.create({
    data: {
      careerCode: "15-1212",
      title: "Cybersecurity Analyst",
      description:
        "Protect organizations from cyber threats by monitoring systems, investigating security breaches, and implementing security measures.",
      salaryMin: 70000,
      salaryMax: 130000,
      salaryMedian: 95000,
      jobOutlook: "Exceptional Growth (+35%)",
      growthRate: 35.0,
      requiredEducation:
        "Bachelor's in Computer Science, Cybersecurity, or related field",
      experienceLevel: "entry_to_senior",
      skills: [
        "Network Security",
        "Incident Response",
        "Risk Assessment",
        "Python",
        "SIEM Tools",
        "Penetration Testing",
      ],
      industries: [
        "Government",
        "Finance",
        "Healthcare",
        "Defense",
        "Technology",
      ],
      workEnvironment: "Office-based with some remote work",
      typicalTasks: [
        "Monitor security alerts",
        "Investigate incidents",
        "Conduct risk assessments",
        "Implement security protocols",
      ],
      hawaiiSpecificNotes:
        "High demand due to military and government presence",
    },
  });

  const dataAnalyst = await prisma.career.create({
    data: {
      careerCode: "15-1220",
      title: "Data Analyst",
      description:
        "Collect, process, and analyze data to help organizations make informed business decisions. Create reports, dashboards, and visualizations.",
      salaryMin: 55000,
      salaryMax: 85000,
      salaryMedian: 68000,
      jobOutlook: "Strong Growth (+25%)",
      growthRate: 25.0,
      requiredEducation:
        "Bachelor's in Mathematics, Statistics, or Computer Science",
      experienceLevel: "entry_to_mid",
      skills: [
        "SQL",
        "Excel",
        "Python",
        "R",
        "Tableau",
        "Statistics",
        "Power BI",
        "Data Visualization",
      ],
      industries: ["Healthcare", "Finance", "Retail", "Government", "Tourism"],
      workEnvironment: "Office or Remote",
      typicalTasks: [
        "Data collection",
        "Statistical analysis",
        "Report creation",
        "Dashboard development",
        "Trend identification",
      ],
      hawaiiSpecificNotes: "Growing demand in tourism and healthcare sectors",
    },
  });

  const registeredNurse = await prisma.career.create({
    data: {
      careerCode: "29-1141",
      title: "Registered Nurse",
      description:
        "Provide patient care, educate patients about health conditions, and coordinate with healthcare teams to deliver quality medical care.",
      salaryMin: 70000,
      salaryMax: 95000,
      salaryMedian: 80000,
      jobOutlook: "Very Strong Growth (+15%)",
      growthRate: 15.0,
      requiredEducation: "Bachelor of Science in Nursing (BSN)",
      experienceLevel: "entry_to_senior",
      skills: [
        "Patient Care",
        "Medical Knowledge",
        "Communication",
        "Critical Thinking",
        "EMR Systems",
        "IV Therapy",
      ],
      industries: [
        "Healthcare",
        "Hospitals",
        "Clinics",
        "Home Health",
        "Long-term Care",
      ],
      workEnvironment: "Healthcare facilities",
      typicalTasks: [
        "Patient assessment",
        "Medication administration",
        "Patient education",
        "Care coordination",
        "Documentation",
      ],
      hawaiiSpecificNotes: "Critical shortage creates excellent opportunities",
    },
  });

  const physicalTherapist = await prisma.career.create({
    data: {
      careerCode: "29-1123",
      title: "Physical Therapist",
      description:
        "Help patients recover from injuries and improve their movement and manage pain through therapeutic exercise and hands-on care.",
      salaryMin: 85000,
      salaryMax: 110000,
      salaryMedian: 95000,
      jobOutlook: "Strong Growth (+18%)",
      growthRate: 18.0,
      requiredEducation: "Doctor of Physical Therapy (DPT)",
      experienceLevel: "entry_to_senior",
      skills: [
        "Anatomy",
        "Therapeutic Exercise",
        "Patient Assessment",
        "Manual Therapy",
        "Treatment Planning",
      ],
      industries: [
        "Healthcare",
        "Sports Medicine",
        "Rehabilitation",
        "Private Practice",
        "Home Health",
      ],
      workEnvironment: "Clinical settings",
      typicalTasks: [
        "Patient evaluation",
        "Treatment planning",
        "Exercise instruction",
        "Manual therapy",
        "Progress monitoring",
      ],
      hawaiiSpecificNotes: "Active lifestyle culture creates steady demand",
    },
  });

  const solarInstaller = await prisma.career.create({
    data: {
      careerCode: "47-2231",
      title: "Solar Panel Installer",
      description:
        "Install and maintain solar energy systems on residential and commercial buildings, supporting Hawaii's renewable energy goals.",
      salaryMin: 45000,
      salaryMax: 70000,
      salaryMedian: 55000,
      jobOutlook: "Exceptional Growth (+52%)",
      growthRate: 52.0,
      requiredEducation: "High school diploma + certification",
      experienceLevel: "entry_to_mid",
      skills: [
        "Electrical Work",
        "Safety Procedures",
        "Blueprint Reading",
        "Physical Fitness",
        "Tool Usage",
      ],
      industries: [
        "Renewable Energy",
        "Construction",
        "Utilities",
        "Green Technology",
      ],
      workEnvironment: "Outdoor construction sites",
      typicalTasks: [
        "Panel installation",
        "Electrical connections",
        "System testing",
        "Maintenance",
        "Safety compliance",
      ],
      hawaiiSpecificNotes:
        "Booming industry due to Hawaii's renewable energy mandates",
    },
  });

  const hotelManager = await prisma.career.create({
    data: {
      careerCode: "11-9081",
      title: "Hotel Manager",
      description:
        "Oversee daily operations of hotels and resorts, ensuring excellent guest experiences and managing staff and budgets.",
      salaryMin: 55000,
      salaryMax: 85000,
      salaryMedian: 68000,
      jobOutlook: "Moderate Growth (+10%)",
      growthRate: 10.0,
      requiredEducation: "Bachelor's in Hospitality Management",
      experienceLevel: "mid_to_senior",
      skills: [
        "Leadership",
        "Customer Service",
        "Budget Management",
        "Problem Solving",
        "Staff Management",
      ],
      industries: [
        "Tourism",
        "Hospitality",
        "Resort Management",
        "Event Planning",
      ],
      workEnvironment: "Hotel/Resort properties",
      typicalTasks: [
        "Staff supervision",
        "Guest relations",
        "Budget oversight",
        "Quality control",
        "Marketing coordination",
      ],
      hawaiiSpecificNotes:
        "Core industry with opportunities across all islands",
    },
  });

  const businessAnalyst = await prisma.career.create({
    data: {
      careerCode: "13-1111",
      title: "Business Analyst",
      description:
        "Analyze business processes, identify improvement opportunities, and help organizations optimize their operations and strategies.",
      salaryMin: 60000,
      salaryMax: 90000,
      salaryMedian: 72000,
      jobOutlook: "Strong Growth (+14%)",
      growthRate: 14.0,
      requiredEducation: "Bachelor's in Business, Economics, or related field",
      experienceLevel: "entry_to_senior",
      skills: [
        "Business Analysis",
        "Requirements Gathering",
        "Process Improvement",
        "Excel",
        "SQL",
        "Project Management",
      ],
      industries: [
        "Finance",
        "Technology",
        "Healthcare",
        "Consulting",
        "Government",
      ],
      workEnvironment: "Office or Remote",
      typicalTasks: [
        "Process analysis",
        "Requirements documentation",
        "Stakeholder meetings",
        "Data analysis",
        "Solution recommendations",
      ],
      hawaiiSpecificNotes: "Growing demand in diversifying economy",
    },
  });

  const marineBiologist = await prisma.career.create({
    data: {
      careerCode: "19-1032",
      title: "Marine Biologist",
      description:
        "Study marine organisms and ecosystems, conduct research, and work on conservation efforts to protect Hawaii's unique ocean environment.",
      salaryMin: 50000,
      salaryMax: 80000,
      salaryMedian: 62000,
      jobOutlook: "Moderate Growth (+5%)",
      growthRate: 5.0,
      requiredEducation: "Bachelor's in Marine Biology or related field",
      experienceLevel: "entry_to_senior",
      skills: [
        "Research Methods",
        "Data Collection",
        "Scientific Writing",
        "SCUBA Diving",
        "Laboratory Techniques",
      ],
      industries: [
        "Research",
        "Government",
        "Environmental Consulting",
        "Education",
        "Non-profit",
      ],
      workEnvironment: "Laboratory, field work, and ocean",
      typicalTasks: [
        "Field research",
        "Data analysis",
        "Report writing",
        "Sample collection",
        "Conservation planning",
      ],
      hawaiiSpecificNotes:
        "Unique opportunities with diverse marine ecosystems",
    },
  });

  console.log("✅ Created careers");

  // ========================================
  // EDUCATION PROGRAMS - Comprehensive UH System
  // ========================================

  const uhManoaCS = await prisma.educationProgram.create({
    data: {
      institution: "University of Hawaii at Manoa",
      campus: "Manoa",
      programName: "Computer Science",
      degreeType: "Bachelor of Science",
      durationYears: 4,
      cipCode: "11.0701",
      admissionRequirements: [
        "High school diploma or equivalent",
        "3.0 GPA minimum",
        "SAT Math 600+ or ACT Math 26+",
        "Completion of Algebra II and Geometry",
      ],
      prerequisiteCourses: ["Calculus I", "Physics", "English Composition"],
      coreCourses: [
        "Data Structures",
        "Algorithms",
        "Software Engineering",
        "Database Systems",
      ],
      tuitionResident: 12000,
      tuitionNonresident: 35000,
      financialAidAvailable: true,
      accreditation: ["ABET", "WASC"],
      graduationRate: 68.5,
      employmentRate: 92.0,
      medianStartingSalary: 75000,
      programWebsite: "https://www.ics.hawaii.edu",
      contactEmail: "ics-info@hawaii.edu",
      applicationDeadline: new Date("2024-03-01"),
      programStatus: "active",
    },
  });

  const uhManoaCybersecurity = await prisma.educationProgram.create({
    data: {
      institution: "University of Hawaii at Manoa",
      campus: "Manoa",
      programName: "Cybersecurity",
      degreeType: "Bachelor of Science",
      durationYears: 4,
      cipCode: "11.1003",
      admissionRequirements: [
        "High school diploma or equivalent",
        "3.2 GPA minimum",
        "Strong math background",
        "Computer science prerequisites",
      ],
      prerequisiteCourses: [
        "Calculus I",
        "Introduction to Programming",
        "Discrete Mathematics",
      ],
      coreCourses: [
        "Network Security",
        "Cryptography",
        "Incident Response",
        "Risk Management",
      ],
      tuitionResident: 13000,
      tuitionNonresident: 36000,
      graduationRate: 72.0,
      employmentRate: 95.0,
      medianStartingSalary: 80000,
    },
  });

  const uhManoaNursing = await prisma.educationProgram.create({
    data: {
      institution: "University of Hawaii at Manoa",
      campus: "Manoa",
      programName: "Nursing",
      degreeType: "Bachelor of Science in Nursing",
      durationYears: 4,
      cipCode: "51.3801",
      admissionRequirements: [
        "High school diploma or equivalent",
        "3.2 GPA minimum",
        "Completion of science prerequisites",
        "TEAS exam score of 70+",
        "Background check and health clearance",
      ],
      prerequisiteCourses: [
        "Anatomy & Physiology",
        "Microbiology",
        "Chemistry",
        "Psychology",
      ],
      coreCourses: [
        "Fundamentals of Nursing",
        "Medical-Surgical Nursing",
        "Pediatric Nursing",
        "Mental Health Nursing",
      ],
      tuitionResident: 15000,
      tuitionNonresident: 38000,
      graduationRate: 85.0,
      employmentRate: 98.0,
      medianStartingSalary: 78000,
    },
  });

  const uhManoaMarineBio = await prisma.educationProgram.create({
    data: {
      institution: "University of Hawaii at Manoa",
      campus: "Manoa",
      programName: "Marine Biology",
      degreeType: "Bachelor of Science",
      durationYears: 4,
      cipCode: "26.1302",
      admissionRequirements: [
        "High school diploma or equivalent",
        "3.0 GPA minimum",
        "Strong science and math background",
        "Swimming proficiency recommended",
      ],
      prerequisiteCourses: ["Biology", "Chemistry", "Physics", "Calculus"],
      coreCourses: [
        "Marine Ecology",
        "Oceanography",
        "Marine Vertebrate Biology",
        "Research Methods",
      ],
      tuitionResident: 12000,
      tuitionNonresident: 35000,
      graduationRate: 78.0,
      employmentRate: 85.0,
      medianStartingSalary: 55000,
    },
  });

  const hccIT = await prisma.educationProgram.create({
    data: {
      institution: "Honolulu Community College",
      campus: "Honolulu",
      programName: "Information Technology",
      degreeType: "Associate of Science",
      durationYears: 2,
      cipCode: "11.0103",
      admissionRequirements: [
        "High school diploma or equivalent",
        "Basic computer literacy",
        "Math placement at MATH 103 or higher",
      ],
      coreCourses: [
        "Network Fundamentals",
        "Programming Basics",
        "Database Management",
        "Web Development",
      ],
      tuitionResident: 4000,
      tuitionNonresident: 12000,
      graduationRate: 65.0,
      employmentRate: 88.0,
      medianStartingSalary: 45000,
    },
  });

  const kccRenewableEnergy = await prisma.educationProgram.create({
    data: {
      institution: "Kauai Community College",
      campus: "Kauai",
      programName: "Renewable Energy Technology",
      degreeType: "Certificate Program",
      durationYears: 1,
      cipCode: "15.0503",
      admissionRequirements: [
        "High school diploma or equivalent",
        "Basic math skills",
        "Physical fitness for outdoor work",
      ],
      coreCourses: [
        "Solar Panel Installation",
        "Electrical Systems",
        "Safety Procedures",
        "Energy Storage",
      ],
      tuitionResident: 3000,
      tuitionNonresident: 9000,
      graduationRate: 82.0,
      employmentRate: 95.0,
      medianStartingSalary: 48000,
    },
  });

  const kccBusiness = await prisma.educationProgram.create({
    data: {
      institution: "Kapiolani Community College",
      campus: "Honolulu",
      programName: "Business Technology",
      degreeType: "Associate of Science",
      durationYears: 2,
      cipCode: "52.0401",
      admissionRequirements: [
        "High school diploma or equivalent",
        "2.5 GPA minimum",
        "Basic computer skills",
      ],
      coreCourses: [
        "Business Communications",
        "Accounting",
        "Marketing",
        "Management Principles",
      ],
      tuitionResident: 4000,
      tuitionNonresident: 12000,
      graduationRate: 70.0,
      employmentRate: 85.0,
      medianStartingSalary: 42000,
    },
  });

  const uhHiloHospitality = await prisma.educationProgram.create({
    data: {
      institution: "University of Hawaii at Hilo",
      campus: "Hilo",
      programName: "Hospitality and Tourism Management",
      degreeType: "Bachelor of Business Administration",
      durationYears: 4,
      cipCode: "52.0901",
      admissionRequirements: [
        "High school diploma or equivalent",
        "2.8 GPA minimum",
        "English proficiency",
      ],
      coreCourses: [
        "Hotel Operations",
        "Tourism Marketing",
        "Event Management",
        "Sustainable Tourism",
      ],
      tuitionResident: 11000,
      tuitionNonresident: 28000,
      graduationRate: 75.0,
      employmentRate: 90.0,
      medianStartingSalary: 50000,
    },
  });

  console.log("✅ Created education programs");

  // ========================================
  // SKILLS & CERTIFICATIONS
  // ========================================

  const jsSkill = await prisma.skillCertification.create({
    data: {
      name: "JavaScript Programming",
      type: "skill",
      category: "technical",
      demandLevel: "high",
      growthTrend: "increasing",
      timeToAcquireMonths: 6,
      hawaiiSpecific: false,
      onlineAvailable: true,
      description: "Modern JavaScript programming including ES6+ features",
      prerequisites: ["Basic programming concepts"],
    },
  });

  const awsCert = await prisma.skillCertification.create({
    data: {
      name: "AWS Certified Developer",
      type: "certification",
      category: "technical",
      demandLevel: "high",
      growthTrend: "increasing",
      avgSalaryBoost: 15,
      timeToAcquireMonths: 3,
      costEstimate: 150,
      issuingOrganization: "Amazon Web Services",
      renewalRequired: true,
      renewalPeriodYears: 3,
      hawaiiSpecific: false,
      onlineAvailable: true,
      description: "Cloud development certification for AWS platform",
      prerequisites: ["JavaScript", "Basic cloud concepts"],
    },
  });

  const rnLicense = await prisma.skillCertification.create({
    data: {
      name: "Registered Nurse License",
      type: "license",
      category: "industry_specific",
      demandLevel: "high",
      growthTrend: "stable",
      timeToAcquireMonths: 48,
      issuingOrganization: "Hawaii Board of Nursing",
      renewalRequired: true,
      renewalPeriodYears: 2,
      hawaiiSpecific: true,
      onlineAvailable: false,
      description:
        "Professional nursing license required to practice in Hawaii",
      prerequisites: ["BSN degree", "NCLEX exam"],
    },
  });

  const solarCert = await prisma.skillCertification.create({
    data: {
      name: "NABCEP Solar Installer Certification",
      type: "certification",
      category: "technical",
      demandLevel: "high",
      growthTrend: "increasing",
      avgSalaryBoost: 12,
      timeToAcquireMonths: 4,
      costEstimate: 500,
      issuingOrganization:
        "North American Board of Certified Energy Practitioners",
      renewalRequired: true,
      renewalPeriodYears: 3,
      hawaiiSpecific: false,
      onlineAvailable: false,
      description: "Industry-standard certification for solar installers",
      prerequisites: ["Electrical knowledge", "Safety training"],
    },
  });

  const dataAnalyticsCert = await prisma.skillCertification.create({
    data: {
      name: "Google Data Analytics Certificate",
      type: "certification",
      category: "technical",
      demandLevel: "high",
      growthTrend: "increasing",
      avgSalaryBoost: 10,
      timeToAcquireMonths: 6,
      costEstimate: 49,
      issuingOrganization: "Google",
      renewalRequired: false,
      hawaiiSpecific: false,
      onlineAvailable: true,
      description: "Comprehensive data analytics training program",
      prerequisites: ["Basic computer skills"],
    },
  });

  console.log("✅ Created skills and certifications");

  // ========================================
  // COMPANIES
  // ========================================

  const hawaiianAirlines = await prisma.company.create({
    data: {
      name: "Hawaiian Airlines",
      industry: "Transportation",
      sizeCategory: "large",
      employeeCountRange: "5000-10000",
      headquartersLocation: "Honolulu, Hawaii",
      hawaiiLocations: ["Honolulu", "Hilo", "Kahului"],
      companyType: "public",
      website: "https://www.hawaiianairlines.com",
      description:
        "Hawaii's largest airline connecting the islands to the world",
      benefits: [
        "Health Insurance",
        "Flight Benefits",
        "Retirement Plan",
        "Paid Time Off",
      ],
      cultureKeywords: [
        "Aloha Spirit",
        "Customer Service",
        "Island Values",
        "Teamwork",
      ],
      diversityPrograms: true,
      internshipPrograms: true,
      entryLevelFriendly: true,
      remoteWorkPolicy: "hybrid",
    },
  });

  const bankOfHawaii = await prisma.company.create({
    data: {
      name: "Bank of Hawaii",
      industry: "Financial Services",
      sizeCategory: "large",
      employeeCountRange: "2000-5000",
      headquartersLocation: "Honolulu, Hawaii",
      hawaiiLocations: ["Honolulu", "Hilo", "Kona", "Maui", "Kauai"],
      companyType: "public",
      website: "https://www.boh.com",
      description: "Hawaii's oldest and largest bank",
      benefits: [
        "Comprehensive Health",
        "Retirement Matching",
        "Career Development",
        "Flexible Work",
      ],
      cultureKeywords: [
        "Community Focus",
        "Financial Excellence",
        "Local Values",
        "Innovation",
      ],
      diversityPrograms: true,
      internshipPrograms: true,
      entryLevelFriendly: true,
      remoteWorkPolicy: "hybrid",
    },
  });

  const kaiserPermanente = await prisma.company.create({
    data: {
      name: "Kaiser Permanente Hawaii",
      industry: "Healthcare",
      sizeCategory: "large",
      employeeCountRange: "5000+",
      headquartersLocation: "Oakland, CA",
      hawaiiLocations: ["Honolulu", "Maui", "Hawaii Island"],
      companyType: "nonprofit",
      website: "https://healthy.kaiserpermanente.org/hawaii",
      description: "Integrated healthcare system serving Hawaii",
      benefits: [
        "Excellent Health Coverage",
        "Pension Plan",
        "Professional Development",
        "Wellness Programs",
      ],
      cultureKeywords: [
        "Patient Care",
        "Innovation",
        "Wellness",
        "Community Health",
      ],
      diversityPrograms: true,
      internshipPrograms: true,
      entryLevelFriendly: true,
      remoteWorkPolicy: "no_remote",
    },
  });

  const hawaiianElectric = await prisma.company.create({
    data: {
      name: "Hawaiian Electric Company",
      industry: "Utilities",
      sizeCategory: "large",
      employeeCountRange: "1000-2000",
      headquartersLocation: "Honolulu, Hawaii",
      hawaiiLocations: ["Oahu", "Maui", "Hawaii Island"],
      companyType: "public",
      website: "https://www.hawaiianelectric.com",
      description: "Hawaii's primary electric utility company",
      benefits: [
        "Health & Dental",
        "Retirement Plan",
        "Life Insurance",
        "Educational Assistance",
      ],
      cultureKeywords: [
        "Clean Energy",
        "Innovation",
        "Community Service",
        "Safety",
      ],
      diversityPrograms: true,
      internshipPrograms: true,
      entryLevelFriendly: true,
      remoteWorkPolicy: "hybrid",
    },
  });

  const queensHealth = await prisma.company.create({
    data: {
      name: "The Queen's Health Systems",
      industry: "Healthcare",
      sizeCategory: "large",
      employeeCountRange: "5000+",
      headquartersLocation: "Honolulu, Hawaii",
      hawaiiLocations: ["Honolulu", "Maui", "Molokai", "West Oahu"],
      companyType: "nonprofit",
      website: "https://www.queenshealth.org",
      description: "Hawaii's largest private healthcare system",
      benefits: [
        "Health Insurance",
        "Retirement Savings",
        "Tuition Assistance",
        "Wellness Programs",
      ],
      cultureKeywords: [
        "Native Hawaiian Health",
        "Excellence",
        "Compassion",
        "Innovation",
      ],
      diversityPrograms: true,
      internshipPrograms: true,
      entryLevelFriendly: true,
      remoteWorkPolicy: "no_remote",
    },
  });

  console.log("✅ Created companies");

  // ========================================
  // CREATE RELATIONSHIPS
  // ========================================

  // Career-Education Pathways
  await prisma.careerEducationPathway.createMany({
    data: [
      // Software Developer pathways
      {
        careerId: softwareDeveloper.id,
        programId: uhManoaCS.id,
        pathwayType: "recommended",
        preparationLevel: "entry",
      },
      {
        careerId: softwareDeveloper.id,
        programId: hccIT.id,
        pathwayType: "alternative",
        preparationLevel: "entry",
      },

      // Cybersecurity Analyst pathways
      {
        careerId: cybersecurityAnalyst.id,
        programId: uhManoaCybersecurity.id,
        pathwayType: "recommended",
        preparationLevel: "entry",
      },
      {
        careerId: cybersecurityAnalyst.id,
        programId: uhManoaCS.id,
        pathwayType: "alternative",
        preparationLevel: "entry",
      },

      // Data Analyst pathways
      {
        careerId: dataAnalyst.id,
        programId: uhManoaCS.id,
        pathwayType: "recommended",
        preparationLevel: "entry",
      },
      {
        careerId: dataAnalyst.id,
        programId: hccIT.id,
        pathwayType: "alternative",
        preparationLevel: "entry",
      },
      {
        careerId: dataAnalyst.id,
        programId: kccBusiness.id,
        pathwayType: "alternative",
        preparationLevel: "entry",
      },

      // Nursing pathways
      {
        careerId: registeredNurse.id,
        programId: uhManoaNursing.id,
        pathwayType: "required",
        preparationLevel: "entry",
      },

      // Physical Therapist pathways
      {
        careerId: physicalTherapist.id,
        programId: uhManoaNursing.id,
        pathwayType: "prerequisite",
        preparationLevel: "entry",
      },

      // Solar Installer pathways
      {
        careerId: solarInstaller.id,
        programId: kccRenewableEnergy.id,
        pathwayType: "recommended",
        preparationLevel: "entry",
      },

      // Hotel Manager pathways
      {
        careerId: hotelManager.id,
        programId: uhHiloHospitality.id,
        pathwayType: "recommended",
        preparationLevel: "entry",
      },
      {
        careerId: hotelManager.id,
        programId: kccBusiness.id,
        pathwayType: "alternative",
        preparationLevel: "entry",
      },

      // Business Analyst pathways
      {
        careerId: businessAnalyst.id,
        programId: kccBusiness.id,
        pathwayType: "recommended",
        preparationLevel: "entry",
      },

      // Marine Biologist pathways
      {
        careerId: marineBiologist.id,
        programId: uhManoaMarineBio.id,
        pathwayType: "required",
        preparationLevel: "entry",
      },
    ],
  });

  // Career-Skills relationships
  await prisma.careerSkill.createMany({
    data: [
      // Software Developer skills
      {
        careerId: softwareDeveloper.id,
        skillCertId: jsSkill.id,
        importanceLevel: "essential",
        proficiencyLevel: "advanced",
      },
      {
        careerId: softwareDeveloper.id,
        skillCertId: awsCert.id,
        importanceLevel: "important",
        proficiencyLevel: "intermediate",
      },

      // Data Analyst skills
      {
        careerId: dataAnalyst.id,
        skillCertId: dataAnalyticsCert.id,
        importanceLevel: "essential",
        proficiencyLevel: "intermediate",
      },
      {
        careerId: dataAnalyst.id,
        skillCertId: jsSkill.id,
        importanceLevel: "nice_to_have",
        proficiencyLevel: "beginner",
      },

      // Registered Nurse skills
      {
        careerId: registeredNurse.id,
        skillCertId: rnLicense.id,
        importanceLevel: "essential",
        proficiencyLevel: "expert",
      },

      // Solar Installer skills
      {
        careerId: solarInstaller.id,
        skillCertId: solarCert.id,
        importanceLevel: "essential",
        proficiencyLevel: "intermediate",
      },
    ],
  });

  // Company-Career relationships
  await prisma.companyCareer.createMany({
    data: [
      // Hawaiian Airlines
      {
        companyId: hawaiianAirlines.id,
        careerId: softwareDeveloper.id,
        currentOpenings: 5,
        avgSalaryOffered: 85000,
        entryLevelAvailable: true,
        internshipsAvailable: true,
      },
      {
        companyId: hawaiianAirlines.id,
        careerId: dataAnalyst.id,
        currentOpenings: 3,
        avgSalaryOffered: 70000,
        entryLevelAvailable: true,
      },
      {
        companyId: hawaiianAirlines.id,
        careerId: businessAnalyst.id,
        currentOpenings: 2,
        avgSalaryOffered: 75000,
        entryLevelAvailable: false,
      },

      // Bank of Hawaii
      {
        companyId: bankOfHawaii.id,
        careerId: softwareDeveloper.id,
        currentOpenings: 8,
        avgSalaryOffered: 90000,
        entryLevelAvailable: true,
        internshipsAvailable: true,
      },
      {
        companyId: bankOfHawaii.id,
        careerId: cybersecurityAnalyst.id,
        currentOpenings: 4,
        avgSalaryOffered: 95000,
        entryLevelAvailable: false,
      },
      {
        companyId: bankOfHawaii.id,
        careerId: dataAnalyst.id,
        currentOpenings: 6,
        avgSalaryOffered: 72000,
        entryLevelAvailable: true,
      },
      {
        companyId: bankOfHawaii.id,
        careerId: businessAnalyst.id,
        currentOpenings: 7,
        avgSalaryOffered: 78000,
        entryLevelAvailable: true,
      },

      // Kaiser Permanente
      {
        companyId: kaiserPermanente.id,
        careerId: registeredNurse.id,
        currentOpenings: 25,
        avgSalaryOffered: 82000,
        entryLevelAvailable: true,
        internshipsAvailable: true,
      },
      {
        companyId: kaiserPermanente.id,
        careerId: physicalTherapist.id,
        currentOpenings: 8,
        avgSalaryOffered: 95000,
        entryLevelAvailable: true,
      },
      {
        companyId: kaiserPermanente.id,
        careerId: dataAnalyst.id,
        currentOpenings: 3,
        avgSalaryOffered: 68000,
        entryLevelAvailable: true,
      },

      // Hawaiian Electric
      {
        companyId: hawaiianElectric.id,
        careerId: solarInstaller.id,
        currentOpenings: 12,
        avgSalaryOffered: 58000,
        entryLevelAvailable: true,
        internshipsAvailable: true,
      },
      {
        companyId: hawaiianElectric.id,
        careerId: softwareDeveloper.id,
        currentOpenings: 4,
        avgSalaryOffered: 88000,
        entryLevelAvailable: false,
      },
      {
        companyId: hawaiianElectric.id,
        careerId: cybersecurityAnalyst.id,
        currentOpenings: 2,
        avgSalaryOffered: 92000,
        entryLevelAvailable: false,
      },

      // Queen's Health
      {
        companyId: queensHealth.id,
        careerId: registeredNurse.id,
        currentOpenings: 30,
        avgSalaryOffered: 80000,
        entryLevelAvailable: true,
        internshipsAvailable: true,
      },
      {
        companyId: queensHealth.id,
        careerId: physicalTherapist.id,
        currentOpenings: 6,
        avgSalaryOffered: 93000,
        entryLevelAvailable: true,
      },
      {
        companyId: queensHealth.id,
        careerId: dataAnalyst.id,
        currentOpenings: 2,
        avgSalaryOffered: 65000,
        entryLevelAvailable: true,
      },
    ],
  });

  // Job Market Data
  await prisma.jobMarket.createMany({
    data: [
      {
        careerId: softwareDeveloper.id,
        occupationCode: "15-1252",
        location: "Hawaii",
        region: "Oahu",
        jobPostingsCount: 245,
        jobPostingsGrowth: 15.5,
        uniqueCompaniesHiring: 45,
        avgTimeToFillDays: 65,
        competitionLevel: "medium",
        seasonalDemand: false,
        peakHiringMonths: ["January", "February", "September"],
        remoteWorkPercentage: 65.0,
        hybridWorkPercentage: 25.0,
      },
      {
        careerId: cybersecurityAnalyst.id,
        occupationCode: "15-1212",
        location: "Hawaii",
        region: "Oahu",
        jobPostingsCount: 89,
        jobPostingsGrowth: 28.3,
        uniqueCompaniesHiring: 22,
        avgTimeToFillDays: 85,
        competitionLevel: "high",
        seasonalDemand: false,
        peakHiringMonths: ["March", "April", "October"],
        remoteWorkPercentage: 45.0,
        hybridWorkPercentage: 40.0,
      },
      {
        careerId: dataAnalyst.id,
        occupationCode: "15-1220",
        location: "Hawaii",
        region: "Oahu",
        jobPostingsCount: 180,
        jobPostingsGrowth: 18.2,
        uniqueCompaniesHiring: 35,
        avgTimeToFillDays: 55,
        competitionLevel: "medium",
        seasonalDemand: false,
        peakHiringMonths: ["January", "February", "August"],
        remoteWorkPercentage: 55.0,
        hybridWorkPercentage: 30.0,
      },
      {
        careerId: registeredNurse.id,
        occupationCode: "29-1141",
        location: "Hawaii",
        region: "Statewide",
        jobPostingsCount: 420,
        jobPostingsGrowth: 8.2,
        uniqueCompaniesHiring: 28,
        avgTimeToFillDays: 45,
        competitionLevel: "low",
        seasonalDemand: false,
        peakHiringMonths: ["Year-round"],
        remoteWorkPercentage: 5.0,
        hybridWorkPercentage: 10.0,
      },
      {
        careerId: physicalTherapist.id,
        occupationCode: "29-1123",
        location: "Hawaii",
        region: "Statewide",
        jobPostingsCount: 65,
        jobPostingsGrowth: 12.8,
        uniqueCompaniesHiring: 18,
        avgTimeToFillDays: 75,
        competitionLevel: "medium",
        seasonalDemand: false,
        peakHiringMonths: ["March", "April", "September"],
        remoteWorkPercentage: 15.0,
        hybridWorkPercentage: 20.0,
      },
      {
        careerId: solarInstaller.id,
        occupationCode: "47-2231",
        location: "Hawaii",
        region: "Statewide",
        jobPostingsCount: 156,
        jobPostingsGrowth: 45.6,
        uniqueCompaniesHiring: 32,
        avgTimeToFillDays: 35,
        competitionLevel: "low",
        seasonalDemand: true,
        peakHiringMonths: ["April", "May", "June", "September", "October"],
        remoteWorkPercentage: 0.0,
        hybridWorkPercentage: 0.0,
      },
      {
        careerId: hotelManager.id,
        occupationCode: "11-9081",
        location: "Hawaii",
        region: "Statewide",
        jobPostingsCount: 78,
        jobPostingsGrowth: 8.5,
        uniqueCompaniesHiring: 25,
        avgTimeToFillDays: 90,
        competitionLevel: "high",
        seasonalDemand: true,
        peakHiringMonths: ["February", "March", "September", "October"],
        remoteWorkPercentage: 10.0,
        hybridWorkPercentage: 15.0,
      },
      {
        careerId: businessAnalyst.id,
        occupationCode: "13-1111",
        location: "Hawaii",
        region: "Oahu",
        jobPostingsCount: 125,
        jobPostingsGrowth: 12.1,
        uniqueCompaniesHiring: 38,
        avgTimeToFillDays: 70,
        competitionLevel: "medium",
        seasonalDemand: false,
        peakHiringMonths: ["January", "February", "September"],
        remoteWorkPercentage: 45.0,
        hybridWorkPercentage: 35.0,
      },
      {
        careerId: marineBiologist.id,
        occupationCode: "19-1032",
        location: "Hawaii",
        region: "Statewide",
        jobPostingsCount: 23,
        jobPostingsGrowth: 3.2,
        uniqueCompaniesHiring: 8,
        avgTimeToFillDays: 120,
        competitionLevel: "high",
        seasonalDemand: true,
        peakHiringMonths: ["May", "June", "July", "August"],
        remoteWorkPercentage: 20.0,
        hybridWorkPercentage: 25.0,
      },
    ],
  });

  // DOE Courses
  await prisma.doeCourse.createMany({
    data: [
      {
        courseCode: "MATH401",
        courseName: "AP Calculus AB",
        subjectArea: "Mathematics",
        gradeLevels: [11, 12],
        courseType: "advanced_placement",
        prerequisites: ["Algebra II", "Pre-Calculus"],
        description:
          "Advanced calculus course preparing students for college-level mathematics",
        skillsDeveloped: [
          "Problem Solving",
          "Mathematical Reasoning",
          "Analytical Thinking",
        ],
        collegeCreditAvailable: true,
        careerRelevance: ["15-1252", "15-1220", "13-1111", "19-1032"],
      },
      {
        courseCode: "COMP101",
        courseName: "Introduction to Computer Science",
        subjectArea: "Computer Science",
        gradeLevels: [9, 10, 11, 12],
        courseType: "elective",
        prerequisites: [],
        description: "Basic programming concepts and computational thinking",
        skillsDeveloped: [
          "Programming",
          "Logic",
          "Problem Solving",
          "Critical Thinking",
        ],
        collegeCreditAvailable: false,
        careerRelevance: ["15-1252", "15-1220", "15-1212"],
      },
      {
        courseCode: "COMP201",
        courseName: "AP Computer Science A",
        subjectArea: "Computer Science",
        gradeLevels: [11, 12],
        courseType: "advanced_placement",
        prerequisites: ["Introduction to Computer Science"],
        description:
          "College-level computer science focusing on Java programming",
        skillsDeveloped: [
          "Java Programming",
          "Object-Oriented Programming",
          "Data Structures",
          "Algorithms",
        ],
        collegeCreditAvailable: true,
        careerRelevance: ["15-1252", "15-1212"],
      },
      {
        courseCode: "BIOL401",
        courseName: "AP Biology",
        subjectArea: "Science",
        gradeLevels: [11, 12],
        courseType: "advanced_placement",
        prerequisites: ["Biology I", "Chemistry I"],
        description:
          "College-level biology course covering molecular and cellular biology",
        skillsDeveloped: [
          "Scientific Method",
          "Data Analysis",
          "Critical Thinking",
          "Laboratory Skills",
        ],
        collegeCreditAvailable: true,
        careerRelevance: ["29-1141", "29-1123", "19-1032"],
      },
      {
        courseCode: "CHEM301",
        courseName: "AP Chemistry",
        subjectArea: "Science",
        gradeLevels: [11, 12],
        courseType: "advanced_placement",
        prerequisites: ["Chemistry I", "Algebra II"],
        description: "Advanced chemistry with laboratory investigations",
        skillsDeveloped: [
          "Chemical Analysis",
          "Laboratory Techniques",
          "Problem Solving",
          "Data Interpretation",
        ],
        collegeCreditAvailable: true,
        careerRelevance: ["29-1141", "19-1032"],
      },
      {
        courseCode: "PHYS201",
        courseName: "AP Physics 1",
        subjectArea: "Science",
        gradeLevels: [11, 12],
        courseType: "advanced_placement",
        prerequisites: ["Algebra II", "Geometry"],
        description: "Algebra-based introductory physics course",
        skillsDeveloped: [
          "Scientific Reasoning",
          "Mathematical Modeling",
          "Experimental Design",
          "Data Analysis",
        ],
        collegeCreditAvailable: true,
        careerRelevance: ["15-1252", "47-2231", "19-1032"],
      },
      {
        courseCode: "BUS101",
        courseName: "Introduction to Business",
        subjectArea: "Business",
        gradeLevels: [10, 11, 12],
        courseType: "elective",
        prerequisites: [],
        description: "Overview of business principles and entrepreneurship",
        skillsDeveloped: [
          "Business Communication",
          "Financial Literacy",
          "Leadership",
          "Project Management",
        ],
        collegeCreditAvailable: false,
        careerRelevance: ["13-1111", "11-9081"],
      },
      {
        courseCode: "HLTH201",
        courseName: "Health Science Career Exploration",
        subjectArea: "Health Sciences",
        gradeLevels: [10, 11, 12],
        courseType: "elective",
        prerequisites: ["Biology I"],
        description:
          "Introduction to various health science careers and medical terminology",
        skillsDeveloped: [
          "Medical Terminology",
          "Patient Care Basics",
          "Healthcare Ethics",
          "Communication",
        ],
        collegeCreditAvailable: false,
        careerRelevance: ["29-1141", "29-1123"],
      },
      {
        courseCode: "TECH101",
        courseName: "Engineering and Technology",
        subjectArea: "Technology",
        gradeLevels: [9, 10, 11, 12],
        courseType: "elective",
        prerequisites: [],
        description:
          "Hands-on exploration of engineering and technology careers",
        skillsDeveloped: [
          "Design Thinking",
          "Technical Drawing",
          "Problem Solving",
          "Tool Usage",
        ],
        collegeCreditAvailable: false,
        careerRelevance: ["47-2231", "15-1252"],
      },
      {
        courseCode: "ENVS201",
        courseName: "Environmental Science",
        subjectArea: "Science",
        gradeLevels: [11, 12],
        courseType: "elective",
        prerequisites: ["Biology I", "Chemistry I"],
        description: "Study of environmental systems and human impact",
        skillsDeveloped: [
          "Data Collection",
          "Environmental Analysis",
          "Research Methods",
          "Critical Thinking",
        ],
        collegeCreditAvailable: true,
        careerRelevance: ["19-1032", "47-2231"],
      },
    ],
  });

  // Non-Credit Courses
  await prisma.nonCreditCourse.createMany({
    data: [
      {
        provider: "Honolulu Community College",
        courseName: "Web Development Bootcamp",
        courseType: "bootcamp",
        durationHours: 480,
        durationWeeks: 12,
        cost: 8500,
        format: "hybrid",
        scheduleType: "evening",
        prerequisites: ["Basic computer skills"],
        learningOutcomes: [
          "HTML/CSS",
          "JavaScript",
          "React",
          "Node.js",
          "Portfolio Development",
        ],
        industryCertifications: ["CompTIA IT Fundamentals"],
        jobPlacementRate: 78.0,
        contactInfo: {
          phone: "808-845-9211",
          email: "workforce@hcc.hawaii.edu",
        },
        registrationUrl: "https://www.hcc.hawaii.edu/workforce",
        nextStartDate: new Date("2024-02-15"),
      },
      {
        provider: "Kapiolani Community College",
        courseName: "Healthcare Assistant Certificate",
        courseType: "certificate",
        durationHours: 120,
        durationWeeks: 8,
        cost: 2200,
        format: "in_person",
        scheduleType: "weekend",
        prerequisites: ["High school diploma", "Background check"],
        learningOutcomes: [
          "Patient Care",
          "Medical Terminology",
          "Vital Signs",
          "Safety Procedures",
        ],
        industryCertifications: ["CNA Preparation"],
        jobPlacementRate: 85.0,
        contactInfo: {
          phone: "808-734-9211",
          email: "workforce@kapiolani.hawaii.edu",
        },
        registrationUrl: "https://www.kapiolani.hawaii.edu/workforce",
        nextStartDate: new Date("2024-03-01"),
      },
      {
        provider: "Hawaii Energy",
        courseName: "Solar Installation Training",
        courseType: "certificate",
        durationHours: 160,
        durationWeeks: 4,
        cost: 3500,
        format: "in_person",
        scheduleType: "full_time",
        prerequisites: ["Physical fitness", "Basic electrical knowledge"],
        learningOutcomes: [
          "Solar Panel Installation",
          "Electrical Connections",
          "Safety Procedures",
          "System Testing",
        ],
        industryCertifications: ["NABCEP Entry Level"],
        jobPlacementRate: 92.0,
        contactInfo: {
          phone: "808-594-0100",
          email: "training@hawaiienergy.com",
        },
        registrationUrl: "https://www.hawaiienergy.com/training",
        nextStartDate: new Date("2024-02-20"),
      },
      {
        provider: "University of Hawaii Professional Development",
        courseName: "Data Analytics Professional Certificate",
        courseType: "certificate",
        durationHours: 240,
        durationWeeks: 16,
        cost: 4200,
        format: "online",
        scheduleType: "part_time",
        prerequisites: ["Excel proficiency", "Basic statistics"],
        learningOutcomes: [
          "SQL",
          "Python",
          "Tableau",
          "Statistical Analysis",
          "Data Visualization",
        ],
        industryCertifications: ["Tableau Desktop Specialist"],
        jobPlacementRate: 73.0,
        contactInfo: { phone: "808-956-7221", email: "outreach@hawaii.edu" },
        registrationUrl:
          "https://www.outreach.hawaii.edu/programs/data-analytics",
        nextStartDate: new Date("2024-02-12"),
      },
      {
        provider: "Hawaii Pacific Health",
        courseName: "Medical Scribe Training",
        courseType: "workshop",
        durationHours: 40,
        durationWeeks: 2,
        cost: 800,
        format: "hybrid",
        scheduleType: "evening",
        prerequisites: ["High school diploma", "Typing 40+ WPM"],
        learningOutcomes: [
          "Medical Terminology",
          "EHR Systems",
          "Documentation",
          "HIPAA Compliance",
        ],
        industryCertifications: ["Medical Scribe Certification"],
        jobPlacementRate: 68.0,
        contactInfo: { phone: "808-535-7000", email: "careers@hph.org" },
        registrationUrl: "https://www.hawaiipacifichealth.org/careers/training",
        nextStartDate: new Date("2024-02-26"),
      },
    ],
  });

  console.log("✅ Created DOE courses and non-credit programs");

  console.log("🎉 Comprehensive database seeded successfully!");
  console.log(`
📊 Seeded Data Summary:
   - ${await prisma.career.count()} careers
   - ${await prisma.educationProgram.count()} education programs  
   - ${await prisma.skillCertification.count()} skills & certifications
   - ${await prisma.company.count()} companies
   - ${await prisma.careerEducationPathway.count()} career-education pathways
   - ${await prisma.companyCareer.count()} company-career relationships
   - ${await prisma.jobMarket.count()} job market entries
   - ${await prisma.doeCourse.count()} DOE courses
   - ${await prisma.nonCreditCourse.count()} non-credit courses
  `);
}

main()
  .catch(e => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
