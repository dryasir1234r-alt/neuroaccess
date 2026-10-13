# NeuroAssess Permission Model

## Philosophy
- **Deny by default** - No access unless explicitly granted
- **Capability-based** - Not role-based; roles are collections of capabilities
- **Server-side enforcement** - Every mutation validates capabilities
- **Organisation isolation** - Cross-organisation access denied by default
- **Patient isolation** - Cross-patient access requires explicit capability

## Capability Categories

### Patient Capabilities
| Code | Description |
|------|-------------|
| `patient:read:own` | Read own patient record |
| `patient:update:own` | Update own demographics |
| `patient:journey:read:own` | Read own care journey |
| `patient:questionnaire:respond` | Complete questionnaires |
| `patient:document:upload` | Upload documents |
| `patient:message:send` | Send messages to care team |
| `patient:appointment:book` | Book/manage appointments |
| `patient:prescription:track` | Track prescription status |
| `patient:report:read:approved` | Read approved reports |
| `patient:payment:make` | Make payments |

### Clinical Capabilities
| Code | Description |
|------|-------------|
| `clinical:patient:read` | Read assigned patients |
| `clinical:patient:read:all` | Read all patients in organisation |
| `clinical:journey:transition` | Transition care journey stages |
| `clinical:assessment:create` | Create assessments |
| `clinical:assessment:read` | Read assessments |
| `clinical:note:create` | Create clinical notes |
| `clinical:note:sign` | Sign clinical notes |
| `clinical:note:amend` | Amend signed notes |
| `clinical:diagnosis:record` | Record diagnosis |
| `clinical:prescription:create` | Create prescriptions |
| `clinical:prescription:sign` | Sign prescriptions |
| `clinical:prescription:review` | Review prescriptions |
| `clinical:titration:manage` | Manage titration |
| `clinical:monitoring:review` | Review monitoring data |
| `clinical:message:reply` | Reply to patient messages |
| `clinical:report:create` | Create diagnostic reports |
| `clinical:report:approve` | Approve reports for release |
| `clinical:mdt:participate` | Participate in MDT |
| `clinical:consent:obtain` | Obtain patient consent |
| `clinical:ai:generate` | Generate AI drafts |
| `clinical:ai:review` | Review AI drafts |

### Admin Capabilities
| Code | Description |
|------|-------------|
| `admin:referral:triage` | Triage referrals |
| `admin:patient:assign` | Assign patients to clinicians |
| `admin:patient:reassign` | Reassign patients |
| `admin:queue:manage` | Manage operational queues |
| `admin:appointment:manage` | Manage all appointments |
| `admin:capacity:manage` | Manage clinician capacity |
| `admin:waitlist:manage` | Manage waiting lists |
| `admin:complaint:manage` | Manage complaints |
| `admin:audit:read` | Read audit logs |
| `admin:workflow:configure` | Configure organisation workflow |
| `admin:feature:manage` | Manage feature flags |

### Finance Capabilities
| Code | Description |
|------|-------------|
| `finance:invoice:create` | Create invoices |
| `finance:invoice:read` | Read invoices |
| `finance:payment:process` | Process payments |
| `finance:payment:refund` | Process refunds |
| `finance:reconciliation:run` | Run reconciliation |
| `finance:earnings:read` | Read clinician earnings |
| `finance:export:generate` | Generate financial exports |
| `finance:report:read` | Read financial reports |

### AI Capabilities
| Code | Description |
|------|-------------|
| `ai:transcription:start` | Start transcription |
| `ai:transcription:access` | Access transcripts |
| `ai:draft:generate` | Generate AI drafts |
| `ai:draft:review` | Review AI drafts |
| `ai:model:configure` | Configure model providers |
| `ai:audit:read` | Read AI audit logs |

### System Capabilities
| Code | Description |
|------|-------------|
| `system:user:manage` | Manage users |
| `system:role:manage` | Manage roles |
| `system:organisation:manage` | Manage organisations |
| `system:feature:manage` | Manage feature flags globally |
| `system:audit:read:all` | Read all audit logs |

## Capability-to-Role Mapping

### Patient Role
- `patient:read:own`
- `patient:update:own`
- `patient:journey:read:own`
- `patient:questionnaire:respond`
- `patient:document:upload`
- `patient:message:send`
- `patient:appointment:book`
- `patient:prescription:track`
- `patient:report:read:approved`
- `patient:payment:make`

### Clinician Role
- `clinical:patient:read`
- `clinical:journey:transition`
- `clinical:assessment:create`
- `clinical:assessment:read`
- `clinical:note:create`
- `clinical:note:sign`
- `clinical:diagnosis:record`
- `clinical:prescription:create`
- `clinical:prescription:sign`
- `clinical:titration:manage`
- `clinical:monitoring:review`
- `clinical:message:reply`
- `clinical:report:create`
- `clinical:consent:obtain`
- `clinical:ai:generate`
- `clinical:ai:review`

### Senior Clinician Role (includes Clinician)
- `clinical:patient:read:all`
- `clinical:note:amend`
- `clinical:prescription:review`
- `clinical:report:approve`
- `clinical:mdt:participate`

### Admin Role
- `admin:referral:triage`
- `admin:patient:assign`
- `admin:patient:reassign`
- `admin:queue:manage`
- `admin:appointment:manage`
- `admin:capacity:manage`
- `admin:waitlist:manage`
- `admin:complaint:manage`
- `admin:audit:read`
- `admin:workflow:configure`

### Finance Role
- `finance:invoice:create`
- `finance:invoice:read`
- `finance:payment:process`
- `finance:payment:refund`
- `finance:reconciliation:run`
- `finance:earnings:read`
- `finance:export:generate`
- `finance:report:read`

### Super Admin Role (includes all)
- All capabilities

## Permission Evaluation

```typescript
async function authorize(
  capability: string,
  resource: { type: string; id: string; organisationId: string },
  context: { userId: string; capabilities: string[]; organisationId: string }
): Promise<boolean> {
  // 1. Emergency kill switch check
  if (await isEmergencyDisabled(capability)) return false;

  // 2. Environment restriction
  if (!isCapabilityAllowedInEnvironment(capability)) return false;

  // 3. Organisation-level setting
  const orgSetting = await getOrganisationCapabilitySetting(
    context.organisationId,
    capability
  );
  if (orgSetting === 'DISABLED') return false;

  // 4. Capability restriction
  if (!context.capabilities.includes(capability)) return false;

  // 5. User-level testing override
  const userOverride = await getUserCapabilityOverride(context.userId, capability);
  if (userOverride === 'DISABLED') return false;
  if (userOverride === 'ENABLED') return true;

  // 6. Cohort/percentage rollout
  if (await isInRolloutCohort(context.userId, capability)) return true;

  // 7. Default state
  return getDefaultCapabilityState(capability);
}
```

## Resource-Level Permissions

### Patient Record Access
```typescript
function canAccessPatient(user: User, patient: Patient): boolean {
  // Same organisation required
  if (user.organisationId !== patient.organisationId) return false;

  // Patient can access own record
  if (user.id === patient.userId) return true;

  // Clinician can access assigned patients
  if (user.capabilities.includes('clinical:patient:read')) {
    const assignment = await getClinicianAssignment(user.id, patient.id);
    if (assignment) return true;
  }

  // Senior clinician can access all in org
  if (user.capabilities.includes('clinical:patient:read:all')) return true;

  // Admin can access all in org
  if (user.capabilities.includes('admin:patient:assign')) return true;

  return false;
}
```

### Journey Transition Permissions
```typescript
function canTransitionJourney(user: User, patient: Patient, command: JourneyCommand): boolean {
  if (!canAccessPatient(user, patient)) return false;

  switch (command.type) {
    case 'VALIDATE_REGISTRATION':
    case 'SCHEDULE_APPOINTMENT':
    case 'REQUEST_INFORMATION':
      return user.capabilities.includes('admin:referral:triage');

    case 'COMPLETE_TRIAGE':
      return user.capabilities.includes('clinical:journey:transition');

    case 'START_ASSESSMENT':
    case 'COMPLETE_ASSESSMENT':
    case 'SUBMIT_DIAGNOSIS':
      return user.capabilities.includes('clinical:journey:transition') &&
             (await isAssignedClinician(user.id, patient.id));

    case 'START_TITRATION':
    case 'COMPLETE_TITRATION':
      return user.capabilities.includes('clinical:titration:manage');

    case 'DISCHARGE':
      return user.capabilities.includes('clinical:journey:transition') &&
             (await isAssignedClinician(user.id, patient.id));

    default:
      return false;
  }
}
```

## Audit Requirements

Every permission check that results in DENY must log:
- User ID
- Capability requested
- Resource type & ID
- Organisation ID
- Timestamp
- Reason for denial
- Call stack (for debugging)

Every permission check that results in ALLOW for sensitive capabilities must log:
- User ID
- Capability granted
- Resource type & ID
- Organisation ID
- Timestamp
- Context (e.g., which journey transition)