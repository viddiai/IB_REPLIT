import StatusBadge from '../StatusBadge';

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-3 p-6">
      <StatusBadge status="NY_INTRESSEANMALAN" />
      <StatusBadge status="KUND_KONTAKTAD" />
      <StatusBadge status="VUNNEN" />
      <StatusBadge status="FORLORAD" />
    </div>
  );
}
