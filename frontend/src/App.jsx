import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft, 
  Zap, 
  Award,
  Download,
  Copy,
  RefreshCw,
  AlertCircle,
  BarChart2,
  Timer,
  Target,
  Hourglass
} from 'lucide-react';

/**
 * Gemini Run Coach
 * A React application that generates personalized running plans using Google's Gemini API.
 */

// --- API CONFIGURATION ---
// The execution environment is expected to provide the key.
const apiKey = ""; 

const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

// --- COMPONENTS ---

const ProgressBar = ({ current, total }) => {
  const progress = ((current + 1) / total) * 100;
  return (
    <div className="w-full bg-slate-200 h-2 rounded-full mb-8 overflow-hidden">
      <div 
        className="bg-blue-600 h-full transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

const SelectionCard = ({ title, description, icon: Icon, selected, onClick, compact = false }) => (
  <button
    onClick={onClick}
    className={`w-full text-left rounded-xl border-2 transition-all duration-200 flex items-center gap-4 group
      ${compact ? 'p-4' : 'p-6'}
      ${selected 
        ? 'border-blue-600 bg-blue-50' 
        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
      }`}
  >
    <div className={`rounded-lg ${compact ? 'p-2' : 'p-3'} ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
      <Icon size={compact ? 20 : 24} />
    </div>
    <div>
      <h3 className={`font-bold ${compact ? 'text-base' : 'text-lg'} ${selected ? 'text-blue-900' : 'text-slate-800'}`}>{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
    <div className="ml-auto">
      {selected && <CheckCircle className="text-blue-600" size={compact ? 20 : 24} />}
    </div>
  </button>
);

const InputField = ({ label, value, onChange, placeholder, type = "text", suffix }) => (
  <div className="mb-4">
    <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
    <div className="relative">
      <input 
        type={type}
        className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
          {suffix}
        </div>
      )}
    </div>
  </div>
);

// --- MAIN APP ---

export default function App() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [userKey, setUserKey] = useState("");
  
  // Revised Form Data for specific constraints
  const [formData, setFormData] = useState({
    distance: null,      // '5k', '10k', 'half', 'marathon'
    daysPerWeek: null,   // 3, 4, 5, 6
    planDuration: null,  // NEW: Number of weeks (integer)
    currentDistance: '', // e.g. "20"
    metricType: 'km',    // 'km' or 'miles'
    recentRaceTime: '',  // e.g. "25:00"
    recentRaceDist: '5k',// '5k', '10k'
    goalTime: '',        // Target goal time
    vo2Max: '',          // e.g. "45" (Optional but impactful)
    useBackend: false,   // Toggle for python server
  });

  const steps = [
    {
      id: 'goal',
      title: "Target Race",
      subtitle: "What is the main event you are training for?",
      required: ['distance']
    },
    {
      id: 'schedule',
      title: "Timeline & Availability",
      subtitle: "Set your schedule constraints.",
      required: ['daysPerWeek', 'planDuration'] // Added planDuration
    },
    {
      id: 'benchmarks',
      title: "Performance & Goals",
      subtitle: "Your current baselines and future targets.",
      required: ['recentRaceTime', 'currentDistance', 'goalTime']
    },
    {
      id: 'confirm',
      title: "Review & Generate",
      subtitle: "Ready to build your program?",
      required: []
    }
  ];

  const handleSelect = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getEffectiveApiKey = () => userKey || apiKey;

  // Validation Logic
  const canProceed = () => {
    const currentRequired = steps[step].required;
    const isValid = currentRequired.every(field => formData[field] !== null && formData[field] !== '');
    return isValid;
  };

  const handleNext = () => {
    if (canProceed()) {
      if (step < steps.length - 1) {
        setStep(step + 1);
      } else {
        generatePlan();
      }
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const generatePlan = async () => {
    setLoading(true);
    setError(null);

    // Enhanced Prompt with PLAN DURATION
    const prompt = `
      Act as an elite running coach (like Jack Daniels or Runna). 
      Create a detailed training plan for a runner targeting a ${formData.distance}.
      
      CRITICAL RUNNER METRICS:
      - Goal Race: ${formData.distance}
      - TARGET GOAL TIME: ${formData.goalTime}
      - Plan Duration: ${formData.planDuration} WEEKS (Exact length)
      - Training Volume: ${formData.daysPerWeek} days/week
      - Current Weekly Volume: ${formData.currentDistance} ${formData.metricType}
      - Recent Benchmark: ${formData.recentRaceTime} for ${formData.recentRaceDist}
      ${formData.vo2Max ? `- VO2 Max: ${formData.vo2Max}` : ''}

      INSTRUCTIONS:
      1. Calculate training paces (Easy, Tempo, Interval) based on the provided recent race time and TARGET GOAL TIME.
      2. Structure exactly a ${formData.planDuration} week plan.
      3. OUTPUT JSON ONLY. No markdown. Structure:
      {
        "programName": "String",
        "description": "String (include calculated paces here)",
        "weeks": [
          {
            "weekNumber": 1,
            "focus": "String",
            "days": [
              { "day": "Monday", "type": "Rest/Run", "details": "String (specific distance & pace)" }
              ... (Must match ${formData.daysPerWeek} running days)
            ]
          }
        ]
      }
    `;

    try {
      if (formData.useBackend) {
        // --- PATH A: PYTHON BACKEND ---
        const response = await fetch('http://127.0.0.1:5000/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
           const errorData = await response.json().catch(() => ({}));
           throw new Error(errorData.error || `Backend Error: ${response.status}`);
        }
        
        const plan = await response.json();
        setGeneratedPlan(plan);

      } else {
        // --- PATH B: DIRECT API ---
        const key = getEffectiveApiKey();
        const finalUrl = `${API_URL}?key=${key}`;

        const fetchWithRetry = async (retries = 3, delay = 1000) => {
          try {
            const response = await fetch(finalUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
              })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return response;
          } catch (err) {
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, delay));
              return fetchWithRetry(retries - 1, delay * 2);
            }
            throw err;
          }
        };

        const response = await fetchWithRetry();
        const data = await response.json();
        
        if (data.candidates?.[0]?.content) {
          const text = data.candidates[0].content.parts[0].text;
          const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
          setGeneratedPlan(JSON.parse(jsonStr));
        } else {
          throw new Error("No output from AI");
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate plan.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER STEPS ---

  const renderContent = () => {
    switch (steps[step].id) {
      case 'goal':
        return (
          <div className="grid gap-4">
            {[
              { id: '5k', title: '5K', icon: Zap, desc: 'Speed & Power' },
              { id: '10k', title: '10K', icon: Activity, desc: 'Endurance Speed' },
              { id: 'half', title: 'Half Marathon', icon: TrendingUp, desc: '21.1 km Challenge' },
              { id: 'marathon', title: 'Marathon', icon: Award, desc: '42.2 km Endurance' },
            ].map(opt => (
              <SelectionCard
                key={opt.id}
                title={opt.title}
                description={opt.desc}
                icon={opt.icon}
                selected={formData.distance === opt.id}
                onClick={() => handleSelect('distance', opt.id)}
              />
            ))}
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Days Per Week Section */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-blue-500"/> Weekly Frequency
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[3, 4, 5, 6].map(num => (
                  <SelectionCard
                    key={num}
                    compact
                    title={`${num} Days`}
                    icon={RefreshCw}
                    selected={formData.daysPerWeek === num}
                    onClick={() => handleSelect('daysPerWeek', num)}
                  />
                ))}
              </div>
            </div>

            {/* Plan Duration Section */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Hourglass size={18} className="text-blue-500"/> Training Block Length
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[8, 12, 16].map(weeks => (
                  <button
                    key={weeks}
                    onClick={() => handleSelect('planDuration', weeks)}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all
                      ${formData.planDuration === weeks 
                        ? 'border-blue-600 bg-blue-50 text-blue-700' 
                        : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}
                  >
                    {weeks} Weeks
                  </button>
                ))}
              </div>
              <div className="relative">
                 <input 
                    type="number"
                    placeholder="Or enter custom weeks (e.g. 10)"
                    className={`w-full p-3 pl-10 border-2 rounded-xl outline-none transition font-medium
                      ${formData.planDuration && ![8,12,16].includes(formData.planDuration) 
                        ? 'border-blue-600 bg-blue-50 text-blue-900' 
                        : 'border-slate-200 focus:border-blue-400'}`}
                    value={formData.planDuration || ''}
                    onChange={(e) => handleSelect('planDuration', parseInt(e.target.value) || '')}
                 />
                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Calendar size={18} />
                 </div>
              </div>
            </div>
          </div>
        );

      case 'benchmarks':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex gap-3">
              <div className="text-blue-600 mt-1"><AlertCircle size={20} /></div>
              <div className="text-sm text-blue-800">
                We use these numbers to calculate your specific training zones (Easy, Threshold, Interval). Be as accurate as possible.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2 md:col-span-1">
                 <label className="block text-sm font-bold text-slate-700 mb-2">Recent Race Distance</label>
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                    {['5k', '10k', 'half'].map(d => (
                      <button 
                        key={d}
                        onClick={() => handleSelect('recentRaceDist', d)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${formData.recentRaceDist === d ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {d.toUpperCase()}
                      </button>
                    ))}
                 </div>
               </div>
               <div className="col-span-2 md:col-span-1">
                 <InputField 
                    label="Recent Race Time" 
                    placeholder="e.g. 24:30" 
                    value={formData.recentRaceTime}
                    onChange={(val) => handleSelect('recentRaceTime', val)}
                    suffix={<Timer size={16} />}
                 />
               </div>
            </div>

            <div className="p-4 border border-blue-100 rounded-xl bg-blue-50/50 mb-4">
              <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Target size={16} /> Target Goal
              </h4>
              <InputField 
                label={`Goal Time for ${formData.distance ? formData.distance.toUpperCase() : 'Race'}`}
                placeholder="e.g. 1:45:00 or 'Finish'" 
                value={formData.goalTime}
                onChange={(val) => handleSelect('goalTime', val)}
                suffix={<Award size={16} />}
              />
            </div>

            <InputField 
              label="Current Weekly Volume" 
              placeholder="e.g. 25" 
              type="number"
              value={formData.currentDistance}
              onChange={(val) => handleSelect('currentDistance', val)}
              suffix={
                <button 
                  onClick={() => handleSelect('metricType', formData.metricType === 'km' ? 'miles' : 'km')}
                  className="text-xs font-bold uppercase hover:text-blue-600"
                >
                  {formData.metricType}
                </button>
              }
            />

            <div className="pt-4 border-t border-slate-100">
               <InputField 
                label="VO2 Max (Optional)" 
                placeholder="e.g. 52" 
                type="number"
                value={formData.vo2Max}
                onChange={(val) => handleSelect('vo2Max', val)}
                suffix={<BarChart2 size={16} />}
              />
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
               <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Program Summary</h3>
               <dl className="space-y-3 text-sm">
                 <div className="flex justify-between">
                   <dt className="text-slate-500">Goal Race</dt>
                   <dd className="font-semibold text-slate-900 capitalize">{formData.distance}</dd>
                 </div>
                 <div className="flex justify-between">
                   <dt className="text-slate-500">Duration</dt>
                   <dd className="font-semibold text-slate-900">{formData.planDuration} Weeks</dd>
                 </div>
                 <div className="flex justify-between">
                   <dt className="text-slate-500">Schedule</dt>
                   <dd className="font-semibold text-slate-900">{formData.daysPerWeek} Days/Week</dd>
                 </div>
                 <div className="flex justify-between">
                   <dt className="text-slate-500">Target Time</dt>
                   <dd className="font-semibold text-blue-600">{formData.goalTime}</dd>
                 </div>
               </dl>
            </div>

            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
              <div className="relative flex items-center mt-1">
                <input 
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  checked={formData.useBackend}
                  onChange={(e) => handleSelect('useBackend', e.target.checked)}
                />
              </div>
              <div>
                <span className="font-bold text-slate-700 block">Use Python Backend</span>
                <span className="text-xs text-slate-500 block mt-1">
                  Connects to local <b>server.py</b>. Ensure it is running.
                </span>
              </div>
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  // --- RESULTS VIEW ---

  if (generatedPlan) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-slate-100 bg-white sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <Zap className="fill-current" /> RunCoach AI
          </div>
          <button 
             onClick={() => setGeneratedPlan(null)}
             className="text-sm font-semibold text-slate-500 hover:text-blue-600"
          >
            New Plan
          </button>
        </nav>
        <div className="max-w-3xl mx-auto p-6 animate-fade-in">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3 bg-green-100 text-green-600 rounded-full mb-4">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{generatedPlan.programName}</h2>
            <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">{generatedPlan.description}</p>
          </div>

          <div className="space-y-6">
            {generatedPlan.weeks.map((week) => (
              <div key={week.weekNumber} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Week {week.weekNumber}</h3>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    {week.focus}
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {week.days.map((day, idx) => (
                    <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-24 flex-shrink-0 font-medium text-slate-400 text-sm mt-1 uppercase tracking-wide">
                        {day.day.slice(0, 3)}
                      </div>
                      <div>
                        <div className={`font-bold mb-1 ${day.type.toLowerCase().includes('rest') ? 'text-slate-400' : 'text-slate-800'}`}>
                          {day.type}
                        </div>
                        <div className="text-slate-600 text-sm">{day.details}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
           <div className="mt-8 flex gap-4 justify-center">
            <button 
              onClick={() => {
                const text = JSON.stringify(generatedPlan, null, 2);
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'training-plan.json';
                a.click();
              }}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
            >
              <Download size={20} /> Download JSON
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- FORM VIEW ---

  if (loading) {
     return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Building Your Season...</h2>
        <p className="text-slate-500 text-center max-w-md animate-pulse">
          Coach Gemini is structuring your {formData.planDuration} week plan to peak for your {formData.distance}.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-white p-6 border-b border-slate-100 flex items-center justify-between">
           <div>
             <h1 className="text-xl font-bold text-slate-900">{steps[step].title}</h1>
             <p className="text-sm text-slate-500 mt-1">{steps[step].subtitle}</p>
           </div>
           <div className="text-slate-300 font-bold text-4xl opacity-20">
             0{step + 1}
           </div>
        </div>

        {/* Progress */}
        <div className="px-6 pt-6">
          <ProgressBar current={step} total={steps.length} />
        </div>

        {/* Content */}
        <div className="p-6 pt-0 min-h-[300px]">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className={`flex items-center gap-1 font-semibold transition
              ${step === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ChevronLeft size={20} /> Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-200
              ${!canProceed() 
                ? 'bg-slate-300 text-white cursor-not-allowed shadow-none' 
                : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:-translate-y-0.5'}`}
          >
            {step === steps.length - 1 ? 'Generate Plan' : 'Next'}
            {step < steps.length - 1 && <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}