import { PrismaClient } from '@prisma/client';

/**
 * Synthetic seed data only.
 *
 * NEVER place real patient information in seed files. All identities below are
 * fabricated demo records.
 */
const prisma = new PrismaClient();

const CAPABILITIES = [
  ['patient:read:own', 'Read own patient record', 'PATIENT'],
  ['patient:questionnaire:respond', 'Complete questionnaires', 'PATIENT'],
  ['patient:document:upload', 'Upload documents', 'PATIENT'],
  ['patient:message:send', 'Send messages to care team', 'PATIENT'],
  ['patient:prescription:track', 'Track prescription status', 'PATIENT'],
  ['clinical:patient:read', 'Read assigned patients', 'CLINICAL'],
  ['clinical:patient:read:all', 'Read all patients in organisation', 'CLINICAL'],
  ['clinical:journey:transition', 'Transition care journey stages', 'CLINICAL'],
  ['clinical:assessment:create', 'Create assessments', 'CLINICAL'],
  ['clinical:note:sign', 'Sign clinical notes', 'CLINICAL'],
  ['clinical:diagnosis:record', 'Record diagnosis', 'CLINICAL'],
  ['clinical:prescription:create', 'Create prescriptions', 'CLINICAL'],
  ['clinical:titration:manage', 'Manage titration', 'CLINICAL'],
  ['clinical:monitoring:review', 'Review monitoring data', 'CLINICAL'],
  ['clinical:message:reply', 'Reply to patient messages', 'CLINICAL'],
  ['clinical:report:create', 'Create diagnostic reports', 'CLINICAL'],
  ['clinical:mdt:participate', 'Participate in MDT', 'CLINICAL'],
  ['clinical:consent:obtain', 'Obtain patient consent', 'CLINICAL'],
  ['clinical:ai:generate', 'Generate AI drafts', 'AI'],
  ['clinical:ai:review', 'Review AI drafts', 'AI'],
  ['admin:referral:triage', 'Triage referrals', 'ADMIN'],
  ['admin:patient:assign', 'Assign patients to clinicians', 'ADMIN'],
  ['admin:patient:reassign', 'Reassign patients', 'ADMIN'],
  ['admin:queue:manage', 'Manage operational queues', 'ADMIN'],
  ['admin:complaint:manage', 'Manage complaints', 'ADMIN'],
  ['admin:audit:read', 'Read audit logs', 'ADMIN'],
  ['admin:feature:manage', 'Manage feature flags', 'ADMIN'],
  ['finance:invoice:read', 'Read invoices', 'FINANCE'],
  ['finance:invoice:create', 'Create invoices', 'FINANCE'],
  ['finance:payment:process', 'Process payments', 'FINANCE'],
  ['ai:transcription:start', 'Start transcription', 'AI'],
  ['ai:model:configure', 'Configure model providers', 'AI'],
  ['ai:audit:read', 'Read AI audit logs', 'AI'],
  ['system:feature:manage', 'Manage feature flags globally', 'SYSTEM'],
  ['system:audit:read:all', 'Read all audit logs', 'SYSTEM'],
] as const;

const ROLES: Record<string, readonly string[]> = {
  PATIENT: [
    'patient:read:own',
    'patient:questionnaire:respond',
    'patient:document:upload',
    'patient:message:send',
    'patient:prescription:track',
  ],
  CLINICIAN: [
    'clinical:patient:read',
    'clinical:journey:transition',
    'clinical:assessment:create',
    'clinical:note:sign',
    'clinical:diagnosis:record',
    'clinical:prescription:create',
    'clinical:titration:manage',
    'clinical:monitoring:review',
    'clinical:message:reply',
    'clinical:report:create',
    'clinical:consent:obtain',
    'clinical:ai:generate',
    'clinical:ai:review',
  ],
  ADMIN: [
    'admin:referral:triage',
    'admin:patient:assign',
    'admin:patient:reassign',
    'admin:queue:manage',
    'admin:complaint:manage',
    'admin:audit:read',
  ],
  FINANCE: ['finance:invoice:read', 'finance:invoice:create', 'finance:payment:process'],
};

async function main() {
  const org = await prisma.organisation.upsert({
    where: { slug: 'neuroassess-demo' },
    update: {},
    create: { name: 'NeuroAssess Demo Clinic', slug: 'neuroassess-demo' },
  });

  for (const [code, description, category] of CAPABILITIES) {
    await prisma.capability.upsert({
      where: { code },
      update: { description },
      create: { code, description, category: category as never },
    });
  }

  for (const [name, codes] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} role` },
    });
    for (const code of codes) {
      const cap = await prisma.capability.findUnique({ where: { code } });
      if (!cap) continue;
      await prisma.roleCapability.upsert({
        where: { roleId_capabilityId: { roleId: role.id, capabilityId: cap.id } },
        update: {},
        create: { roleId: role.id, capabilityId: cap.id },
      });
    }
  }

  const users = [
    { email: 'patient.demo@example.invalid', name: 'Alex Demo', role: 'PATIENT' },
    { email: 'clinician.demo@example.invalid', name: 'Dr Sam Demo', role: 'CLINICIAN' },
    { email: 'admin.demo@example.invalid', name: 'Jo Demo', role: 'ADMIN' },
    { email: 'finance.demo@example.invalid', name: 'Priya Demo', role: 'FINANCE' },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, organisationId: org.id },
    });
    const role = await prisma.role.findUnique({ where: { name: u.role } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }
  }

  const patientUser = await prisma.user.findUnique({
    where: { email: 'patient.demo@example.invalid' },
  });
  if (patientUser) {
    const existing = await prisma.patient.findUnique({ where: { userId: patientUser.id } });
    if (!existing) {
      const patient = await prisma.patient.create({
        data: {
          userId: patientUser.id,
          organisationId: org.id,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'NOT_STATED',
        },
      });
      await prisma.journey.create({
        data: { patientId: patient.id, stage: 'LEAD', version: 1 },
      });
    }
  }

  console.log('Synthetic seed complete (no real patient data).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
