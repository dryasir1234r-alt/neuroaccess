import { plainLanguageStage } from '@/lib/journey/engine';
import type { JourneyStage } from '@/lib/domain/journey';

/**
 * SYNTHETIC demo data for the vertical slice.
 *
 * This is fabricated data only. It contains no real patient information and
 * is never written to a production database.
 */

export type DemoRole = 'PATIENT' | 'CLINICIAN' | 'ADMIN' | 'FINANCE';

export interface DemoUser {
  readonly id: string;
  readonly name: string;
  readonly role: DemoRole;
  readonly capabilities: readonly string[];
}

export interface DemoPatient {
  readonly id: string;
  readonly name: string;
  readonly stage: JourneyStage;
  readonly assignedClinician: string | null;
  readonly blockers: readonly string[];
}

export const DEMO_ORGANISATION = { id: 'org_demo', name: 'NeuroAssess Demo Clinic' };

export const DEMO_USERS: readonly DemoUser[] = [
  {
    id: 'user_patient_1',
    name: 'Alex Demo (patient)',
    role: 'PATIENT',
    capabilities: [
      'patient:read:own',
      'patient:questionnaire:respond',
      'patient:document:upload',
      'patient:message:send',
      'patient:prescription:track',
    ],
  },
  {
    id: 'user_clinician_1',
    name: 'Dr Sam Demo (clinician)',
    role: 'CLINICIAN',
    capabilities: [
      'clinical:patient:read',
      'clinical:journey:transition',
      'clinical:assessment:create',
      'clinical:note:sign',
      'clinical:diagnosis:record',
      'clinical:ai:generate',
      'clinical:ai:review',
      'clinical:consent:obtain',
    ],
  },
  {
    id: 'user_admin_1',
    name: 'Jo Demo (admin)',
    role: 'ADMIN',
    capabilities: [
      'admin:referral:triage',
      'admin:patient:assign',
      'admin:queue:manage',
      'admin:audit:read',
    ],
  },
  {
    id: 'user_finance_1',
    name: 'Priya Demo (finance)',
    role: 'FINANCE',
    capabilities: ['finance:invoice:read', 'finance:payment:process'],
  },
];

export const DEMO_PATIENTS: readonly DemoPatient[] = [
  {
    id: 'patient_1',
    name: 'Alex Demo',
    stage: 'INTAKE',
    assignedClinician: 'Dr Sam Demo',
    blockers: [],
  },
  {
    id: 'patient_2',
    name: 'Jordan Demo',
    stage: 'DIAGNOSIS_REVIEW',
    assignedClinician: 'Dr Sam Demo',
    blockers: [],
  },
  {
    id: 'patient_3',
    name: 'Riley Demo',
    stage: 'LEAD',
    assignedClinician: null,
    blockers: ['Identity verification outstanding'],
  },
];

export interface DemoTask {
  readonly id: string;
  readonly patientId: string;
  readonly owner: DemoRole;
  readonly title: string;
  readonly status: 'OPEN' | 'COMPLETED';
}

export const DEMO_TASKS: readonly DemoTask[] = [
  { id: 'task_1', patientId: 'patient_1', owner: 'PATIENT', title: 'Complete your intake questionnaires', status: 'OPEN' },
  { id: 'task_2', patientId: 'patient_3', owner: 'ADMIN', title: 'Triage new referral', status: 'OPEN' },
  { id: 'task_3', patientId: 'patient_2', owner: 'CLINICIAN', title: 'Review assessment note draft', status: 'OPEN' },
];

export interface DemoTimelineEvent {
  readonly id: string;
  readonly patientId: string;
  readonly title: string;
  readonly summary: string;
  readonly visibility: 'PATIENT' | 'ASSIGNED_CLINICAL_TEAM' | 'ADMIN';
  readonly occurredAt: string;
}

export const DEMO_TIMELINE: readonly DemoTimelineEvent[] = [
  {
    id: 'tl_1',
    patientId: 'patient_1',
    title: 'Referral received',
    summary: 'GP referral received for assessment.',
    visibility: 'PATIENT',
    occurredAt: '2024-05-01T09:00:00.000Z',
  },
  {
    id: 'tl_2',
    patientId: 'patient_1',
    title: 'Registration validated',
    summary: 'Identity verified by admin.',
    visibility: 'ADMIN',
    occurredAt: '2024-05-02T10:15:00.000Z',
  },
  {
    id: 'tl_3',
    patientId: 'patient_1',
    title: 'Intake started',
    summary: 'Questionnaires assigned to patient.',
    visibility: 'PATIENT',
    occurredAt: '2024-05-03T08:30:00.000Z',
  },
];

export function patientStageLabel(stage: JourneyStage): string {
  return plainLanguageStage(stage);
}

export function demoPatientsForRole(role: DemoRole): readonly DemoPatient[] {
  if (role === 'PATIENT') return DEMO_PATIENTS.filter((p) => p.id === 'patient_1');
  return DEMO_PATIENTS;
}

export function demoTasksForRole(role: DemoRole): readonly DemoTask[] {
  return DEMO_TASKS.filter((t) => t.owner === role);
}
