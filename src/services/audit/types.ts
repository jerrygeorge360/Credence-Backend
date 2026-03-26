/**
 * Audit log action types
 */
export enum AuditAction {
  LIST_USERS = 'LIST_USERS',
  ASSIGN_ROLE = 'ASSIGN_ROLE',
  REVOKE_ROLE = 'REVOKE_ROLE',
  REVOKE_API_KEY = 'REVOKE_API_KEY',
  CREATE_API_KEY = 'CREATE_API_KEY',
  DELETE_USER = 'DELETE_USER',
  EXPORT_AUDIT_LOGS = 'EXPORT_AUDIT_LOGS',
  INVITE_MEMBER = 'INVITE_MEMBER',
  LIST_MEMBERS = 'LIST_MEMBERS',
  UPDATE_MEMBER_ROLE = 'UPDATE_MEMBER_ROLE',
  DELETE_MEMBER = 'DELETE_MEMBER',
  RESTORE_MEMBER = 'RESTORE_MEMBER'
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string
  timestamp: string
  adminId: string
  adminEmail: string
  action: AuditAction
  targetUserId: string
  targetUserEmail: string
  details: Record<string, unknown>
  ipAddress?: string
  status: 'success' | 'failure'
  errorMessage?: string
}
