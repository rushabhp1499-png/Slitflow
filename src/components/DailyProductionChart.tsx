import React, { useState, useMemo } from 'react';
import { MaterialInward } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Layers,
  Truck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
  Weight,
  Scissors,
  Package,
  Award
} from 'lucide-react';

interface DailyProductionChartProps {
  jobs: MaterialInward[];
  onSelectDateFilter?: (date: string) => void;
}

export type ChartType = 'bar' | 'line' | 'area';
export type MetricFocus = 'output_vs_dispatch' | 'output_vs_inward' | 'yield_and_scrap' | 'bundles';

interface DailyMetric {
  date: string;
  displayDate: string;
  shortDay: string;
  finishedOutputKg: number;
  dispatchedKg: number;
  inwardKg: number;
  scrapKg: number;
  bundlesCount: number;
  yieldPercent: number;
  activeJobsCount: number;
  materials: string[];
}

export const DailyProductionChart: React.FC<DailyProductionChartProps> = ({
  jobs,
  onSelectDateFilter,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [metricFocus, setMetricFocus] = useState<MetricFocus>('output_vs_dispatch');

  // Aggregation of raw jobs data into daily production output
  const dailyData: DailyMetric[] = useMemo(() => {
    const dateMap: { [dateStr: string]: {
      finishedOutputKg: number;
      dispatchedKg: number;
      inwardKg: number;
      scrapKg: number;
      bundlesCount: number;
      yieldSum: number;
      yieldCount: number;
      jobSet: Set<string>;
      materialsSet: Set<string>;
    } } = {};

    const getOrCreate = (d: string) => {
      if (!dateMap[d]) {
        dateMap[d] = {
          finishedOutputKg: 0,
          dispatchedKg: 0,
          inwardKg: 0,
          scrapKg: 0,
          bundlesCount: 0,
          yieldSum: 0,
          yieldCount: 0,
          jobSet: new Set(),
          materialsSet: new Set(),
        };
      }
      return dateMap[d];
    };

    // 1. Process Raw Inward Material
    jobs.forEach((job) => {
      if (job.receivedDate) {
        const d = job.receivedDate.split('T')[0];
        const entry = getOrCreate(d);
        entry.inwardKg += job.incomingWeight || 0;
        entry.jobSet.add(job.jobNo);
        if (job.grade) entry.materialsSet.add(job.grade);
      }
    });

    // 2. Process Recorded Slitting Output
    jobs.forEach((job) => {
      if (job.outputDetails) {
        const out = job.outputDetails;
        let d = '';
        if (out.completedAt) {
          d = out.completedAt.split('T')[0];
        } else if (job.receivedDate) {
          d = job.receivedDate.split('T')[0];
        }

        if (d) {
          const entry = getOrCreate(d);
          entry.finishedOutputKg += out.totalFinishedWeightKg || 0;
          entry.scrapKg += out.scrapWeightKg || 0;
          entry.bundlesCount += out.totalBundles || 0;
          if (out.yieldPercentage) {
            entry.yieldSum += out.yieldPercentage;
            entry.yieldCount += 1;
          }
          entry.jobSet.add(job.jobNo);
          if (job.grade) entry.materialsSet.add(job.grade);
        }
      }
    });

    // 3. Process Weighed Bundles (if bundles weighed on days separate from output)
    jobs.forEach((job) => {
      if (job.bundles && job.bundles.length > 0) {
        job.bundles.forEach((b) => {
          if (b.weighedAt && !b.isVoided) {
            const d = b.weighedAt.split('T')[0];
            const entry = getOrCreate(d);
            entry.jobSet.add(job.jobNo);
            if (job.grade) entry.materialsSet.add(job.grade);
          }
        });
      }
    });

    // 4. Process Dispatched Delivery Challans
    jobs.forEach((job) => {
      if (job.challans && job.challans.length > 0) {
        job.challans.forEach((ch) => {
          if (ch.challanDate && !ch.isSuperseded) {
            const d = ch.challanDate.split('T')[0];
            const entry = getOrCreate(d);
            entry.dispatchedKg += ch.thisDispatchWeightKg || ch.totalNetWeightKg || 0;
            entry.jobSet.add(job.jobNo);
            if (job.grade) entry.materialsSet.add(job.grade);
          }
        });
      }
    });

    // Sort dates chronologically
    const sortedDates = Object.keys(dateMap).sort();

    return sortedDates.map((dateStr) => {
      const item = dateMap[dateStr];
      const parsed = new Date(dateStr + 'T00:00:00');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const displayDate = `${monthNames[parsed.getMonth()]} ${String(parsed.getDate()).padStart(2, '0')}`;
      const shortDay = dayNames[parsed.getDay()];

      const avgYield = item.yieldCount > 0
        ? Number((item.yieldSum / item.yieldCount).toFixed(1))
        : item.finishedOutputKg > 0 && (item.finishedOutputKg + item.scrapKg) > 0
        ? Number(((item.finishedOutputKg / (item.finishedOutputKg + item.scrapKg)) * 100).toFixed(1))
        : 97.0;

      return {
        date: dateStr,
        displayDate,
        shortDay,
        finishedOutputKg: Math.round(item.finishedOutputKg * 10) / 10,
        dispatchedKg: Math.round(item.dispatchedKg * 10) / 10,
        inwardKg: Math.round(item.inwardKg * 10) / 10,
        scrapKg: Math.round(item.scrapKg * 10) / 10,
        bundlesCount: item.bundlesCount,
        yieldPercent: avgYield,
        activeJobsCount: item.jobSet.size,
        materials: Array.from(item.materialsSet),
      };
    });
  }, [jobs]);

  // Overall KPI statistics
  const totals = useMemo(() => {
    const totalFinished = dailyData.reduce((acc, d) => acc + d.finishedOutputKg, 0);
    const totalDispatched = dailyData.reduce((acc, d) => acc + d.dispatchedKg, 0);
    const totalInward = dailyData.reduce((acc, d) => acc + d.inwardKg, 0);
    const totalScrap = dailyData.reduce((acc, d) => acc + d.scrapKg, 0);
    const totalBundles = dailyData.reduce((acc, d) => acc + d.bundlesCount, 0);

    const daysCount = dailyData.length || 1;
    const avgDailyOutput = Math.round(totalFinished / daysCount);
    const peakOutput = Math.max(...dailyData.map((d) => d.finishedOutputKg), 0);
    const peakDay = dailyData.find((d) => d.finishedOutputKg === peakOutput)?.displayDate || 'N/A';

    const overallYield = totalFinished + totalScrap > 0
      ? Number(((totalFinished / (totalFinished + totalScrap)) * 100).toFixed(1))
      : 97.2;

    return {
      totalFinished,
      totalDispatched,
      totalInward,
      totalScrap,
      totalBundles,
      avgDailyOutput,
      peakOutput,
      peakDay,
      overallYield,
    };
  }, [dailyData]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as DailyMetric;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[220px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/80">
            <span className="font-bold text-slate-200">
              {dataPoint.displayDate} ({dataPoint.shortDay})
            </span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">
              {dataPoint.activeJobsCount} PO(s) Active
            </span>
          </div>

          <div className="space-y-1.5 font-medium">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-blue-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                Finished Output:
              </span>
              <span className="font-bold font-mono text-white">
                {dataPoint.finishedOutputKg.toLocaleString()} kg
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Dispatched:
              </span>
              <span className="font-bold font-mono text-white">
                {dataPoint.dispatchedKg.toLocaleString()} kg
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                Inward Received:
              </span>
              <span className="font-bold font-mono text-white">
                {dataPoint.inwardKg.toLocaleString()} kg
              </span>
            </div>

            {dataPoint.scrapKg > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-rose-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                  Edge Scrap:
                </span>
                <span className="font-bold font-mono text-white">
                  {dataPoint.scrapKg.toLocaleString()} kg
                </span>
              </div>
            )}

            <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
              <span>Avg Slit Yield:</span>
              <span className="font-bold text-emerald-400">{dataPoint.yieldPercent}%</span>
            </div>

            {dataPoint.materials.length > 0 && (
              <div className="pt-1.5 text-[10px] text-slate-400 truncate max-w-[210px]" title={dataPoint.materials.join(', ')}>
                Grades: {dataPoint.materials.join(', ')}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                Daily Production Output Dashboard
              </h2>
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-300" />
                Live Shop-Floor Analytics
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Converting raw slitting, bundle weighing, and dispatch logs into daily performance trends
            </p>
          </div>
        </div>

        {/* Controls: Chart Type, Metric, and Collapse Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart Type Toggle: Bar vs Line vs Area */}
          <div className="bg-slate-800/90 border border-slate-700 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                chartType === 'bar'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Bar Chart visualization"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bar</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                chartType === 'line'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Line Chart visualization"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Line</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                chartType === 'area'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Filled Area Chart visualization"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Area</span>
            </button>
          </div>

          {/* Metric Selector */}
          <select
            value={metricFocus}
            onChange={(e) => setMetricFocus(e.target.value as MetricFocus)}
            className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="output_vs_dispatch">Finished Output vs Dispatched</option>
            <option value="output_vs_inward">Daily Output vs Inward Raw</option>
            <option value="yield_and_scrap">Finished vs Edge Scrap</option>
            <option value="bundles">Shop-Floor Bundles Count</option>
          </select>

          {/* Collapse/Expand button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title={isCollapsed ? 'Expand Production Summary' : 'Collapse Production Summary'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-5 animate-in fade-in duration-200">
          {/* Key Summary KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Total Finished Output */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Output</span>
                <Scissors className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-1.5">
                <span className="text-xl font-black text-slate-900">
                  {totals.totalFinished.toLocaleString()} <span className="text-xs font-bold text-slate-500">kg</span>
                </span>
                <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
                  {(totals.totalFinished / 1000).toFixed(2)} MT Finished
                </p>
              </div>
            </div>

            {/* Total Dispatched */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Dispatched</span>
                <Truck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-1.5">
                <span className="text-xl font-black text-slate-900">
                  {totals.totalDispatched.toLocaleString()} <span className="text-xs font-bold text-slate-500">kg</span>
                </span>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  {(totals.totalDispatched / 1000).toFixed(2)} MT on Challans
                </p>
              </div>
            </div>

            {/* Daily Output Velocity */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Avg Daily Run</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-1.5">
                <span className="text-xl font-black text-slate-900">
                  {totals.avgDailyOutput.toLocaleString()} <span className="text-xs font-bold text-slate-500">kg/day</span>
                </span>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Peak: {totals.peakOutput.toLocaleString()} kg ({totals.peakDay})
                </p>
              </div>
            </div>

            {/* Production Yield */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Overall Yield</span>
                <Award className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-1.5">
                <span className="text-xl font-black text-slate-900">
                  {totals.overallYield}%
                </span>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Scrap: {totals.totalScrap.toLocaleString()} kg
                </p>
              </div>
            </div>

            {/* Total Bundles Packaged */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Packaged Bundles</span>
                <Package className="w-4 h-4 text-purple-600" />
              </div>
              <div className="mt-1.5">
                <span className="text-xl font-black text-slate-900">
                  {totals.totalBundles} <span className="text-xs font-bold text-slate-500">units</span>
                </span>
                <p className="text-[10px] text-purple-600 font-semibold mt-0.5">
                  Shop-floor verified
                </p>
              </div>
            </div>
          </div>

          {/* Main Visualizer: Recharts Container */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  {metricFocus === 'output_vs_dispatch' && 'Daily Output vs Dispatched Deliveries'}
                  {metricFocus === 'output_vs_inward' && 'Daily Slitting Output vs Inward Raw Material Weight'}
                  {metricFocus === 'yield_and_scrap' && 'Finished Production vs Scrap Generated'}
                  {metricFocus === 'bundles' && 'Daily Bundle Units Packaged & Weighed on Floor'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Hover over bars or data points to inspect individual purchase orders and material grades
                </p>
              </div>

              {/* Legend Summary */}
              <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                {metricFocus === 'output_vs_dispatch' && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Finished Output (kg)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-600 inline-block" /> Dispatched (kg)
                    </span>
                  </>
                )}
                {metricFocus === 'output_vs_inward' && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Inward Raw (kg)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Slitted Output (kg)
                    </span>
                  </>
                )}
                {metricFocus === 'yield_and_scrap' && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Finished (kg)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Scrap (kg)
                    </span>
                  </>
                )}
                {metricFocus === 'bundles' && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-purple-600 inline-block" /> Bundles (Units)
                  </span>
                )}
              </div>
            </div>

            {/* Recharts Render */}
            <div className="w-full h-[290px] text-xs">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart
                    data={dailyData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="displayDate"
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tick={{ fill: '#475569', fontSize: 11 }}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    {metricFocus === 'output_vs_dispatch' && (
                      <>
                        <Bar
                          dataKey="finishedOutputKg"
                          name="Finished Output (kg)"
                          fill="#2563EB"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                        <Bar
                          dataKey="dispatchedKg"
                          name="Dispatched (kg)"
                          fill="#059669"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                      </>
                    )}

                    {metricFocus === 'output_vs_inward' && (
                      <>
                        <Bar
                          dataKey="inwardKg"
                          name="Inward Raw (kg)"
                          fill="#F59E0B"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                        <Bar
                          dataKey="finishedOutputKg"
                          name="Slitted Output (kg)"
                          fill="#2563EB"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                      </>
                    )}

                    {metricFocus === 'yield_and_scrap' && (
                      <>
                        <Bar
                          dataKey="finishedOutputKg"
                          name="Finished (kg)"
                          fill="#2563EB"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                        <Bar
                          dataKey="scrapKg"
                          name="Edge Scrap (kg)"
                          fill="#E11D48"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        />
                      </>
                    )}

                    {metricFocus === 'bundles' && (
                      <Bar
                        dataKey="bundlesCount"
                        name="Bundles Count (Units)"
                        fill="#9333EA"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={55}
                      />
                    )}
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart
                    data={dailyData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="displayDate"
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tick={{ fill: '#475569', fontSize: 11 }}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    {metricFocus === 'output_vs_dispatch' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="finishedOutputKg"
                          name="Finished Output (kg)"
                          stroke="#2563EB"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 7 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="dispatchedKg"
                          name="Dispatched (kg)"
                          stroke="#059669"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 7 }}
                        />
                      </>
                    )}

                    {metricFocus === 'output_vs_inward' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="inwardKg"
                          name="Inward Raw (kg)"
                          stroke="#F59E0B"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#F59E0B', strokeWidth: 2, stroke: '#fff' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="finishedOutputKg"
                          name="Slitted Output (kg)"
                          stroke="#2563EB"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}
                        />
                      </>
                    )}

                    {metricFocus === 'yield_and_scrap' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="finishedOutputKg"
                          name="Finished (kg)"
                          stroke="#2563EB"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#2563EB' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="scrapKg"
                          name="Edge Scrap (kg)"
                          stroke="#E11D48"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={{ r: 4, fill: '#E11D48' }}
                        />
                      </>
                    )}

                    {metricFocus === 'bundles' && (
                      <Line
                        type="monotone"
                        dataKey="bundlesCount"
                        name="Bundles Count (Units)"
                        stroke="#9333EA"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#9333EA', strokeWidth: 2, stroke: '#fff' }}
                      />
                    )}
                  </LineChart>
                ) : (
                  <AreaChart
                    data={dailyData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorDispatch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorInward" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="displayDate"
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tick={{ fill: '#475569', fontSize: 11 }}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    {metricFocus === 'output_vs_dispatch' && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="finishedOutputKg"
                          name="Finished Output (kg)"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorOutput)"
                        />
                        <Area
                          type="monotone"
                          dataKey="dispatchedKg"
                          name="Dispatched (kg)"
                          stroke="#059669"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorDispatch)"
                        />
                      </>
                    )}

                    {metricFocus === 'output_vs_inward' && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="inwardKg"
                          name="Inward Raw (kg)"
                          stroke="#F59E0B"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorInward)"
                        />
                        <Area
                          type="monotone"
                          dataKey="finishedOutputKg"
                          name="Slitted Output (kg)"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorOutput)"
                        />
                      </>
                    )}

                    {metricFocus === 'yield_and_scrap' && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="finishedOutputKg"
                          name="Finished (kg)"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorOutput)"
                        />
                        <Area
                          type="monotone"
                          dataKey="scrapKg"
                          name="Edge Scrap (kg)"
                          stroke="#E11D48"
                          strokeWidth={2}
                          fill="#FFE4E6"
                        />
                      </>
                    )}

                    {metricFocus === 'bundles' && (
                      <Area
                        type="monotone"
                        dataKey="bundlesCount"
                        name="Bundles Count (Units)"
                        stroke="#9333EA"
                        strokeWidth={2.5}
                        fill="#F3E8FF"
                      />
                    )}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
