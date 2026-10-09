import React from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward } from '../types';
import {
  Bell,
  CheckCheck,
  X,
  Clock,
  PackagePlus,
  Scissors,
  Truck,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface NotificationsDrawerProps {
  onClose: () => void;
  onSelectJob: (job: MaterialInward) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  onClose,
  onSelectJob,
}) => {
  const { notifications, markNotificationRead, markAllNotificationsRead, jobs } = useProduction();

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_material_inward':
        return <PackagePlus className="w-4 h-4 text-amber-500" />;
      case 'edd_updated':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'production_started':
        return <Scissors className="w-4 h-4 text-indigo-500" />;
      case 'slitting_completed':
        return <CheckCircle2 className="w-4 h-4 text-purple-500" />;
      case 'ready_for_dispatch':
      case 'challan_generated':
        return <Truck className="w-4 h-4 text-emerald-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleNotificationClick = (notifId: string, jobId: string) => {
    markNotificationRead(notifId);
    const targetJob = jobs.find((j) => j.id === jobId);
    if (targetJob) {
      onSelectJob(targetJob);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs no-print">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-white">Factory & Dispatch Alerts</h3>
            <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
              {notifications.filter((n) => !n.read).length} new
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllNotificationsRead}
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1 transition"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-slate-400">New inward entries and EDD changes will appear here.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif.id, notif.jobId)}
                className={`pt-2.5 pb-2 px-3 rounded-lg cursor-pointer transition flex items-start gap-3 ${
                  !notif.read ? 'bg-blue-50/60 border border-blue-100' : 'hover:bg-slate-50'
                }`}
              >
                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{notif.title}</h4>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                    <span>{notif.customerName}</span>
                    <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0">
          <p className="text-[11px] text-slate-500">
            Click any notification to open the associated material order.
          </p>
        </div>

      </div>
    </div>
  );
};
