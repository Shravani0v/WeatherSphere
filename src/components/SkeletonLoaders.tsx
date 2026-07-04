import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Search and Header Grid */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2 w-1/3">
          <div className="h-8 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg w-full" />
          <div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded-md w-2/3" />
        </div>
        <div className="h-10 bg-slate-200/50 dark:bg-slate-800/50 rounded-full w-48" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Weather Info Card */}
        <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-200/20 dark:bg-slate-800/20 border border-slate-200/10 space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-6 bg-slate-200/50 dark:bg-slate-800/50 rounded-md w-1/2" />
            <div className="h-8 w-8 bg-slate-200/50 dark:bg-slate-800/50 rounded-full" />
          </div>
          <div className="space-y-3 py-6">
            <div className="h-16 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl w-3/4 mx-auto" />
            <div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded-md w-1/2 mx-auto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg" />
            <div className="h-12 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg" />
            <div className="h-12 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg" />
            <div className="h-12 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg" />
          </div>
        </div>

        {/* Center/Right: Hourly and AI block */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hourly chart block */}
          <div className="p-6 rounded-3xl bg-slate-200/20 dark:bg-slate-800/20 border border-slate-200/10 space-y-4">
            <div className="h-6 bg-slate-200/50 dark:bg-slate-800/50 rounded-md w-1/4" />
            <div className="h-48 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl w-full" />
          </div>

          {/* AI summaries block */}
          <div className="p-6 rounded-3xl bg-slate-200/20 dark:bg-slate-800/20 border border-slate-200/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-slate-200/50 dark:bg-slate-800/50 rounded-full" />
              <div className="h-6 bg-slate-200/50 dark:bg-slate-800/50 rounded-md w-1/3" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded w-full" />
              <div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded w-11/12" />
              <div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
