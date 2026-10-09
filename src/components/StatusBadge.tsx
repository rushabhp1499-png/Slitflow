import React from 'react';
import { ProductionStatus } from '../types';
import { Clock, Play, CheckCircle2, Truck, PackageCheck, AlertCircle, Lock, Zap } from 'lucide-react';

interface StatusBadgeProps {
  status: ProductionStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const configs: Record<ProductionStatus, {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
    pulse?: boolean;
  }> = {
    received: {
      label: 'Material Received (Pending EDD)',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      icon: AlertCircle,
    },
    pending_production: {
      label: 'Not Taken Under Production',
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-300',
      icon: Clock,
    },
    in_production: {
      label: 'Under Slitting (In Progress)',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
      icon: Play,
      pulse: true,
    },
    slitting_completed: {
      label: 'Slitting Done (Packing)',
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-300',
      icon: PackageCheck,
    },
    ready_for_dispatch: {
      label: 'Ready for Dispatch',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      icon: CheckCircle2,
    },
    partially_dispatched: {
      label: 'Partial Dispatch Issued',
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-300',
      icon: Zap,
    },
    dispatched: {
      label: 'Dispatched (Challan Issued)',
      bg: 'bg-zinc-100',
      text: 'text-zinc-700',
      border: 'border-zinc-300',
      icon: Truck,
    },
    po_closed: {
      label: 'PO Permanently Closed',
      bg: 'bg-slate-900',
      text: 'text-white',
      border: 'border-slate-800',
      icon: Lock,
    },
  };

  const config = configs[status] || configs.pending_production;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-semibold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} whitespace-nowrap`}
    >
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${config.pulse ? 'animate-pulse text-blue-600' : ''}`} />
      <span>{config.label}</span>
      {config.pulse && (
        <span className="relative flex h-2 w-2 ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
        </span>
      )}
    </span>
  );
};
