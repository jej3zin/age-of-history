interface Props { label: string; value: string; detail?: string; accent?: string; }
export default function StatCard({ label, value, detail, accent }: Props) {
  return <div className="stat-card"><div className="stat-label">{label}</div><div className="stat-value" style={accent ? {color:accent} : undefined}>{value}</div>{detail && <div className="stat-detail">{detail}</div>}</div>;
}
