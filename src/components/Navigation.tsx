import React from 'react';
import {
  LayoutDashboard,
  LineChart,
  Split,
  FlaskConical,
  Sliders,
  AlertOctagon,
  BookOpen,
} from 'lucide-react';

export type NavTabId =
  | 'overview'
  | 'monitoring'
  | 'mux-explorer'
  | 'experiment-lab'
  | 'sensor-config'
  | 'fault-simulator'
  | 'documentation';

interface NavigationProps {
  currentTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  activeAlertCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  activeAlertCount,
}) => {
  const tabs = [
    { id: 'overview' as NavTabId, label: 'Overview', icon: LayoutDashboard },
    { id: 'monitoring' as NavTabId, label: 'Live Monitoring', icon: LineChart },
    { id: 'mux-explorer' as NavTabId, label: '4:1 MUX Explorer', icon: Split },
    { id: 'experiment-lab' as NavTabId, label: 'Experiment Lab', icon: FlaskConical },
    { id: 'fault-simulator' as NavTabId, label: 'Fault Simulator', icon: AlertOctagon, badge: activeAlertCount },
    { id: 'sensor-config' as NavTabId, label: 'Channel Config', icon: Sliders },
    { id: 'documentation' as NavTabId, label: 'Documentation & Viva', icon: BookOpen },
  ];

  return (
    <nav className="bg-[#EDE4D3] border-b border-[#DED8CC] px-4 lg:px-8 py-1.5 overflow-x-auto">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-[#14532D] text-[#FAF9F6] shadow-xs'
                  : 'text-[#18352A] hover:bg-[#DED8CC] hover:text-[#14532D]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#FAF9F6]' : 'text-[#3D5549]'}`} />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-[#FAF9F6] text-[#B42318]' : 'bg-[#B42318] text-[#FAF9F6]'
                  }`}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
