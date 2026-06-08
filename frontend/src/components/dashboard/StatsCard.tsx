interface StatsCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  color?: "purple" | "blue" | "green" | "orange";
}

const colors = {
  purple: "from-brand-600/20 to-brand-800/10 border-brand-600/30",
  blue: "from-blue-600/20 to-blue-800/10 border-blue-600/30",
  green: "from-green-600/20 to-green-800/10 border-green-600/30",
  orange: "from-orange-600/20 to-orange-800/10 border-orange-600/30",
};

export default function StatsCard({ label, value, sub, icon, color = "purple" }: StatsCardProps) {
  return (
    <div className={`card bg-gradient-to-br ${colors[color]} border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
    </div>
  );
}
