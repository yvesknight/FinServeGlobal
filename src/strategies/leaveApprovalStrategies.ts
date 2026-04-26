
export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED'
}

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  TEAM_LEAD = 'TEAM_LEAD',
  HR_MANAGER = 'HR_MANAGER',
  ADMIN = 'ADMIN'
}

export interface LeaveApprovalContext {
  days: number;
  role: UserRole;
}

export interface LeaveApprovalResult {
  status: LeaveStatus;
  message: string;
}

export interface LeaveApprovalStrategy {
  canHandle(context: LeaveApprovalContext): boolean;
  approve(context: LeaveApprovalContext): LeaveApprovalResult;
}

export class AutoApprovalStrategy implements LeaveApprovalStrategy {
  canHandle(context: LeaveApprovalContext): boolean {
    return context.days <= 2;
  }
  approve(context: LeaveApprovalContext): LeaveApprovalResult {
    return {
      status: LeaveStatus.APPROVED,
      message: 'Leave auto-approved for short duration (<= 2 days).'
    };
  }
}

export class StandardApprovalStrategy implements LeaveApprovalStrategy {
  canHandle(context: LeaveApprovalContext): boolean {
    return context.days > 2 && context.days <= 5;
  }
  approve(context: LeaveApprovalContext): LeaveApprovalResult {
    return {
      status: LeaveStatus.PENDING,
      message: 'Leave pending Team Lead approval (Standard: 3-5 days).'
    };
  }
}

export class HREscalationStrategy implements LeaveApprovalStrategy {
  canHandle(context: LeaveApprovalContext): boolean {
    return context.days > 5;
  }
  approve(context: LeaveApprovalContext): LeaveApprovalResult {
    return {
      status: LeaveStatus.ESCALATED,
      message: 'Leave escalated to HR Manager for long duration (> 5 days).'
    };
  }
}

export class LeaveApprovalService {
  private strategies: LeaveApprovalStrategy[] = [
    new AutoApprovalStrategy(),
    new StandardApprovalStrategy(),
    new HREscalationStrategy()
  ];

  processLeaveRequest(days: number, role: UserRole): LeaveApprovalResult {
    const context: LeaveApprovalContext = { days, role };
    const strategy = this.strategies.find(s => s.canHandle(context));
    
    if (!strategy) {
      return {
        status: LeaveStatus.PENDING,
        message: 'No suitable strategy found. Defaulting to manual review.'
      };
    }

    return strategy.approve(context);
  }
}
