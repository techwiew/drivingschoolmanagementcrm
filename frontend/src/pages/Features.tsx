import { 
  Users, Calendar, CreditCard, FileText, ClipboardCheck, 
  BarChart3, Smartphone, Bell, LayoutDashboard 
} from 'lucide-react';

export default function Features() {
  const featureGroups = [
    {
      title: "School Administration",
      features: [
        {
          name: "Centralized Dashboard",
          desc: "Get a bird's eye view of your entire school operation, from student counts to revenue trends.",
          icon: <LayoutDashboard size={24} />
        },
        {
          name: "Student Management",
          desc: "Comprehensive profiles for every student, tracking their progress, documents, and payments.",
          icon: <Users size={24} />
        },
        {
          name: "Trainer Allocation",
          desc: "Easily manage instructor schedules and assign them to students based on availability.",
          icon: <ClipboardCheck size={24} />
        }
      ]
    },
    {
      title: "Learning & Scheduling",
      features: [
        {
          name: "Notifications",
          desc: "Notifications for upcoming lessons, payments, and mock tests.",
          icon: <Bell size={24} />
        },
        {
          name: "Theory Mock Tests",
          desc: "Customizable theory tests with real-time results to prepare students for official exams.",
          icon: <FileText size={24} />
        },
        {
          name: "Progress Tracking",
          desc: "Visual trackers for driving skills and syllabus completion for every student.",
          icon: <BarChart3 size={24} />
        }
      ]
    },
    {
      title: "Experience",
      features: [
        {
          name: "Mobile Friendly",
          desc: "Access the entire platform from any device, anytime, anywhere.",
          icon: <Smartphone size={24} />
        }
      ]
    }
  ];

  return (
    <div className="pt-20">
      {/* Header */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 skew-x-12 transform origin-bottom" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">Features Designed for Growth</h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Every tool you need to run a high-performing driving school, refined by 
            feedback from hundreds of school owners.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {featureGroups.map((group, groupIdx) => (
            <div key={groupIdx} className={groupIdx > 0 ? "mt-24" : ""}>
              <h2 className="text-3xl font-bold text-slate-900 mb-12 flex items-center gap-4">
                <span className="w-12 h-1 bg-emerald-500 rounded-full" />
                {group.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {group.features.map((feature, i) => (
                  <div key={i} className="group p-8 rounded-3xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.name}</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integration highlight */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-[3rem] p-12 lg:p-20 shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">Seamless Integration</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                All our features work together perfectly. When a student progresses through a syllabus, 
                their status is updated everywhere. When a trainer completes a lesson, attendance and 
                performance data are synced instantly.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900">99.9%</div>
                  <div className="text-sm text-slate-500">Uptime</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900">256-bit</div>
                  <div className="text-sm text-slate-500">Encryption</div>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
               {/* Decorative grid representing integration */}
               {[1,2,3,4].map(i => (
                 <div key={i} className="aspect-square bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-100">
                    <div className="w-12 h-12 rounded-full bg-emerald-200/50 animate-pulse" />
                 </div>
               ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
