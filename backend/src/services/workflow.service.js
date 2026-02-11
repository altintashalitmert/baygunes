// Workflow Transition Rules
const WORKFLOW_RULES = {
  PENDING: {
    allowedNext: ['PRINTING', 'CANCELLED'],
    roles: ['SUPER_ADMIN', 'OPERATOR'], // Who can perform this transition
    requiredFields: [] // e.g. ['assigned_printer'] 
  },
  SCHEDULED: {
    allowedNext: ['PENDING', 'CANCELLED'],
    roles: ['SUPER_ADMIN', 'OPERATOR', 'SYSTEM'],
    requiredFields: []
  },
  PRINTING: {
    allowedNext: ['AWAITING_MOUNT', 'CANCELLED'],
    roles: ['SUPER_ADMIN', 'OPERATOR', 'PRINTER'],
    requiredFields: []
  },
  AWAITING_MOUNT: {
    allowedNext: ['LIVE', 'CANCELLED'],
    roles: ['SUPER_ADMIN', 'OPERATOR', 'FIELD'],
    // requiredFields: ['proof_photo'] // Future: require photo upload
  },
  LIVE: {
    allowedNext: ['EXPIRED', 'COMPLETED'], // EXPIRED for timeout, COMPLETED for early finish/dismount
    roles: ['SUPER_ADMIN', 'SYSTEM'], // System cron job or Admin
  },
  EXPIRED: {
    allowedNext: ['COMPLETED'],
    roles: ['SUPER_ADMIN', 'OPERATOR', 'FIELD'],
  },
  COMPLETED: {
    allowedNext: [], // Terminal state
    roles: []
  },
  CANCELLED: {
    allowedNext: [], // Terminal state
    roles: []
  }
};


/**
 * Validates if a status transition is allowed
 * @param {string} currentStatus 
 * @param {string} newStatus 
 * @param {Object} user - Request user object
 * @returns {Object} { allowed: boolean, error?: string }
 */
export const validateTransition = (currentStatus, newStatus, user) => {
  const rule = WORKFLOW_RULES[currentStatus];

  if (!rule) {
    return { allowed: false, error: `Invalid current status: ${currentStatus}` };
  }

  if (!rule.allowedNext.includes(newStatus)) {
    return { 
      allowed: false, 
      error: `Transition from ${currentStatus} to ${newStatus} is not allowed. Allowed: ${rule.allowedNext.join(', ')}` 
    };
  }

  // Role check (skip for SUPER_ADMIN to allow override, or enforce strictly?)
  // Let's enforce strictly defined roles unless user is SUPER_ADMIN which is usually in all lists anyway
  // specific logic: if user role is not in the list (and maybe perform check for 'SYSTEM')

  // Allow SUPER_ADMIN (or 'SYSTEM' role which might be used internally) to bypass
  const isAdmin = ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(user.role);
  
  if (!rule.roles.includes(user.role) && !isAdmin) {
     return { allowed: false, error: `User role ${user.role} is not authorized for this action` };
  }

  return { allowed: true };
};

export const getNextStatuses = (currentStatus) => {
  return WORKFLOW_RULES[currentStatus]?.allowedNext || [];
};
