import React, { useState } from "react";
import {
    motion,
} from "framer-motion";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from "recharts";
import {
    Highlighter,
    CheckSquare,
    Trash2,
    Plus,
    Activity,
    Users
} from "lucide-react";
import { cn } from "@/src/lib/utils";

// --- Style Injection for Handwriting Font ---
// We inject 'Architects Daughter' for that authentic marker feel
export function FontStyles() {
    return (
        <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap');
    
    .font-sketch {
      font-family: 'Architects Daughter', cursive;
    }
    
    .bg-paper {
      background-color: #fdfbf7;
      background-image: radial-gradient(#d1d5db 1px, transparent 1px);
      background-size: 20px 20px;
    }

    /* Custom Scrollbar */
    ::-webkit-scrollbar {
      width: 10px;
    }
    ::-webkit-scrollbar-track {
      background: #f1f1f1; 
    }
    ::-webkit-scrollbar-thumb {
      background: #888; 
      border-radius: 10px;
      border: 2px solid #f1f1f1;
    }
  `}</style>
    );
}

// --- Mock Data ---
export const timeRanges = ["Daily", "Monthly", "Yearly"];

export const dashboardData = {
    Daily: {
        performance: [
            { name: "00h", value: 40, task: 24 },
            { name: "04h", value: 30, task: 13 },
            { name: "08h", value: 55, task: 98 },
            { name: "12h", value: 45, task: 39 },
            { name: "16h", value: 65, task: 48 },
            { name: "20h", value: 40, task: 38 },
            { name: "24h", value: 50, task: 43 },
        ],
        pie: [
            { name: "Desktop", value: 400 },
            { name: "Mobile", value: 300 },
            { name: "Tablet", value: 100 },
        ],
        stats: [
            { label: "Uilora Daily Rev", val: "$4,200", color: "bg-green-100" },
            { label: "Uilora New Users", val: "+103", color: "bg-blue-100" },
            { label: "Pending Tasks", val: "14", color: "bg-red-100" },
        ]
    },
    Monthly: {
        performance: [
            { name: "W1", value: 400, task: 240 },
            { name: "W2", value: 300, task: 139 },
            { name: "W3", value: 550, task: 980 },
            { name: "W4", value: 450, task: 390 }
        ],
        pie: [
            { name: "Desktop", value: 4000 },
            { name: "Mobile", value: 3500 },
            { name: "Tablet", value: 800 },
        ],
        stats: [
            { label: "Uilora Mth Rev", val: "$45,200", color: "bg-green-100" },
            { label: "Uilora New Users", val: "+1,203", color: "bg-blue-100" },
            { label: "Pending Tasks", val: "42", color: "bg-red-100" },
        ]
    },
    Yearly: {
        performance: [
            { name: "Q1", value: 4000, task: 2400 },
            { name: "Q2", value: 3000, task: 1390 },
            { name: "Q3", value: 5500, task: 9800 },
            { name: "Q4", value: 4500, task: 3900 }
        ],
        pie: [
            { name: "Desktop", value: 40000 },
            { name: "Mobile", value: 45000 },
            { name: "Tablet", value: 12000 },
        ],
        stats: [
            { label: "Uilora Yrl Rev", val: "$545,200", color: "bg-green-100" },
            { label: "Uilora New Users", val: "+14,203", color: "bg-blue-100" },
            { label: "Pending Tasks", val: "112", color: "bg-red-100" },
        ]
    }
};

export const COLORS = ['#ef4444', '#3b82f6', '#fbbf24', '#10b981']; // Red, Blue, Yellow, Green (Marker colors)

// --- Sketch Components ---

export function SketchBox({ children, className, hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
    const wobble = "255px 15px 225px 15px / 15px 225px 15px 255px";

    return (
        <div
            className={cn(
                "relative bg-white border-2 border-zinc-800 transition-all duration-300",
                hover ? "hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]" : "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]",
                className
            )}
            style={{ borderRadius: wobble }}
        >
            {children}
        </div>
    );
}

export function SketchButton({ children, onClick, active, variant = 'primary', className }: { children: React.ReactNode; onClick: () => void; active?: boolean; variant?: string; className?: string }) {
    const wobble = "255px 15px 225px 15px / 15px 225px 15px 255px";

    const base = "px-4 py-2 font-sketch font-bold border-2 border-zinc-800 transition-all active:scale-95";
    const styles = {
        primary: active
            ? "bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
            : "bg-white hover:bg-yellow-100",
        danger: "bg-red-100 hover:bg-red-200 text-red-800",
        ghost: "border-transparent hover:bg-zinc-100 border-dashed"
    };

    return (
        <button
            onClick={onClick}
            className={cn(base, styles[variant as keyof typeof styles], className)}
            style={{ borderRadius: wobble }}
        >
            {children}
        </button>
    );
}

export function TimeToggle({ active, onChange }: { active: string; onChange: (val: string) => void }) {
    return (
        <div className="flex items-center gap-2">
            {timeRanges.map((range) => (
                <SketchButton
                    key={range}
                    active={active === range}
                    onClick={() => onChange(range)}
                    className="text-xs py-1 px-3"
                >
                    {range}
                </SketchButton>
            ))}
        </div>
    );
}

// --- Views ---

export function OverviewView({ timeRange }: { timeRange: string }) {
    const data = dashboardData[timeRange as keyof typeof dashboardData];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-20"
        >
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data.stats.map((stat, i) => (
                    <SketchBox key={i} className={cn("p-6", stat.color)} hover>
                        <h3 className="font-sketch text-zinc-500 text-lg">{stat.label}</h3>
                        <div className="flex items-end gap-2">
                            <span className="font-sketch text-4xl font-bold text-zinc-800">{stat.val}</span>
                            <span className="mb-2 font-sketch text-xs text-zinc-500 transform rotate-[-5deg]">
                                (approx.)
                            </span>
                        </div>
                    </SketchBox>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <SketchBox className="p-6 h-[400px] bg-white lg:col-span-2" hover={false}>
                    <h3 className="font-sketch text-2xl mb-4 flex items-center gap-2">
                        <Highlighter className="text-yellow-500" />
                        Uilora Growth Trajectory
                    </h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={data.performance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" tick={{ fontFamily: 'Architects Daughter' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontFamily: 'Architects Daughter' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
                                    border: '2px solid #000',
                                    fontFamily: 'Architects Daughter',
                                    boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.2)'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#000"
                                strokeWidth={3}
                                dot={{ r: 6, strokeWidth: 2, fill: '#fbbf24' }}
                                activeDot={{ r: 8, strokeWidth: 2, fill: '#facc15' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </SketchBox>

                <SketchBox className="p-6 h-[400px] bg-indigo-50" hover={false}>
                    <h3 className="font-sketch text-2xl mb-4">Uilora Pulse</h3>
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart data={data.performance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontFamily: 'Architects Daughter' }} hide />
                            <Tooltip contentStyle={{ fontFamily: 'Architects Daughter', border: '2px solid black' }} />
                            <Area type="step" dataKey="task" stroke="#6366f1" fill="#c7d2fe" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                    <p className="font-sketch text-center mt-2 text-indigo-700 font-bold decoration-wavy underline">Active Network Load</p>
                </SketchBox>
            </div>
        </motion.div>
    );
}

export function AnalyticsView({ timeRange }: { timeRange: string }) {
    const data = dashboardData[timeRange as keyof typeof dashboardData];
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 pb-20"
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SketchBox className="p-6 h-[350px]" hover={false}>
                    <h3 className="font-sketch text-xl mb-4">Uilora Service Distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.pie}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                stroke="#000"
                                strokeWidth={2}
                            >
                                {data.pie.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontFamily: 'Architects Daughter', border: '2px solid black', borderRadius: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </SketchBox>

                <SketchBox className="p-6 h-[350px]" hover={false}>
                    <h3 className="font-sketch text-xl mb-4">Uilora Tasks vs Load</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.performance}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontFamily: 'Architects Daughter' }} />
                            <Tooltip contentStyle={{ fontFamily: 'Architects Daughter', border: '2px solid black', borderRadius: '10px' }} />
                            <Bar dataKey="value" fill="#3b82f6" stackId="a" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="task" fill="#ef4444" stackId="a" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </SketchBox>
            </div>
        </motion.div>
    );
}

export function TeamView() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20"
        >
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="relative group">
                    {/* Tape Effect */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-8 bg-yellow-100/50 rotate-[-2deg] z-10 backdrop-blur-[1px] border-l border-r border-white/50 shadow-sm"></div>

                    <SketchBox className="p-4 flex flex-col items-center bg-white" hover>
                        <div className="w-24 h-24 rounded-full border-4 border-zinc-800 p-1 mb-4 border-dashed">
                            <img src={`https://i.pravatar.cc/150?u=${i}`} alt="Avatar" className="w-full h-full rounded-full grayscale hover:grayscale-0 transition-all duration-500 object-cover" />
                        </div>
                        <h3 className="font-sketch text-xl font-bold underline decoration-wavy decoration-emerald-400">Uilora Designer {i}</h3>
                        <p className="font-sketch text-zinc-500 mb-4">UI/UX Department</p>
                        <div className="flex gap-2">
                            <SketchButton onClick={() => { }} active={false} variant="ghost" className="text-xs">Message</SketchButton>
                            <SketchButton onClick={() => { }} active={false} variant="ghost" className="text-xs">Profile</SketchButton>
                        </div>
                    </SketchBox>
                </div>
            ))}
        </motion.div>
    );
}

export function TasksView() {
    const [tasks, setTasks] = useState([
        { id: 1, text: "Redesign Uilora Homepage", done: false },
        { id: 2, text: "Fix Uilora Navbar Bug", done: true },
        { id: 3, text: "Client Meeting @ 2PM", done: false },
        { id: 4, text: "Buy more markers", done: false },
        { id: 5, text: "Sketch the new API flow", done: false },
    ]);

    const toggle = (id: number) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    const add = () => {
        const newId = Math.max(...tasks.map(t => t.id)) + 1;
        setTasks([...tasks, { id: newId, text: "New Idea...", done: false }]);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto pb-20">
            <SketchBox className="p-8 bg-yellow-50 relative min-h-[500px]" hover={false}>
                {/* Notebook Holes */}
                <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-evenly">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="w-4 h-4 rounded-full bg-zinc-800/10 shadow-inner" />)}
                </div>

                <div className="pl-12">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-sketch text-3xl font-bold underline decoration-wavy decoration-blue-400">Uilora To-Do List</h2>
                        <SketchButton onClick={add} active={false} variant="primary" className="rounded-full w-10 h-10 flex items-center justify-center p-0">
                            <Plus className="w-6 h-6" />
                        </SketchButton>
                    </div>

                    <div className="space-y-4">
                        {tasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => toggle(task.id)}
                                className="flex items-center gap-4 cursor-pointer group"
                            >
                                <div className={cn(
                                    "w-6 h-6 border-2 border-zinc-800 rounded transition-colors flex items-center justify-center",
                                    task.done ? "bg-green-400" : "bg-white"
                                )}>
                                    {task.done && <CheckSquare className="w-4 h-4 text-zinc-900" />}
                                </div>
                                <span className={cn(
                                    "font-sketch text-xl transition-all",
                                    task.done ? "line-through text-zinc-400" : "text-zinc-800"
                                )}>
                                    {task.text}
                                </span>
                                <Trash2
                                    onClick={(e) => { e.stopPropagation(); setTasks(tasks.filter(t => t.id !== task.id)) }}
                                    className="w-4 h-4 text-red-400 ml-auto opacity-0 group-hover:opacity-100 hover:scale-110 transition-all hover:text-red-600"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </SketchBox>
        </motion.div>
    );
}

export function SettingsView() {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            <SketchBox className="p-8 bg-white" hover={false}>
               <h3 className="font-sketch font-bold text-2xl mb-6 flex items-center gap-2"><Activity className="w-6 h-6"/> Uilora Global Settings</h3>
               <div className="space-y-6">
                   <div className="flex items-center justify-between border-b-2 border-dashed border-zinc-200 pb-4">
                       <span className="font-sketch text-lg">Enable Dark Ink</span>
                       <input type="checkbox" className="w-5 h-5 accent-zinc-800" />
                   </div>
                   <div className="flex items-center justify-between border-b-2 border-dashed border-zinc-200 pb-4">
                       <span className="font-sketch text-lg">Push Notifications</span>
                       <input type="checkbox" className="w-5 h-5 accent-zinc-800" defaultChecked />
                   </div>
                   <div className="flex items-center justify-between border-b-2 border-dashed border-zinc-200 pb-4">
                       <span className="font-sketch text-lg">Autosave Canvas</span>
                       <input type="checkbox" className="w-5 h-5 accent-zinc-800" defaultChecked />
                   </div>
               </div>
            </SketchBox>
        </motion.div>
    );
}